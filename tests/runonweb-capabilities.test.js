import assert from "node:assert/strict";
import { createRunOnWebCapabilities } from "../src/providers/runonweb-capabilities.js";

let sttLoads = 0;
let ttsLoads = 0;
const mockSpeechToText = class {
  async load() { sttLoads += 1; }
  async transcribe(blob) { return { text: blob.type === "text/plain" ? await blob.text() : "I teach technology at school." }; }
  dispose() {}
};
const mockTextToSpeech = class {
  async load() { ttsLoads += 1; }
  async *speakStream(text) { yield { audio: new Float32Array([0, 0.1, -0.1]), text }; }
  dispose() {}
};

const capabilities = createRunOnWebCapabilities({ SpeechToText: mockSpeechToText, TextToSpeech: mockTextToSpeech });
assert.equal(capabilities.provider, "runonweb");
assert.deepEqual(await capabilities.loadSpeechToText(), { provider: "runonweb", capability: "speech-to-text", ready: true });
assert.deepEqual(await capabilities.loadSpeechToText(), { provider: "runonweb", capability: "speech-to-text", ready: true });
assert.equal(sttLoads, 1);

const transcript = await capabilities.transcribe(new Blob(["I teach technology at school."], { type: "text/plain" }));
assert.equal(transcript.text, "I teach technology at school.");
assert.equal(transcript.capability, "speech-to-text");
await assert.rejects(() => capabilities.transcribe(new Blob([])), /non-empty audio Blob/);

await capabilities.loadTextToSpeech();
await capabilities.loadTextToSpeech();
assert.equal(ttsLoads, 1);
const chunks = [];
for await (const chunk of capabilities.speak("Hello there.")) chunks.push(chunk);
assert.equal(chunks.length, 1);
assert.equal(chunks[0].sampleRate, 24000);
assert.equal(chunks[0].capability, "text-to-speech");
await assert.rejects(async () => { for await (const _ of capabilities.speak(" ")) {} }, /Non-empty text/);

capabilities.dispose();
console.log("RunOnWeb capabilities tests: PASS");
