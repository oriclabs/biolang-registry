import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entriesRoot = path.join(root, "entries");
const apiRoot = path.join(root, "registry", "v1");
const allowedKinds = new Set(["lesson", "package", "workflow", "tool", "dataset", "provider"]);
const allowedStatuses = new Set(["preview", "stable", "deprecated", "withdrawn"]);
const allowedRuntimes = new Set(["browser", "desktop", "somer", "cli"]);
const allowedAccess = new Set(["public", "registration", "controlled"]);
const allowedAuthentication = new Set(["none", "api-key", "oauth", "controlled"]);
const movingReference = /\/(?:main|master|latest)\//i;

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? filesBelow(target) : item.name.endsWith(".json") ? [target] : [];
  });
}

function fail(file, message) { throw new Error(`${path.relative(root, file)}: ${message}`); }
function uniqueStrings(values) { return Array.isArray(values) && values.every(value => typeof value === "string") && new Set(values).size === values.length; }
const discoveryFields = ["problems", "methods", "plots", "terms", "aliases", "functions"];
const requiredDiscoveryFields = new Set(["problems", "methods", "terms", "aliases"]);
function validDiscoverability(value) {
  return value && typeof value === "object" && !Array.isArray(value) &&
    discoveryFields.every(field => uniqueStrings(value[field]) && (!requiredDiscoveryFields.has(field) || value[field].length > 0) &&
      value[field].every(term => term.trim() === term && term.length > 1));
}
function discoveryTerms(entry) {
  return discoveryFields.flatMap(field => entry.discoverability?.[field] ?? []);
}
function validId(value) { return /^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(value); }
function hasMojibake(value) {
  if (typeof value === "string") return /(?:Ã.|Â.|â[€‚]|�)/u.test(value);
  if (Array.isArray(value)) return value.some(hasMojibake);
  return value && typeof value === "object" && Object.values(value).some(hasMojibake);
}
function compareVersionsDescending(left, right) {
  const parse = value => {
    const [base, suffix = ""] = value.split(/-(.*)/s, 2);
    return { numbers: base.split(".").map(Number), suffix };
  };
  const a = parse(left);
  const b = parse(right);
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return b.numbers[index] - a.numbers[index];
  }
  if (!a.suffix && b.suffix) return -1;
  if (a.suffix && !b.suffix) return 1;
  return b.suffix.localeCompare(a.suffix);
}

