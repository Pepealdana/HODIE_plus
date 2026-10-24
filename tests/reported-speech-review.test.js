import assert from "node:assert/strict";
import { reviewReportedSpeech } from "../src/reported-speech-review.js";

const cases = [
  ["She said me that she was busy.", "She told me that she was busy.", "RS-SAY-TELL-001"],
  ["He told that the meeting was moved.", "He said that the meeting was moved.", "RS-TELL-CLAUSE-001"],
  ["He asked me where did I live.", "He asked me where I lived.", "RS-INDIRECT-WHERE-001"],
  ["She asked me if was I ready.", "She asked me if I was ready.", "RS-INDIRECT-YESNO-001"]
];

for (const [input, expected, ruleId] of cases) {
  const result = reviewReportedSpeech(input);
  assert.equal(result.correctedText, expected, input);
  assert.ok(result.errors.some((error) => error.ruleId === ruleId), "Missing rule " + ruleId);
  assert.ok(result.errors.every((error) => error.confidence === "high" && error.message && error.messageEs));
}

for (const valid of [
  "She told me that she was busy.",
  "He said that the meeting was moved.",
  "He asked me where I lived.",
  "She asked me if I was ready.",
  "She asked me whether I was ready.",
  "He told me that he had finished the task."
]) {
  const result = reviewReportedSpeech(valid);
  assert.equal(result.errors.length, 0, "A valid reported-speech form must not be changed: " + valid);
  assert.equal(result.correctedText, valid);
}

const noMatch = reviewReportedSpeech("I enjoy building robots with my students.");
assert.equal(noMatch.errors.length, 0);
assert.match(noMatch.scope, /No match does not mean/);

console.log("HODIE reported-speech correction rules: PASS", JSON.stringify({rules: cases.length, negativeCases: 7}));
