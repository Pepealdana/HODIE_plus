import assert from "node:assert/strict";
import { CONTRACT_VERSION } from "../src/ai-provider-contract.js";
import { createAIProvider } from "../src/conversation-provider.js";
import { createOpenAIChatCompletionsAdapter } from "../src/providers/openai-chat-completions-adapter.js";

const request = {
  contractVersion: CONTRACT_VERSION,
  requestId: "openai-adapter-test-1",
  taskType: "conversation_turn",
  learningObjective: "Practice describing work at A2 level.",
  languageLevel: "A2",
  input: "I teach technology at school.",
  constraints: { responseLanguage: "en", maxSentences: 2 },
  maxOutputChars: 1000
};
const jsonResponse = (payload, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload
});

assert.throws(() => createOpenAIChatCompletionsAdapter({ apiKey: "", model: "test" }), /OPENAI_API_KEY/);
assert.throws(() => createOpenAIChatCompletionsAdapter({ apiKey: "test-key", model: "" }), /OPENAI_MODEL/);

let captured;
const adapter = createOpenAIChatCompletionsAdapter({
  apiKey: "test-only-key",
  model: "test-model",
  fetchImpl: async (url, options) => {
    captured = { url, options };
    return jsonResponse({ choices: [{ message: { content: JSON.stringify({
      status: "ok", result: { text: "That sounds interesting. What do you teach?" }, uncertainty: 0.1, warnings: []
    }) } }] });
  }
});
const provider = createAIProvider(adapter);
const result = await provider.respond(request);
assert.equal(result.status, "ok");
assert.equal(result.requestId, request.requestId);
assert.equal(result.result.text, "That sounds interesting. What do you teach?");
assert.equal(captured.url, "https://api.openai.com/v1/chat/completions");
assert.equal(captured.options.headers.Authorization, "Bearer test-only-key");
assert.equal(JSON.parse(captured.options.body).model, "test-model");

const badJsonAdapter = createOpenAIChatCompletionsAdapter({
  apiKey: "test-only-key", model: "test-model", fetchImpl: async () => jsonResponse({ choices: [{ message: { content: "not json" } }] })
});
assert.equal((await badJsonAdapter.respond(request)).status, "invalid");

const httpErrorAdapter = createOpenAIChatCompletionsAdapter({
  apiKey: "test-only-key", model: "test-model", fetchImpl: async () => jsonResponse({}, 429)
});
assert.equal((await httpErrorAdapter.respond(request)).status, "unavailable");

const networkErrorAdapter = createOpenAIChatCompletionsAdapter({
  apiKey: "test-only-key", model: "test-model", fetchImpl: async () => { throw new Error("private network details"); }
});
const networkResult = await networkErrorAdapter.respond(request);
assert.equal(networkResult.status, "unavailable");
assert.doesNotMatch(JSON.stringify(networkResult), /private network details|test-only-key/);

await assert.rejects(() => provider.respond({ ...request, requestId: "" }), /requestId/);
console.log("OpenAI Chat Completions adapter tests: PASS");
