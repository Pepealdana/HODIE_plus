import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../runonweb-lab.html", import.meta.url), "utf8");
const js = await readFile(new URL("../runonweb-lab.js", import.meta.url), "utf8");
assert.match(html, /RunOnWeb: oral English practice/);
assert.match(html, /id="load-stt"/);
assert.match(html, /id="load-tts"/);
assert.match(html, /id="transcribe"/);
assert.match(js, /runonweb@0\.1\.0\/stt/);
assert.match(js, /runonweb@0\.1\.0\/tts/);
assert.match(js, /getUserMedia/);
assert.match(js, /capabilities\.transcribe/);
assert.match(js, /capabilities\.speak/);
assert.doesNotMatch(js, /api\.openai\.com|OPENAI_API_KEY/);
console.log("RunOnWeb lab contract tests: PASS");
