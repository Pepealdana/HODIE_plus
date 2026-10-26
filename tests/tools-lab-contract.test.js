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
]) assert.match(html, new RegExp(`id="${id}"`), `Missing lab control: ${id}`);

assert.match(js, /harper\.js@2\.4\.0/);
assert.match(js, /SpeechRecognition|webkitSpeechRecognition/);
assert.match(js, /speechSynthesis/);
assert.match(html, /localhost:8000\/pronunciation/);
assert.match(js, /evaluateKnownRules/);\nassert.match(js, /renderPronunciationResult/);\nassert.match(js, /\\/health/);\nassert.match(js, /\\/pronunciation/);
assert.doesNotMatch(home, /runonweb-lab|Scribe|RunOnWeb Lab/i);
assert.match(home, /tools-lab\.html/);
assert.match(sw, /hodie-shell-v43/);
assert.match(sw, /tools-lab\.html/);
assert.equal(packageJson.scripts["test:tools-lab"], "node --check tools-lab.js && node tests/tools-lab-contract.test.js");
assert.doesNotMatch(packageJson.scripts.test, /test:runonweb/);
console.log("Language tools lab contract tests: PASS");
