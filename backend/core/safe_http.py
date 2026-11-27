"""HTTPS POST requests pinned to validated public IP addresses.

Callers must supply trusted request headers. Redirects, proxies, automatic
retries and connection reuse are intentionally disabled. Network-level egress
restrictions are still required as defense in depth.
"""

from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from weakref import WeakValueDictionary

import httpx

DNS_TIMEOUT = 3.0
CONNECT_TIMEOUT = 3.0
HTTP_TIMEOUT = 5.0
TOTAL_TIMEOUT = 15.0
MAX_CONCURRENCY = 20
MAX_DNS_NAME_LENGTH = 253
MAX_URL_WHITESPACE_CODEPOINT = 32
DELETE_CODEPOINT = 127
IPV6_SOCKADDR_LENGTH = 4

BLOCKED_IPV6_NETWORKS = (
    ipaddress.ip_network("64:ff9b::/96"),
    ipaddress.ip_network("64:ff9b:1::/48"),
    ipaddress.ip_network("2002::/16"),
    ipaddress.ip_network("2001::/32"),
)
# Azure's platform virtual IP is globally numbered but can expose local services.
BLOCKED_IPV4_ADDRESSES = frozenset({ipaddress.IPv4Address("168.63.129.16")})
DNS_LABEL = re.compile(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", re.ASCII)

# A semaphore cannot safely be shared by different asyncio event loops.
# Weak values avoid retaining closed loops after their active requests finish.
_OUTBOUND_LIMITS: WeakValueDictionary[asyncio.AbstractEventLoop, asyncio.Semaphore] = (
    WeakValueDictionary()
)


class UnsafeTargetError(ValueError):
    """The destination violates the outbound HTTP security policy."""


class OutboundResolutionError(RuntimeError):
    """The destination could not be resolved; may be a transient failure."""


class PinnedHttpsTransport(httpx.AsyncBaseTransport):
    """Validate and pin every HTTPX request, including MCP stream requests."""

    def __init__(self, *, allowed_hosts: set[str]):
        self.allowed_hosts = allowed_hosts
        self.transport = httpx.AsyncHTTPTransport(
            verify=True,
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=0),
        )

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        url = validate_url(
            str(request.url), allowed_hosts=self.allowed_hosts, require_allowlist=True
        )
        hostname = url.raw_host.decode("ascii")
        addresses = await resolve_public_ips(hostname, url.port or 443)
        headers = httpx.Headers(request.headers)
        headers["Host"] = url.netloc.decode("ascii")
        pinned_request = httpx.Request(
            request.method,
            url.copy_with(host=addresses[0]),
            headers=headers,
            stream=request.stream,
            extensions={**request.extensions, "sni_hostname": hostname},
        )
        return await self.transport.handle_async_request(pinned_request)

    async def aclose(self) -> None:
        await self.transport.aclose()


def _outbound_limit() -> asyncio.Semaphore:
    loop = asyncio.get_running_loop()
    limit = _OUTBOUND_LIMITS.get(loop)
    if limit is None:
        limit = asyncio.Semaphore(MAX_CONCURRENCY)
        _OUTBOUND_LIMITS[loop] = limit
    return limit


def _validate_ipv6(ip: ipaddress.IPv6Address) -> None:
    if ip.scope_id is not None or ip.is_site_local:
        raise UnsafeTargetError("Prohibited IPv6 destination")
    if any(ip in network for network in BLOCKED_IPV6_NETWORKS):
        raise UnsafeTargetError("Prohibited IPv6 transition address")


def validate_public_ip(value: str) -> str:
    """Reject unsafe addresses and normalize IPv4-mapped IPv6 to IPv4."""
    try:
        ip = ipaddress.ip_address(value)
    except ValueError as exc:
        raise UnsafeTargetError("Invalid destination IP") from exc

    if isinstance(ip, ipaddress.IPv6Address):
        _validate_ipv6(ip)
        if ip.ipv4_mapped is not None:
            return validate_public_ip(str(ip.ipv4_mapped))

    if (
        not ip.is_global
        or ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
        or ip in BLOCKED_IPV4_ADDRESSES
    ):
        raise UnsafeTargetError("Prohibited destination IP")
    return str(ip)


def _normalize_host(value: str) -> str:
    """Normalize ASCII DNS names and IP literals for exact matching."""
    host = value.lower().removesuffix(".")
    if "%" in host:
        raise UnsafeTargetError("Scoped or encoded hostname is prohibited")
    try:
        return str(ipaddress.ip_address(host))
    except ValueError:
        pass

    if (
        len(host) > MAX_DNS_NAME_LENGTH
        or "." not in host
        or not all(DNS_LABEL.fullmatch(label) for label in host.split("."))
    ):
        raise UnsafeTargetError("Valid fully qualified hostname required")
    if host.endswith((".localhost", ".internal", ".local", ".home.arpa")):
        raise UnsafeTargetError("Prohibited hostname")
    return host


