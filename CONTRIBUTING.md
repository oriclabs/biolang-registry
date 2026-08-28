# Contributing entries

Registry review checks identity ownership, manifest integrity, compatibility claims, licence/provenance metadata, and whether validation lives beside the content. Inclusion is not a scientific endorsement.

Entry IDs use `publisher/name`. Versions use semantic versioning. A publisher may have multiple entries, but an `id + version` pair is unique. URLs must use HTTPS. A verified entry must use an immutable content URL and a matching SHA-256.

Kinds are:

- `lesson`: a Studio-compatible notebook lesson manifest;
- `package`: a BioLang importable package manifest;
- `workflow`: a reproducible workflow manifest;
- `tool`: an optional external executable/plugin manifest.
- `dataset`: a discoverable, versioned dataset manifest whose files remain at their source;
- `provider`: declarative metadata for a reviewed client-side data adapter.

Preview entries are visible only when a client opts into preview content.

All entries require one or more lowercase category slugs. Dataset discovery metadata must agree with the checksummed dataset manifest, including provider, file count, formats, and total bytes. A referenced provider must have a registry entry. Provider manifests cannot supply executable code: `resolution.adapter` names an implementation already compiled into BioLang or Studio, and `registryCodeAllowed` must remain `false`.
