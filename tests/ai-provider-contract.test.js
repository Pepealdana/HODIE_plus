import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CONTRACT_VERSION,
  validateAIRequest,
  validateAIResponse
} from "../src/ai-provider-contract.js";
import {
  createAIProvider,
  createRuleBasedProvider,
  validateProvider
} from "../src/conversation-provider.js";

const contract = JSON.parse(fs.readFileSync(new URL("../data/ai-provider-contract.json", import.meta.url), "utf8"));
assert.equal(contract.schemaVersion, CONTRACT_VERSION);
assert.equal(contract.status, "contract-implemented");
assert.equal(contract.safetyAndCost.progressMutationByProvider, false);
assert.equal(contract.safetyAndCost.externalCallRequiredForCorePractice, false);
assert.equal(contract.safetyAndCost.providerSecretsInClient, false);
assert.deepEqual(contract.providers.ai.requiredMethods, ["respond"]);
assert.deepEqual(contract.providers["rule-based"].requiredMethods, ["start", "respond", "advance"]);
assert.ok(contract.operations.finish.includes("Not a provider method"));

const request = {
  contractVersion: CONTRACT_VERSION,
  requestId: "req-test-001",
  taskType: "conversation_turn",
  languageLevel: "A2",
  learningObjective: "Answer a question about daily work.",
  input: "I teach technology.",
  constraints: { responseLanguage: "en", maxSentences: 3 },
  referenceIds: ["SP-A2-01"],
  maxOutputChars: 2000
};
assert.equal(validateAIRequest(request), request);
assert.throws(() => validateAIRequest(null), /must be an object/);
assert.throws(() => validateAIRequest({ ...request, contractVersion: "9.0.0" }), /Unsupported AI request/);
assert.throws(() => validateAIRequest({ ...request, taskType: "delete_progress" }), /Unsupported AI request taskType/);
assert.throws(() => validateAIRequest({ ...request, maxOutputChars: 20001 }), /maxOutputChars/);
assert.throws(() => validateAIRequest({ ...request, constraints: [] }), /constraints must be an object/);

const response = {
  contractVersion: CONTRACT_VERSION,
  requestId: request.requestId,
  taskType: request.taskType,
  status: "ok",
  result: { text: "That sounds interesting. What do you teach?" },
  uncertainty: 0.15,
  warnings: [],
  provider: "test-provider",
  model: "test-model"
};
assert.equal(validateAIResponse(response, request), response);
assert.throws(() => validateAIResponse({ ...response, requestId: "other" }, request), /requestId does not match/);
assert.throws(() => validateAIResponse({ ...response, taskType: "explain" }, request), /taskType does not match/);
assert.throws(() => validateAIResponse({ ...response, status: "ok", result: undefined }, request), /must include result/);
assert.throws(() => validateAIResponse({ ...response, uncertainty: 1.1 }, request), /uncertainty/);
assert.throws(() => validateAIResponse({ ...response, status: "unknown" }, request), /Unsupported AI response status/);

const aiProvider = createAIProvider({
  respond: async (value) => ({
    contractVersion: CONTRACT_VERSION,
    requestId: value.requestId,
    taskType: value.taskType,
    status: "ok",
    result: { text: "That sounds interesting. What do you teach?" },
    provider: "fixture",
    model: "deterministic-test"
  })
});
assert.equal(validateProvider(aiProvider).kind, "ai");
assert.equal((await aiProvider.respond(request)).result.text, "That sounds interesting. What do you teach?");
await assert.rejects(() => aiProvider.respond({ ...request, requestId: "" }), /requestId/);
const malformedAdapter = createAIProvider({
  respond: async (value) => ({
    contractVersion: CONTRACT_VERSION,
    requestId: "wrong-request",
    taskType: value.taskType,
    status: "ok",
    result: { text: "This response belongs to another request." }
  })
});
await assert.rejects(() => malformedAdapter.respond(request), /requestId does not match/);
assert.throws(() => createAIProvider({}), /respond\(\)/);

const ruleBased = createRuleBasedProvider({
  createExperienceSession: () => ({ state: "started" }),
  evaluateExperienceTurn: () => ({ canContinue: true }),
  advanceExperienceSession: () => ({ state: "started", index: 1 })
});
assert.equal(validateProvider(ruleBased).kind, "rule-based");
assert.throws(() => validateProvider({ kind: "ai" }), /respond/);
assert.throws(() => validateProvider({ kind: "rule-based", respond() {} }), /start.*advance/);
assert.throws(() => validateProvider({ kind: "unknown" }), /Unsupported conversation provider/);

console.log("HODIE AI provider contract and adapter tests: PASS");
