# BioLang Registry

The BioLang Registry is the shared discovery index for BioLang lessons, packages, workflows, tools, datasets, and data providers. It behaves like a small, static package index: clients can list, search, filter, inspect, and then explicitly install or download an immutable version. It stores metadata and checksummed manifest links only. Source code, notebooks, validation tests, and dataset bytes remain in their owning repositories or data banks.

```text
entries/                  reviewed source entries
registry/v1/index.json    complete deterministic index consumed by clients
registry/v1/datasets.json dataset-only catalogue
registry/v1/providers.json provider/API catalogue
registry/v1/categories/   category-specific catalogues
registry/v1/search-index.json compact client-side search document
schemas/                  JSON schemas for publishers and clients
scripts/                  index and integrity checks
```

## Client endpoint

After publication, clients use:

```text
https://registry.lang.bio/v1/index.json
```

The complete endpoint map is `registry/v1/api.json`. Every document is static JSON, so it can be served from GitHub Pages or a CDN at `registry.lang.bio` without a registry application server. Studio may also accept custom registry URLs and direct manifests. Lesson catalogue actions link to the exact `publisher/name@version`; Studio reviews and verifies that manifest before offering an explicit **Install, prepare & run all** action. Merely opening the link never installs content, downloads data, or executes code.

Opening `https://registry.lang.bio/` in a browser shows the searchable human-facing catalogue. Clients and other user interfaces consume the stable `/v1/` JSON endpoints. Catalogue links reuse one named Studio browser tab; selecting other lessons returns to that Studio workspace, where each lesson opens as its own notebook tab. Studio focuses an already-open notebook for the same verified lesson revision and keeps changed revisions separate so edited work is not overwritten.

The public catalogue and Studio deliberately remain two views of one contract. The website is the detailed, shareable discovery surface; Studio adds device-local states and actions such as Available, Installed, Open, Update available, Locally modified and Prepared. Content-kind colours, checksum wording, trust labels, version identity and search text are kept aligned by tests. No account service or dynamic registry backend is required.

The raw GitHub document remains an emergency fallback:

```text
https://raw.githubusercontent.com/oriclabs/biolang-registry/main/registry/v1/index.json
```

OriClabs teaching manifests and notebooks live in the separate
[`biolang-lessons`](https://github.com/oriclabs/biolang-lessons) repository.
One registry entry represents either one notebook or an ordered multi-notebook
collection; subject discovery comes from its categories and tags.

## Hosting

`.github/workflows/pages.yml` validates the generated index and publishes only
the `registry/` directory to GitHub Pages after changes reach `main`. The Pages
artifact therefore exposes `registry/v1/index.json` as `/v1/index.json` without
publishing source entries, scripts, schemas, or repository history.

Repository administrators must complete the one-time GitHub configuration:

1. Open **Settings → Pages** and select **GitHub Actions** as the source.
2. Set the custom domain to `registry.lang.bio` and enable **Enforce HTTPS**
   after its certificate is ready.
3. At the DNS provider, create a `CNAME` record from `registry.lang.bio` to
   `oriclabs.github.io`.

The workflow may also be started manually from the Actions page. Its
`github-pages` environment records the deployed URL and prevents overlapping
deployments from cancelling a deployment already in progress.

## Data contract

A dataset entry contains enough lightweight metadata for discovery: categories, formats, modalities, organisms, access class, provider, file count, and total size. Its checksummed dataset manifest contains the exact source URLs, per-file sizes and SHA-256 hashes, media types, roles, and suggested BioLang readers.

```text
bl data search "NHANES" --category statistics
bl data info oriclabs/nhanes-bdsr-teaching
bl data fetch oriclabs/nhanes-bdsr-teaching
bl data path oriclabs/nhanes-bdsr-teaching
```

`fetch` is the explicit consent boundary. BioLang streams each file to a temporary path, enforces the declared size, verifies SHA-256, and atomically activates it in `~/.biolang/data`. Existing verified files are reused. Set `BIOLANG_DATA_HOME` to move the cache or `BIOLANG_REGISTRY_URL` to use another compatible registry.

Provider entries describe the APIs and capabilities behind datasets. Provider manifests are declarative and may select only an adapter compiled into a client. They cannot contain shell commands, JavaScript, URL templates that execute as code, or credentials. The initial `direct-https` adapter handles manifest-pinned HTTPS files; accession resolvers for data-bank APIs can be added as reviewed built-in adapters while preserving the same dataset manifest and cache contract.

Browser clients should keep small files in Cache Storage or OPFS, confirm large transfers, and hand very large/range-aware data to Desktop or SOMER. Authentication tokens for controlled repositories remain in the client and are never published in registry metadata.

## Add an entry

1. Publish an immutable, HTTPS manifest in the content-owning repository.
2. Add one JSON file under `entries/<kind>/`.
3. Use the manifest's exact SHA-256.
4. Run `npm test` and, when sibling repositories are present, `npm run test:local`.
5. Regenerate with `npm run build`.

Verified entries must point to an immutable tag or commit, not `main`, `master`, or `latest`. Preview entries may use a moving branch while content is being prepared, but clients must label them accordingly.

Lesson entries additionally require structured `discoverability` metadata:
learner problem phrases, statistical or biological methods, plot types,
important terms, common aliases, and BioLang function names. Registry search,
Studio, and the CLI all flatten those fields into the same search vocabulary.
The build rejects future lesson entries with a missing group or empty core
problem/method/term/alias vocabulary. Plot and function arrays may be empty for
lessons that genuinely contain neither.

## What belongs here

- identity, kind, version, publisher, summary, categories and tags;
- structured lesson discoverability without copying full notebook prose;
- manifest URL and checksum;
- BioLang/Studio compatibility and supported runtimes;
- trust status and publication date.

Do not add notebooks, package source, binary tools, dataset bytes, secrets, or executable downloader recipes to this repository. Small declarative provider manifests may live here because they define the registry protocol rather than third-party content.