def _parse_https_url(target_url: str) -> httpx.URL:
    # Reject raw syntax that HTTPX may normalize away, including empty userinfo
    # and fragments. HTTPX remains the parser for the actual destination.
    if any(
        ord(char) <= MAX_URL_WHITESPACE_CODEPOINT or ord(char) == DELETE_CODEPOINT
        for char in target_url
    ):
        raise UnsafeTargetError("Invalid URL characters")
    scheme, separator, remainder = target_url.partition("://")
    authority = remainder.split("/", 1)[0].split("?", 1)[0]
    if not separator or scheme.lower() != "https" or not authority:
        raise UnsafeTargetError("HTTPS destination required")
    if "@" in authority or "#" in target_url or "\\" in target_url or authority.endswith(":"):
        raise UnsafeTargetError("Invalid destination URL")

    try:
        url = httpx.URL(target_url)
    except (httpx.InvalidURL, ValueError) as exc:
        raise UnsafeTargetError("Invalid destination URL") from exc

    if url.scheme != "https" or not url.host or url.userinfo or url.fragment:
        raise UnsafeTargetError("Invalid HTTPS destination")
    if url.port not in (None, 443):
        raise UnsafeTargetError("Prohibited destination port")
    return url


def validate_url(
    target_url: str,
    *,
    allowed_hosts: set[str],
    require_allowlist: bool,
) -> httpx.URL:
    """Return the canonical URL; allowlist entries are exact ASCII hostnames/IPs."""
    url = _parse_https_url(target_url)
    host = _normalize_host(url.raw_host.decode("ascii"))
    normalized_hosts = {
        _normalize_host(value.strip().removeprefix("[").removesuffix("]"))
        for value in allowed_hosts
        if value.strip()
    }
    if (require_allowlist or normalized_hosts) and host not in normalized_hosts:
        raise UnsafeTargetError("Hostname not allowed")
    return url.copy_with(host=host)


def _validate_dns_result(address: tuple) -> str:
    # IPv6 sockaddr includes a separate scope identifier.
    if len(address) == IPV6_SOCKADDR_LENGTH and address[3]:
        raise UnsafeTargetError("Scoped IPv6 destination is prohibited")
    return validate_public_ip(str(address[0]))


async def resolve_public_ips(host: str, port: int = 443) -> tuple[str, ...]:
    """Resolve once, rejecting the entire DNS answer if any address is unsafe."""
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        return (validate_public_ip(str(ip)),)

    try:
        async with asyncio.timeout(DNS_TIMEOUT):
            # An absolute DNS name avoids resolver search-domain expansion.
            results = await asyncio.get_running_loop().getaddrinfo(
                host.removesuffix(".") + ".",
                port,
                family=socket.AF_UNSPEC,
                type=socket.SOCK_STREAM,
                proto=socket.IPPROTO_TCP,
            )
    except (OSError, TimeoutError) as exc:
        raise OutboundResolutionError("DNS resolution failed") from exc

    if not results:
        raise OutboundResolutionError("No DNS addresses found")
    return tuple(dict.fromkeys(_validate_dns_result(result[4]) for result in results))


async def validate_target(
    target_url: str,
    *,
    allowed_hosts: set[str],
    require_allowlist: bool,
) -> None:
    """Validate a configuration without making an HTTP request.

    Actual deliveries must call safe_post again; DNS answers can change.
    """
    async with asyncio.timeout(TOTAL_TIMEOUT), _outbound_limit():
        url = validate_url(
            target_url, allowed_hosts=allowed_hosts, require_allowlist=require_allowlist
        )
        await resolve_public_ips(url.raw_host.decode("ascii"), url.port or 443)


async def safe_post(
    target_url: str,
    *,
    content: bytes,
    headers: dict[str, str],
    allowed_hosts: set[str],
    require_allowlist: bool = True,
) -> int:
    """Send one HTTPS POST to a vetted numeric IP, returning only its status.

    The original hostname is preserved for HTTP routing and TLS certificate
    verification via HTTPX/HTTPCore's sni_hostname extension. A fresh client
    prevents cross-host reuse of TLS connections. No response body is consumed.
    """
    async with asyncio.timeout(TOTAL_TIMEOUT), _outbound_limit():
        url = validate_url(
            target_url, allowed_hosts=allowed_hosts, require_allowlist=require_allowlist
        )
        hostname = url.raw_host.decode("ascii")
        addresses = await resolve_public_ips(hostname, url.port or 443)
        pinned_url = url.copy_with(host=addresses[0])

        request_headers = httpx.Headers(headers)
        request_headers["Host"] = url.netloc.decode("ascii")

        async with (
            httpx.AsyncClient(
                verify=True,
                follow_redirects=False,
                trust_env=False,
                http2=False,
                timeout=httpx.Timeout(HTTP_TIMEOUT, connect=CONNECT_TIMEOUT),
                limits=httpx.Limits(max_connections=1, max_keepalive_connections=0),
            ) as client,
            client.stream(
                "POST",
                pinned_url,
                content=content,
                headers=request_headers,
                extensions={"sni_hostname": hostname},
            ) as response,
        ):
            return response.status_code
