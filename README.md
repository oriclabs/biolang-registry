# BioLang Registry

The BioLang Registry is the shared discovery index for installable BioLang lessons, packages, workflows, and tools. It stores metadata and checksummed manifest links only. Source code, notebooks, validation tests, and datasets remain in their owning repositories.

```text
entries/                  reviewed source entries
registry/v1/index.json    deterministic generated index consumed by clients
schemas/                  JSON schemas for publishers and clients
scripts/                  index and integrity checks
```

## Client endpoint

After publication, clients use:

```text
https://raw.githubusercontent.com/oriclabs/biolang-registry/main/registry/v1/index.json
```

Studio may also accept custom registry URLs and direct manifests. Discovering an entry never installs it, and installing a lesson never downloads its datasets until the user explicitly prepares them.

## Add an entry

1. Publish an immutable, HTTPS manifest in the content-owning repository.
2. Add one JSON file under `entries/<kind>/`.
3. Use the manifest's exact SHA-256.
4. Run `npm test` and, when sibling repositories are present, `npm run test:local`.
5. Regenerate with `npm run build`.

Verified entries must point to an immutable tag or commit, not `main`, `master`, or `latest`. Preview entries may use a moving branch while content is being prepared, but clients must label them accordingly.

## What belongs here

- identity, kind, version, publisher, summary and tags;
- manifest URL and checksum;
- BioLang/Studio compatibility and supported runtimes;
- trust status and publication date.

Do not add notebooks, package source, binary tools, or datasets to this repository.
