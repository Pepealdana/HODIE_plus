import { createRunOnWebCapabilities } from "./src/providers/runonweb-capabilities.js";

const $ = (selector) => document.querySelector(selector);
const sttStatus = $("#stt-status");
const ttsStatus = $("#tts-status");
const loadSttButton = $("#load-stt");
const recordButton = $("#record");
const stopButton = $("#stop");
const transcribeButton = $("#transcribe");
const transcriptOutput = $("#transcript");
const recordingPlayer = $("#recording");
const loadTtsButton = $("#load-tts");
const speakButton = $("#speak");
const voiceText = $("#voice-text");
const voicePlayer = $("#voice-audio");

let capabilities;
let recorder;
let recordedChunks = [];
let audioBlob;
let audioContext;

function setStatus(element, message) { element.textContent = message; }

function audioToWavBlob(samples, sampleRate) {
  const data = samples instanceof Float32Array
    ? samples
    : samples instanceof Int16Array
      ? Float32Array.from(samples, (value) => value / 32768)
      : ArrayBuffer.isView(samples)
        ? Float32Array.from(samples)
        : null;
  if (!data?.length) throw new Error("The model returned an unsupported or empty audio chunk.");
  const buffer = new ArrayBuffer(44 + data.length * 2);
  const view = new DataView(buffer);
  const write = (offset, value) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, "RIFF"); view.setUint32(4, 36 + data.length * 2, true);
  write(8, "WAVE"); write(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  write(36, "data"); view.setUint32(40, data.length * 2, true);
  for (let i = 0; i < data.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

async function initialize() {
  setStatus(sttStatus, "Conectando con los módulos de RunOnWeb…");
  const [{ SpeechToText }, { TextToSpeech }] = await Promise.all([
    import("https://esm.sh/runonweb@0.1.0/stt"),
    import("https://esm.sh/runonweb@0.1.0/tts")
  ]);
  capabilities = createRunOnWebCapabilities({ SpeechToText, TextToSpeech });
}

loadSttButton.addEventListener("click", async () => {
  loadSttButton.disabled = true;
  setStatus(sttStatus, "Iniciando Scribe… Si es la primera vez, descargará el modelo (puede superar 100 MB).");
  try {
    if (!capabilities) await initialize();
    setStatus(sttStatus, "Descargando y preparando Scribe… Mantén esta página abierta.");
    await capabilities.loadSpeechToText({
      onProgress: (progress) => {
        const detail = typeof progress === "number" ? ` ${Math.round(progress * 100)}%` : "";
        setStatus(sttStatus, `Descargando y preparando Scribe…${detail}`);
      }
    });
    recordButton.disabled = !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder;
    transcribeButton.disabled = !audioBlob;
    setStatus(sttStatus, "Scribe está listo. Graba una respuesta corta en inglés.");
  } catch (error) {
    const detail = error?.cause?.message ? ` Detalle: ${error.cause.message}` : "";
    setStatus(sttStatus, `No se pudo cargar Scribe: ${error.message}.${detail}`);
    loadSttButton.disabled = false;
  }
});

recordButton.addEventListener("click", async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    recorder = new MediaRecorder(stream);
    recorder.addEventListener("dataavailable", (event) => { if (event.data.size) recordedChunks.push(event.data); });
    recorder.addEventListener("stop", () => {
      audioBlob = new Blob(recordedChunks, { type: recorder.mimeType || "audio/webm" });
      recordingPlayer.src = URL.createObjectURL(audioBlob);
      recordingPlayer.hidden = false;
      transcribeButton.disabled = false;
      stream.getTracks().forEach((track) => track.stop());
      setStatus(sttStatus, "Grabación guardada en esta pestaña. Pulsa Transcribir audio para procesarla localmente.");
    }, { once: true });
    recorder.start();
    recordButton.disabled = true;
    stopButton.disabled = false;
    setStatus(sttStatus, "Grabando… Habla en inglés y luego detén la grabación.");
  } catch (error) {
    setStatus(sttStatus, `Micrófono no disponible: ${error.message}`);
  }
});

stopButton.addEventListener("click", () => {
  if (recorder?.state === "recording") recorder.stop();
  stopButton.disabled = true;
  recordButton.disabled = false;
});

transcribeButton.addEventListener("click", async () => {
  transcribeButton.disabled = true;
  setStatus(sttStatus, "Transcribiendo audio localmente…");
  try {
    const result = await capabilities.transcribe(audioBlob);
    transcriptOutput.textContent = result.text || "(No se detectaron palabras.)";
    setStatus(sttStatus, "Transcripción terminada. Compara el resultado con lo que dijiste.");
  } catch (error) {
    setStatus(sttStatus, `Falló la transcripción: ${error.message}`);
  } finally {
    transcribeButton.disabled = false;
  }
});

loadTtsButton.addEventListener("click", async () => {
  loadTtsButton.disabled = true;
  setStatus(ttsStatus, "Iniciando Voice… La primera descarga puede superar 300 MB; mantén la página abierta.");
  try {
    if (!capabilities) await initialize();
    setStatus(ttsStatus, "Descargando y preparando Voice…");
    await capabilities.loadTextToSpeech({
      onProgress: (progress) => {
        const detail = typeof progress === "number" ? ` ${Math.round(progress * 100)}%` : "";
        setStatus(ttsStatus, `Descargando y preparando Voice…${detail}`);
      }
    });
    speakButton.disabled = false;
    setStatus(ttsStatus, "Voice está listo.");
  } catch (error) {
    const detail = error?.cause?.message ? ` Detalle: ${error.cause.message}` : "";
    setStatus(ttsStatus, `No se pudo cargar Voice: ${error.message}.${detail}`);
    loadTtsButton.disabled = false;
  }
});

speakButton.addEventListener("click", async () => {
  speakButton.disabled = true;
  setStatus(ttsStatus, "Generando voz localmente…");
  try {
    const chunks = [];
    for await (const chunk of capabilities.speak(voiceText.value)) chunks.push(chunk.audio);
    const length = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) { samples.set(chunk, offset); offset += chunk.length; }
    const wav = audioToWavBlob(samples, 24000);
    voicePlayer.src = URL.createObjectURL(wav);
    voicePlayer.hidden = false;
    await voicePlayer.play();
    setStatus(ttsStatus, "Audio generado localmente.");
  } catch (error) {
    setStatus(ttsStatus, `Falló la generación de voz: ${error.message}`);
  } finally {
    speakButton.disabled = false;
  }
});

window.addEventListener("pagehide", () => {
  capabilities?.dispose();
  if (audioContext && audioContext.state !== "closed") audioContext.close();
});

setStatus(sttStatus, "Listo para cargar Scribe. Al grabar, el navegador solicitará permiso para usar el micrófono.");
setStatus(ttsStatus, "Listo para cargar Voice.");
