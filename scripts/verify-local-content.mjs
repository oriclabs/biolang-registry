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
  const lesson = path.resolve(path.dirname(manifestPath), manifest.entry);
  if (entry.kind === "lesson" && !existsSync(lesson)) throw new Error(`${entry.id}: lesson entrypoint missing`);
  if (manifest.validation && !existsSync(path.resolve(path.dirname(manifestPath), manifest.validation))) throw new Error(`${entry.id}: declared validation file missing`);
}
console.log(`${index.entries.length} registry entry linked to checksum-matching local content.`);
