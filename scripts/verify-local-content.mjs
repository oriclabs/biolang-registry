import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspace = path.dirname(root);
const index = JSON.parse(readFileSync(path.join(root, "registry", "v1", "index.json"), "utf8"));
for (const entry of index.entries) {
  const match = entry.manifest.match(/^https:\/\/raw\.githubusercontent\.com\/oriclabs\/([^/]+)\/[^/]+\/(.+)$/);
  if (!match) { console.log(`skip non-local publisher URL: ${entry.id}`); continue; }
  const manifestPath = path.join(workspace, match[1], ...match[2].split("/"));
  if (!existsSync(manifestPath)) throw new Error(`${entry.id}: local manifest missing at ${manifestPath}`);
  const bytes = readFileSync(manifestPath);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== entry.manifestSha256) throw new Error(`${entry.id}: manifest checksum mismatch (${actual})`);
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (entry.kind === "lesson") {
    const lesson = path.resolve(path.dirname(manifestPath), manifest.entry);
    if (!existsSync(lesson)) throw new Error(`${entry.id}: lesson entrypoint missing`);
    if (manifest.validation && !existsSync(path.resolve(path.dirname(manifestPath), manifest.validation))) throw new Error(`${entry.id}: declared validation file missing`);
  } else if (manifest.kind !== entry.kind || manifest.id !== entry.id || manifest.version !== entry.version) {
    throw new Error(`${entry.id}: manifest identity does not match its registry entry`);
  }
  if (entry.kind === "dataset") {
    const total = manifest.files.reduce((sum, file) => sum + file.bytes, 0);
    if (manifest.files.length !== entry.dataset.fileCount || total !== entry.dataset.totalBytes) throw new Error(`${entry.id}: dataset discovery totals differ from its manifest`);
    if (manifest.provider !== entry.dataset.provider) throw new Error(`${entry.id}: provider differs from its manifest`);
    const same = (left, right) => JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
    if (manifest.access.kind !== entry.dataset.access || !same(new Set(manifest.files.map(file => file.format)), entry.dataset.formats) ||
        !same(manifest.modalities, entry.dataset.modalities) || !same(manifest.organisms, entry.dataset.organisms)) throw new Error(`${entry.id}: dataset discovery facets differ from its manifest`);
  }
}
console.log(`${index.entries.length} registry entries linked to checksum-matching local content.`);
