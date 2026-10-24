import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const index = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

for (const path of ["styles.css", "app.js", "data/can-do-matrix.json", "data/content-library.json", "data/micro-practice-library.json", "data/experience-library.json", "data/learning-contexts.json", "data/linguistic-catalog.json", "src/linguistic-engine.js"]) {
  assert.ok(fs.existsSync(new URL(path, root)), `Missing runtime asset: ${path}`);
}

assert.match(index, /styles\.css/);
assert.match(index, /app\.js/);
assert.match(app, /DATA\.contexts/);
assert.match(app, /chooseLearningSurface/);
assert.match(app, /startExperience/);
assert.match(app, /startPractice/);
assert.ok(app.includes('home.querySelector("#reportedSpeechShortcut")?.addEventListener("click"'), "Reported Speech shortcut must bind directly to its rendered button");
assert.ok(app.includes("startPractice(mode, activity.id)"), "Reported Speech shortcut must launch a matching activity");

console.log("HODIE app runtime contract: PASS");
