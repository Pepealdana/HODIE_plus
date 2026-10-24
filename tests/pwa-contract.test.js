import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const index = read("index.html");
const app = read("app.js");
const manifest = JSON.parse(read("manifest.webmanifest"));
const worker = read("service-worker.js");

assert.match(index, /manifest\.webmanifest/);
assert.match(index, /theme-color/);
assert.match(index, /assets\/brand\/hodie-logo\.svg/);
assert.match(index, /assets\/brand\/hodie-logo-dark\.svg/);
assert.match(index, /assets\/icons\/icon-light\.svg/);

assert.equal(manifest.name, "HODIE — Today. Not tomorrow.");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.scope, "./");
assert.equal(manifest.icons?.length, 1);
assert.equal(manifest.icons[0].src, "./assets/icons/icon-light.svg");
assert.equal(manifest.icons[0].type, "image/svg+xml");
assert.equal(manifest.icons[0].sizes, "any");

assert.match(worker, /skipWaiting/);
assert.match(worker, /clients\.claim/);
assert.match(worker, /hodie-shell-v45/);
assert.match(worker, /assets\/brand\/hodie-logo\.svg/);
assert.match(worker, /assets\/brand\/hodie-logo-dark\.svg/);
assert.match(worker, /assets\/icons\/icon-light\.svg/);
assert.match(worker, /src\/learning-engine\.js/);
assert.match(worker, /src\/session-runner\.js/);
assert.match(worker, /src\/reported-speech-review\.js/);
assert.match(worker, /data\/knowledge-library\.json/);
assert.match(worker, /data\/integrated-units\.json/);
assert.doesNotMatch(worker, /\.png/);
assert.match(app, /registration\.update\(\)/);
assert.match(app, /updateViaCache:\s*"none"/);

const shellMatch = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/);
assert.ok(shellMatch, "APP_SHELL list must be declared");
const shellResources = [...shellMatch[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
assert.ok(shellResources.includes("./data/knowledge-library.json"));
assert.ok(shellResources.includes("./data/linguistic-catalog.json"));
assert.ok(shellResources.includes("./src/linguistic-engine.js"));
assert.ok(shellResources.includes("./src/reported-speech-review.js"));
assert.ok(shellResources.includes("./data/integrated-units.json"));
assert.equal(new Set(shellResources).size, shellResources.length, "APP_SHELL must not contain duplicate paths");

for (const resource of shellResources) {
  if (resource === "./") continue;
  const localPath = path.join(root, resource.replace(/^\.\//, ""));
  assert.equal(fs.existsSync(localPath), true, "Missing precached resource: " + resource);
}

const imports = [...app.matchAll(/from\s+["'](\.\/src\/[^"']+)["']/g)].map((match) => match[1]);
for (const importedPath of imports) {
  assert.ok(shellResources.includes(importedPath), "Imported module missing from APP_SHELL: " + importedPath);
}

const dataPaths = [...app.matchAll(/["'](\.\/data\/[^"']+\.json)["']/g)].map((match) => match[1]);
for (const dataPath of dataPaths) {
  assert.ok(shellResources.includes(dataPath), "Application data missing from APP_SHELL: " + dataPath);
}

assert.equal(fs.existsSync(path.join(root, "assets/icon.svg")), false);
for (const asset of ["assets/brand/hodie-logo.svg", "assets/brand/hodie-logo-dark.svg", "assets/icons/icon-light.svg", "assets/icons/icon-dark.svg"]) {
  assert.equal(fs.existsSync(path.join(root, asset)), true, "Missing brand asset: " + asset);
}
assert.equal(fs.existsSync(path.join(root, "assets/brand/hodie-logo.png")), false);

console.log("HODIE PWA contract: PASS");
