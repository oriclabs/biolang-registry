import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entriesRoot = path.join(root, "entries");
const output = path.join(root, "registry", "v1", "index.json");
const allowedKinds = new Set(["lesson", "package", "workflow", "tool"]);
const allowedStatuses = new Set(["preview", "stable", "deprecated", "withdrawn"]);
const allowedRuntimes = new Set(["browser", "desktop", "somer"]);
const movingReference = /\/(?:main|master|latest)\//i;

function filesBelow(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(item => {
    const target = path.join(directory, item.name);
    return item.isDirectory() ? filesBelow(target) : item.name.endsWith(".json") ? [target] : [];
  });
}

function fail(file, message) { throw new Error(`${path.relative(root, file)}: ${message}`); }

function validate(entry, file) {
  if (entry.schema !== 1 || !allowedKinds.has(entry.kind)) fail(file, "invalid schema or kind");
  if (!/^[a-z0-9._-]+\/[a-z0-9._-]+$/.test(entry.id) || entry.id !== `${entry.publisher}/${entry.name}`) fail(file, "id must equal publisher/name");
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(entry.version)) fail(file, "version must be semantic");
  if (!allowedStatuses.has(entry.status) || typeof entry.verified !== "boolean") fail(file, "invalid status/trust fields");
  if (!/^https:\/\//.test(entry.manifest) || !/^[a-f0-9]{64}$/.test(entry.manifestSha256)) fail(file, "manifest requires HTTPS and lowercase SHA-256");
  if (entry.verified && movingReference.test(entry.manifest)) fail(file, "verified entries cannot use a moving manifest reference");
  if (!entry.compatibility || !Array.isArray(entry.compatibility.runtimes) || !entry.compatibility.runtimes.length || entry.compatibility.runtimes.some(value => !allowedRuntimes.has(value))) fail(file, "invalid runtime compatibility");
  if (!Array.isArray(entry.tags) || new Set(entry.tags).size !== entry.tags.length) fail(file, "tags must be a unique array");
  if (!/^https:\/\//.test(entry.sourceRepository)) fail(file, "sourceRepository must use HTTPS");
  for (const key of ["title", "summary", "publisher", "name", "publishedAt", "licence", "validation"]) if (!entry[key]) fail(file, `missing ${key}`);
}

const entries = filesBelow(entriesRoot).map(file => { const entry = JSON.parse(readFileSync(file, "utf8")); validate(entry, file); return entry; });
entries.sort((a, b) => `${a.kind}/${a.id}/${a.version}`.localeCompare(`${b.kind}/${b.id}/${b.version}`));
const identities = entries.map(entry => `${entry.id}@${entry.version}`);
if (new Set(identities).size !== identities.length) throw new Error("duplicate registry id + version");
const rendered = `${JSON.stringify({ schema: 1, entries }, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = readFileSync(output, "utf8");
  if (current !== rendered) throw new Error("registry/v1/index.json is stale; run npm run build");
  console.log(`${entries.length} registry entry checked; generated index is current.`);
} else {
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, rendered);
  console.log(`${entries.length} registry entry written to ${path.relative(root, output)}.`);
}
