# Third-party license review policy

This file records reviewed, narrow license exceptions for the release license gate.
The gate runs Trivy's license scanner with `--severity UNKNOWN,HIGH,CRITICAL` and
`--ignored-licenses OFL-1.1,MIT-0,PSF-2.0`.

## Review rules

- An exception is only added for a specific SPDX expression after confirming the
  locked package metadata and the bundled license file.
- Compound expressions are reviewed in full; every part must be on the allowlist.
- The allowlist is license-scoped (a Trivy CLI limitation). Before adding an
  identifier, review every occurrence in the current lockfiles.

## Approved exceptions

| SPDX expression | Package (locked) | Evidence | Rationale |
| --- | --- | --- | --- |
| OFL-1.1 | @fontsource/ibm-plex-mono | `frontend/public/licenses/ibm-plex-mono.txt` (cmp-checked in `_security-check`) | Bundled font distributed under SIL OFL 1.1. |
| MIT-0 | cffi 2.1.1 | wheel `License-Expression: MIT-0` | Permissive MIT No Attribution. |
| MIT AND PSF-2.0 | greenlet 3.5.6 | wheel `License-Expression: MIT AND PSF-2.0` (`LICENSE`, `LICENSE.PSF`) | MIT plus Python Software Foundation License 2.0. |
| PSF-2.0 | typing-extensions 4.16.0 | wheel `License-Expression: PSF-2.0` | Python Software Foundation License 2.0. |
