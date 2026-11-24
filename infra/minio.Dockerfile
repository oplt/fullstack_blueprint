# syntax=docker/dockerfile:1
FROM golang:1.25-bookworm AS build
ADD --checksum=sha256:be6d0bd3696c3a13a35f02d3a0280b64319c67918b4501c5c3d87f96d000085c https://codeload.github.com/minio/minio/tar.gz/refs/tags/RELEASE.2025-10-15T17-29-55Z /tmp/minio.tar.gz
WORKDIR /src
RUN tar -xzf /tmp/minio.tar.gz --strip-components=1 && mkdir -p /out && CGO_ENABLED=0 go build -trimpath -o /out/minio .

FROM debian:bookworm-slim
RUN mkdir -p /data && chown 65532:65532 /data
COPY --from=build /out/minio /usr/local/bin/minio
COPY --from=build /src/LICENSE /usr/share/doc/minio/LICENSE
USER 65532:65532
EXPOSE 9000 9001
ENTRYPOINT ["minio"]
