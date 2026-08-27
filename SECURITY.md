# Registry security

Report a malicious or compromised entry privately to the OriClabs maintainers. Include the entry ID, version, manifest URL, observed checksum, and evidence.

The registry is an index, not a sandbox. Clients must verify manifest checksums, ask before installation or data download, distinguish verified/preview/custom sources, and never execute content merely because it appears in search results.

Signing and transparency-log support are planned. Until then, immutable HTTPS URLs, SHA-256, repository review, and reproducible validation are the trust baseline.
