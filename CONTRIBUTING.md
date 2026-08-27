# Contributing entries

Registry review checks identity ownership, manifest integrity, compatibility claims, licence/provenance metadata, and whether validation lives beside the content. Inclusion is not a scientific endorsement.

Entry IDs use `publisher/name`. Versions use semantic versioning. A publisher may have multiple entries, but an `id + version` pair is unique. URLs must use HTTPS. A verified entry must use an immutable content URL and a matching SHA-256.

Kinds are:

- `lesson`: a Studio-compatible notebook lesson manifest;
- `package`: a BioLang importable package manifest;
- `workflow`: a reproducible workflow manifest;
- `tool`: an optional external executable/plugin manifest.

Preview entries are visible only when a client opts into preview content.
