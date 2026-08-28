import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(path.join(root, "registry", "index.html"), "utf8");
const required = [
  'id="search"', 'id="tabs"', 'id="cards"', 'id="detail"',
  "v1/index.json", "oriclabs.com/biolang-studio", "data-entry", "data-kind",
];
for (const marker of required) {
  if (!html.includes(marker)) throw new Error(`registry catalogue is missing ${marker}`);
}
if (/<script[^>]+src=/i.test(html)) throw new Error("registry catalogue must not require external scripts");
const moduleScript = /<script type="module">([\s\S]*?)<\/script>/.exec(html)?.[1];
if (!moduleScript) throw new Error("registry catalogue module script is missing");
new Function(moduleScript);
const cname = readFileSync(path.join(root, "registry", "CNAME"), "utf8").trim();
if (cname !== "registry.lang.bio") throw new Error("registry CNAME does not match the published catalogue URL");
console.log("registry catalogue structure and script checked");
