import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../tools-lab.html", import.meta.url), "utf8");
const js = await readFile(new URL("../tools-lab.js", import.meta.url), "utf8");
const home = await readFile(new URL("../index.html", import.meta.url), "utf8");
const sw = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

for (const id of [
  "check-writing", "check-rules", "speak-browser", "start-recognition",
  "start-recording", "analyze-pronunciation", "check-pronunciation-server", "build-practice"
]) assert.ok(html.includes(`id="${id}"`), `Missing lab control: ${id}`);

assert.ok(js.includes("harper.js@2.4.0"));
assert.ok(js.includes("SpeechRecognition"));
assert.ok(js.includes("speechSynthesis"));
assert.ok(html.includes("https://tu-servidor:8000"));
assert.ok(!html.includes("localhost:8000"));
assert.ok(js.includes("evaluateKnownRules"));
assert.ok(js.includes("renderPronunciationResult"));
assert.ok(js.includes("${baseUrl}/health"));
assert.ok(js.includes("${baseUrl}/pronunciation"));
assert.ok(js.includes("const applied = []"));
assert.ok(!home.match(/runonweb-lab|Scribe|RunOnWeb Lab/i));
assert.ok(home.includes("tools-lab.html"));
assert.ok(sw.includes("hodie-shell-v44"));
assert.ok(sw.includes("tools-lab.html"));
assert.equal(packageJson.scripts["test:tools-lab"], "node --check tools-lab.js && node tests/tools-lab-contract.test.js");
assert.ok(!packageJson.scripts.test.includes("test:runonweb"));
console.log("Language tools lab contract tests: PASS");
