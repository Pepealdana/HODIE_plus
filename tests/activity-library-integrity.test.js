import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { selectMicroActivities, evaluateMicroActivity } from "../src/micro-practice.js";
import library from "../data/micro-practice-library.json" with { type: "json" };
import matrix from "../data/can-do-matrix.json" with { type: "json" };
import reportedSpeechB2 from "../data/reported-speech-b2-pack.json" with { type: "json" };

const root = new URL("../", import.meta.url);
const appSource = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const canDoIds = new Set(matrix.canDos.map((item) => item.id));
const ids = new Set();
const allowedTypes = new Set(["choose", "complete", "order", "match", "listening", "speak", "mini-production"]);

assert.ok(library.activities.length >= 270, "The activity library should be broad, not a 3–5 item sample.");
for (const activity of library.activities) {
  assert.ok(activity.id && !ids.has(activity.id), "Activity IDs must be present and unique: " + activity.id);
  ids.add(activity.id);
  assert.ok(canDoIds.has(activity.canDoId), activity.id + " references an unknown Can-Do: " + activity.canDoId);
  const linkedGoal = matrix.canDos.find((item) => item.id === activity.canDoId);
  assert.equal(linkedGoal.level, activity.level, activity.id + " level must match its Can-Do target");
  assert.ok(allowedTypes.has(activity.type), activity.id + " uses unsupported type " + activity.type);
  assert.ok(activity.level && ["A1", "A2", "B1", "B2"].includes(activity.level), activity.id + " needs a CEFR level");

  if (["choose", "match", "listening"].includes(activity.type)) {
    assert.ok(Array.isArray(activity.options), activity.id + " must render an array of answer options");
    const accepted = [activity.answer, ...(activity.acceptableAnswers || [])].map((x) => String(x).trim().toLowerCase());
    assert.ok(activity.options.some((option) => accepted.includes(String(option).trim().toLowerCase())), activity.id + " answer is not selectable");
  }
  if (activity.type === "complete") {
    assert.ok(typeof activity.answer === "string" && activity.answer.trim(), activity.id + " needs a concrete expected answer");
  }
  if (activity.type === "order") {
    assert.ok(Array.isArray(activity.tokens) && Array.isArray(activity.answer), activity.id + " needs tokens and an answer sequence");
    assert.equal(activity.tokens.length, activity.answer.length, activity.id + " token count must match answer count");
    assert.ok(activity.answer.every((token) => activity.tokens.includes(token)), activity.id + " answer contains a token not shown to the learner");
  }
  if (activity.type === "listening") assert.ok(activity.audioText, activity.id + " needs audio text");
  if (activity.type === "speak") {
    assert.ok(activity.targetPhrase && activity.requiredTokens?.length, activity.id + " needs a model phrase and required words");
    assert.ok(activity.feedback?.correct && activity.feedback?.partial, activity.id + " needs speaking-specific feedback");
  }
  if (activity.type === "mini-production") {
    assert.ok(activity.evaluation?.criteria?.length, activity.id + " needs a task checklist");
    assert.ok(activity.evaluation.criteria.every((criterion) => criterion.patterns?.length), activity.id + " checklist criteria must be evaluable");
    assert.ok(activity.feedback?.ready || activity.feedback?.correct, activity.id + " needs positive production feedback");
    assert.ok(activity.feedback?.short || activity.feedback?.incorrect, activity.id + " needs actionable production feedback");
  }
  if (!["speak", "mini-production"].includes(activity.type)) {
    assert.ok(activity.feedback?.correct && activity.feedback?.incorrect, activity.id + " needs specific correct/incorrect feedback");
    assert.ok(activity.feedback?.correctEs && activity.feedback?.incorrectEs, activity.id + " needs bilingual feedback");
    assert.ok(!["Correct.", "Correct. Check the meaning and context."].includes(activity.feedback.correct.trim()), activity.id + " has generic positive feedback");
    assert.ok(!["Try again.", "Not quite. Review the options and try again."].includes(activity.feedback.incorrect.trim()), activity.id + " has generic corrective feedback");
  }
}

const reportedSpeech = library.activities.filter((activity) => (activity.tags || []).some((tag) => String(tag).toLowerCase().replace(/\s+/g, "-") === "reported-speech"));
for (const [level, minimum] of [["A1", 10], ["A2", 14], ["B1", 35]]) {
  assert.ok(reportedSpeech.filter((activity) => activity.level === level).length >= minimum, "Reported Speech needs a meaningful " + level + " pool");
}
for (const skill of ["grammar", "reading", "listening", "speaking", "writing", "communication"]) {
  assert.ok(reportedSpeech.some((activity) => activity.skill === skill), "Reported Speech lacks " + skill);
}
assert.ok(reportedSpeech.some((activity) => activity.gameMode === "memory-recall"), "Memory recall should be represented");
assert.ok(reportedSpeech.some((activity) => activity.gameMode === "timed-challenge"), "Timed challenges should be represented");
assert.ok(reportedSpeech.some((activity) => (activity.tags || []).includes("riddle")), "Riddle-style activities should be represented");

assert.equal(reportedSpeechB2.visibility, "locked-until-evidence-gate");
assert.equal(reportedSpeechB2.unlockRequirement, "B2");
assert.ok(reportedSpeechB2.activities.length >= 20, "B2 content must be authored as a real pack, not four examples");
assert.ok(reportedSpeechB2.activities.every((activity) => activity.level === "B2" && activity.unlockRequirement === "B2"), "B2 activities must retain the B2 gate");
assert.equal(library.activities.some((activity) => activity.level === "B2"), false, "Locked B2 activities must not leak into the active micro-library");

const mixed = selectMicroActivities(library, { canDoId: "RS-A2-GRAM", mode: "mixed", limit: 10 });
assert.equal(mixed.length, 10, "Mixed practice should fill a ten-item session when the level has enough content");
assert.ok(new Set(mixed.map((activity) => activity.skill)).size >= 4, "Mixed practice should cover several skills");
const listening = selectMicroActivities(library, { canDoId: "RS-A2-LISTEN", mode: "listening", limit: 10 });
assert.equal(listening.length, 10, "Focused practice should expand a small Can-Do pool within the same level and skill");
assert.ok(listening.every((activity) => activity.type === "listening"), "Listening focus must not substitute another interaction type");
assert.equal(evaluateMicroActivity(library.activities.find((activity) => activity.id === "MIC-RS-B1-09"), "was").correct, true);
assert.equal(evaluateMicroActivity(library.activities.find((activity) => activity.id === "MIC-RS-B1-11"), "I worked").correct, true);
assert.equal(evaluateMicroActivity(library.activities.find((activity) => activity.id === "MIC-RS-B1-34"), "whether").correct, true);

assert.doesNotMatch(appSource, /relatedActivities\.slice\(0,\s*3\)/, "The catalogue must not truncate related activities to three");
assert.match(appSource, /const options = \{ mode, limit: 10, profile \}/, "Practice sessions should use the expanded session size");

console.log("HODIE activity-library integrity: PASS", JSON.stringify({
  activities: library.activities.length,
  reportedSpeech: reportedSpeech.length,
  reportedSpeechB2: reportedSpeechB2.activities.length,
  mixedSession: mixed.length,
  listeningSession: listening.length
}));
