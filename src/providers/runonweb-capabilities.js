const PROVIDER = "runonweb";

function createRunOnWebCapabilities({ SpeechToText, TextToSpeech } = {}) {
  let speechToText;
  let textToSpeech;
  let sttLoadPromise;
  let ttsLoadPromise;

  function createSpeechToText() {
    if (typeof SpeechToText !== "function") {
      throw new Error("RunOnWeb SpeechToText module is not available.");
    }
    if (!speechToText) speechToText = new SpeechToText();
    return speechToText;
  }

  function createTextToSpeech() {
    if (typeof TextToSpeech !== "function") {
      throw new Error("RunOnWeb TextToSpeech module is not available.");
    }
    if (!textToSpeech) textToSpeech = new TextToSpeech({ voice: "af_heart" });
    return textToSpeech;
  }

  return {
    provider: PROVIDER,

    async loadSpeechToText({ onProgress } = {}) {
      const model = createSpeechToText();
      if (!sttLoadPromise) {
        sttLoadPromise = Promise.resolve(model.load({ onProgress })).catch((error) => {
          sttLoadPromise = null;
          throw new Error("RunOnWeb speech model could not be loaded.", { cause: error });
        });
      }
      await sttLoadPromise;
      return { provider: PROVIDER, capability: "speech-to-text", ready: true };
    },

    async transcribe(audioBlob, options = {}) {
      if (!(audioBlob instanceof Blob) || audioBlob.size === 0) {
        throw new TypeError("A non-empty audio Blob is required.");
      }
      const model = createSpeechToText();
      if (!sttLoadPromise) await this.loadSpeechToText();
      try {
        const output = await model.transcribe(audioBlob, options);
        if (typeof output?.text !== "string") {
          throw new Error("RunOnWeb returned no transcript.");
        }
        return { provider: PROVIDER, capability: "speech-to-text", text: output.text.trim() };
      } catch (error) {
        throw new Error("RunOnWeb transcription failed.", { cause: error });
      }
    },

    async loadTextToSpeech({ onProgress } = {}) {
      const model = createTextToSpeech();
      if (!ttsLoadPromise) {
        ttsLoadPromise = Promise.resolve(model.load({ onProgress })).catch((error) => {
          ttsLoadPromise = null;
          throw new Error("RunOnWeb voice model could not be loaded.", { cause: error });
        });
      }
      await ttsLoadPromise;
      return { provider: PROVIDER, capability: "text-to-speech", ready: true };
    },

    async *speak(text) {
      if (typeof text !== "string" || !text.trim()) {
        throw new TypeError("Non-empty text is required.");
      }
      const model = createTextToSpeech();
      if (!ttsLoadPromise) await this.loadTextToSpeech();
      try {
        for await (const chunk of model.speakStream(text.trim())) {
          if (!chunk?.audio) continue;
          yield { provider: PROVIDER, capability: "text-to-speech", audio: chunk.audio, sampleRate: 24000 };
        }
      } catch (error) {
        throw new Error("RunOnWeb speech synthesis failed.", { cause: error });
      }
    },

    dispose() {
      speechToText?.dispose?.();
      textToSpeech?.dispose?.();
      speechToText = undefined;
      textToSpeech = undefined;
      sttLoadPromise = undefined;
      ttsLoadPromise = undefined;
    }
  };
}

export { createRunOnWebCapabilities };