function validate(entry, file) {
  if (hasMojibake(entry)) fail(file, "contains likely mojibake; save source metadata as UTF-8 and repair the text");
  if (entry.schema !== 1 || !allowedKinds.has(entry.kind)) fail(file, "invalid schema or kind");
  if (!validId(entry.id) || entry.id !== `${entry.publisher}/${entry.name}`) fail(file, "id must equal publisher/name");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.version) ||
      entry.version.split("-", 1)[0].split(".").some(part => !Number.isSafeInteger(Number(part)))) fail(file, "version must be semantic and use safe numeric components");
  if (!allowedStatuses.has(entry.status) || typeof entry.verified !== "boolean") fail(file, "invalid status/trust fields");
  if (!/^https:\/\//.test(entry.manifest) || !/^[a-f0-9]{64}$/.test(entry.manifestSha256)) fail(file, "manifest requires HTTPS and lowercase SHA-256");
  if (entry.verified && movingReference.test(entry.manifest)) fail(file, "verified entries cannot use a moving manifest reference");
  if (!entry.compatibility || !Array.isArray(entry.compatibility.runtimes) || !entry.compatibility.runtimes.length || entry.compatibility.runtimes.some(value => !allowedRuntimes.has(value))) fail(file, "invalid runtime compatibility");
  if (!uniqueStrings(entry.categories) || !entry.categories.length || entry.categories.some(value => !/^[a-z0-9][a-z0-9-]*$/.test(value))) fail(file, "categories must be unique slugs");
  if (!uniqueStrings(entry.tags)) fail(file, "tags must be a unique string array");
  if (entry.kind === "lesson" && !validDiscoverability(entry.discoverability)) {
    fail(file, "lesson discoverability must provide problems, methods, plots, terms, aliases, and functions arrays; only plots and functions may be empty");
  }
  if (!/^https:\/\//.test(entry.sourceRepository)) fail(file, "sourceRepository must use HTTPS");
  for (const key of ["title", "summary", "publisher", "name", "publishedAt", "licence", "validation"]) if (!entry[key]) fail(file, `missing ${key}`);
  if (entry.series && (entry.kind !== "lesson" || !/^[a-z0-9][a-z0-9._-]*$/.test(entry.series.id ?? "") ||
      !entry.series.title || !/^https:\/\//.test(entry.series.url ?? "") || !Number.isInteger(entry.series.order) ||
      entry.series.order < 0 || !entry.series.chapter)) fail(file, "invalid lesson series fields");
  if (entry.kind === "dataset") {
    const data = entry.dataset;
    if (!data || !validId(data.provider ?? "") || !allowedAccess.has(data.access) ||
        !uniqueStrings(data.formats) || !data.formats.length || !uniqueStrings(data.modalities) || !uniqueStrings(data.organisms) ||
        !Number.isInteger(data.fileCount) || data.fileCount < 1 || !Number.isSafeInteger(data.totalBytes) || data.totalBytes < 1) fail(file, "invalid dataset discovery fields");
  }
  if (entry.kind === "provider") {
    const provider = entry.provider;
    if (!provider?.adapter || !allowedAuthentication.has(provider.authentication) || !uniqueStrings(provider.capabilities) || !provider.capabilities.length || !/^https:\/\//.test(provider.apiDocumentation ?? "")) fail(file, "invalid provider discovery fields");
  }
}

function render(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function title(slug) { return slug.split("-").map(word => word.slice(0, 1).toUpperCase() + word.slice(1)).join(" "); }

const entries = filesBelow(entriesRoot).map(file => { const entry = JSON.parse(readFileSync(file, "utf8")); validate(entry, file); return entry; });
entries.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id) || compareVersionsDescending(a.version, b.version));
const activeEntries = entries.filter(entry => entry.status !== "withdrawn");
const identities = entries.map(entry => `${entry.id}@${entry.version}`);
if (new Set(identities).size !== identities.length) throw new Error("duplicate registry id + version");
const providerIds = new Set(entries.filter(entry => entry.kind === "provider").map(entry => entry.id));
for (const entry of entries.filter(entry => entry.kind === "dataset")) {
  if (!providerIds.has(entry.dataset.provider)) throw new Error(`${entry.id}: provider '${entry.dataset.provider}' is not registered`);
}

const categories = [...new Set(activeEntries.flatMap(entry => entry.categories))].sort().map(id => {
  const matches = activeEntries.filter(entry => entry.categories.includes(id));
  return { id, title: title(id), count: matches.length, kinds: [...new Set(matches.map(entry => entry.kind))].sort() };
});
const searchDocuments = activeEntries.map(entry => ({
  id: entry.id,
  version: entry.version,
  kind: entry.kind,
  title: entry.title,
  summary: entry.summary,
  categories: entry.categories,
  tags: entry.tags,
  discoverability: entry.discoverability,
  text: [entry.id, entry.title, entry.summary, entry.publisher, ...entry.categories, ...entry.tags,
    ...discoveryTerms(entry),
    entry.dataset?.provider ?? "",
    ...(entry.dataset?.formats ?? []), ...(entry.dataset?.modalities ?? []), ...(entry.dataset?.organisms ?? []),
    entry.provider?.adapter ?? "", entry.provider?.authentication ?? "", ...(entry.provider?.capabilities ?? []),
    entry.series?.id ?? "", entry.series?.title ?? "", entry.series?.chapter ?? ""].join(" ").toLowerCase()
}));

const outputs = new Map([
  [path.join(apiRoot, "index.json"), { schema: 1, entries }],
  [path.join(apiRoot, "search-index.json"), { schema: 1, documents: searchDocuments }],
  [path.join(apiRoot, "categories.json"), { schema: 1, categories }],
  [path.join(apiRoot, "datasets.json"), { schema: 1, entries: activeEntries.filter(entry => entry.kind === "dataset") }],
  [path.join(apiRoot, "providers.json"), { schema: 1, entries: activeEntries.filter(entry => entry.kind === "provider") }],
  [path.join(apiRoot, "api.json"), {
    schema: 1,
    endpoints: {
      index: "index.json",
      search: "search-index.json",
      categories: "categories.json",
      datasets: "datasets.json",
      providers: "providers.json",
      entry: "entries/{kind}/{publisher}/{name}/{version}.json",
      category: "categories/{category}.json"
    }
  }]
]);
for (const entry of entries) outputs.set(path.join(apiRoot, "entries", entry.kind, entry.publisher, entry.name, `${entry.version}.json`), entry);
for (const category of categories) outputs.set(path.join(apiRoot, "categories", `${category.id}.json`), { schema: 1, category, entries: activeEntries.filter(entry => entry.categories.includes(category.id)) });

const check = process.argv.includes("--check");
for (const [file, value] of outputs) {
  const expected = render(value);
  if (check) {
    let current;
    try { current = readFileSync(file, "utf8"); } catch { throw new Error(`${path.relative(root, file)} is missing; run npm run build`); }
    if (current !== expected) throw new Error(`${path.relative(root, file)} is stale; run npm run build`);
  } else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, expected);
  }
}
console.log(`${entries.length} entries, ${categories.length} categories, and ${outputs.size} API documents ${check ? "checked" : "written"}.`);
