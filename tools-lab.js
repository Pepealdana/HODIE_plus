const $ = (selector) => document.querySelector(selector);
const writingText = $("#writing-text");
const speechText = $("#speech-text");
const harperStatus = $("#harper-status");
const harperResults = $("#harper-results");
const rulesResults = $("#rules-results");
const browserVoiceStatus = $("#browser-voice-status");
const browserTranscript = $("#browser-transcript");
const pronunciationStatus = $("#pronunciation-status");
const pronunciationResults = $("#pronunciation-results");
const pedagogyResults = $("#pedagogy-results");

let harperLinter;
let recognition;
let mediaRecorder;
let mediaStream;
let recordedBlob;
let recordedChunks = [];

function setStatus(node, message) { node.textContent = message; }

const knownRules = [
  {
    id: "present-continuous-be",
    pattern: /\bI\s+(learning|working|studying|going|doing|trying|improving)\b/i,
    correction: (match) => match[0].replace(/\bI\s+/i, "I am "),
    explanation: "En presente continuo se usa am/is/are + verbo en -ing."
  },
  {
    id: "third-person-s",
    pattern: /\b(She|He|It)\s+(work|live|like|play|study|teach|want|need)\b/i,
    correction: (match) => match[0].replace(/\b(She|He|It)\s+(\w+)/i, (_, subject, verb) => `${subject} ${verb === "study" ? "studies" : verb + "s"}`),
    explanation: "En presente simple, con he/she/it normalmente añadimos -s o -es al verbo."
  },
  {
    id: "past-simple-go",
    pattern: /\b(yesterday|last\s+(?:week|month|year|night))\s+I\s+go\b/i,
    correction: (match) => match[0].replace(/\bgo\b/i, "went"),
    explanation: "Con una referencia al pasado como yesterday, go cambia a went."
  },
  {
    id: "do-support-he",
    pattern: /\bHe\s+don't\b/i,
    correction: (match) => match[0].replace(/don't/i, "doesn't"),
    explanation: "Con he/she/it usamos doesn't para negar en presente simple."
  },
  {
    id: "age-expression",
    pattern: /\bI\s+have\s+(\d+)\s+years\b/i,
    correction: (match) => match[0].replace(/I have (\d+) years/i, "I am $1 years old"),
    explanation: "En inglés, la edad se expresa con be: I am 17 years old."
  },
  {
    id: "want-to",
    pattern: /\bI\s+want\s+(improve|learn|speak|find|get|work)\b/i,
    correction: (match) => match[0].replace(/\bwant\s+(improve|learn|speak|find|get|work)\b/i, "want to $1"),
    explanation: "Antes de otro verbo, want normalmente va seguido de to + verbo base."
  }
];

function evaluateKnownRules(text) {
  const findings = [];
  for (const rule of knownRules) {
    const match = text.match(rule.pattern);
    if (match) findings.push({ id: rule.id, original: match[0], correction: rule.correction(match), explanation: rule.explanation });
  }
  return findings;
}

function renderFindings(target, findings, emptyMessage) {
  target.replaceChildren();
  if (!findings.length) { target.textContent = emptyMessage; return; }
  for (const finding of findings) {
    const item = document.createElement("div");
    item.className = "error-item";
    const title = document.createElement("strong");
    title.textContent = finding.original ? `${finding.original} → ${finding.correction}` : finding.message;
    const detail = document.createElement("p");
    detail.textContent = finding.explanation || finding.message || "Revisa esta sugerencia y confirma si se ajusta a lo que querías decir.";
    item.append(title, detail);
    target.append(item);
  }
}

$("#check-writing").addEventListener("click", async () => {
  const text = writingText.value.trim();
  if (!text) { setStatus(harperStatus, "Escribe una frase antes de revisar."); return; }
  const button = $("#check-writing");
  button.disabled = true;
  setStatus(harperStatus, "Cargando Harper o revisando el texto… La primera carga necesita conexión.");
  try {
    if (!harperLinter) {
      const [{ binaryInlined }, { WorkerLinter }] = await Promise.all([
        import("https://unpkg.com/harper.js@2.4.0/dist/binaryInlined.js"),
        import("https://unpkg.com/harper.js@2.4.0/dist/index.js")
      ]);
      harperLinter = new WorkerLinter({ binary: binaryInlined });
    }
    const lints = await harperLinter.lint(text);
    const findings = lints.map((lint) => {
      let location = "";
      try { const span = lint.span(); location = span ? ` (posición ${span.start}–${span.end})` : ""; } catch {}
      let suggestions = [];
      try { suggestions = typeof lint.suggestions === "function" ? lint.suggestions().map((item) => item.get_replacement_text()).filter(Boolean) : []; } catch {}
      const suggestionText = suggestions.length ? `\\nSugerencias: ${suggestions.join(" / ")}` : "";
      return { message: `${lint.message()}${location}${suggestionText}`, original: "", correction: "", explanation: "" };
    });
    renderFindings(harperResults, findings, "Harper no encontró problemas en esta frase. Esto no garantiza que toda la frase sea correcta.");
    setStatus(harperStatus, `Revisión terminada: ${lints.length} observación(es). Harper se ejecuta en el navegador.`);
  } catch (error) {
    setStatus(harperStatus, `No se pudo ejecutar Harper: ${error.message}. Comprueba la conexión y vuelve a intentarlo.`);
  } finally { button.disabled = false; }
});

$("#check-rules").addEventListener("click", () => {
  const findings = evaluateKnownRules(writingText.value.trim());
  renderFindings(rulesResults, findings, "No se detectaron patrones cubiertos por estas reglas. El corrector tiene cobertura limitada.");
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results).map((result) => result[0].transcript).join(" ");
    browserTranscript.textContent = transcript || "No se detectaron palabras.";
  });
  recognition.addEventListener("error", (event) => setStatus(browserVoiceStatus, `Reconocimiento no disponible: ${event.error}. Puedes probar la síntesis de voz igualmente.`));
  recognition.addEventListener("end", () => {
    $("#start-recognition").disabled = false;
    $("#stop-recognition").disabled = true;
    if (browserTranscript.textContent !== "La transcripción aparecerá aquí.") setStatus(browserVoiceStatus, "Reconocimiento terminado. La disponibilidad y privacidad dependen del navegador.");
  });
} else {
  $("#start-recognition").disabled = true;
  setStatus(browserVoiceStatus, "Este navegador no expone SpeechRecognition. La síntesis de voz puede seguir funcionando.");
}

$("#speak-browser").addEventListener("click", () => {
  const text = speechText.value.trim();
  if (!text) { setStatus(browserVoiceStatus, "Escribe una frase primero."); return; }
  if (!("speechSynthesis" in window)) { setStatus(browserVoiceStatus, "La síntesis de voz no está disponible en este navegador."); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.onstart = () => setStatus(browserVoiceStatus, "Reproduciendo la frase…");
  utterance.onend = () => setStatus(browserVoiceStatus, "Reproducción terminada.");
  utterance.onerror = (event) => setStatus(browserVoiceStatus, `No se pudo reproducir la voz: ${event.error}.`);
  window.speechSynthesis.speak(utterance);
});
$("#start-recognition").addEventListener("click", () => {
  if (!recognition) return;
  browserTranscript.textContent = "Escuchando…";
  setStatus(browserVoiceStatus, "Habla en inglés. El reconocimiento puede depender de un servicio del navegador.");
  $("#start-recognition").disabled = true;
  $("#stop-recognition").disabled = false;
  try { recognition.start(); } catch (error) {
    setStatus(browserVoiceStatus, `No se pudo iniciar: ${error.message}`);
    $("#start-recognition").disabled = false;
    $("#stop-recognition").disabled = true;
  }
});
$("#stop-recognition").addEventListener("click", () => recognition?.stop());

$("#start-recording").addEventListener("click", async () => {
  try {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error("Este navegador no permite grabar audio con MediaRecorder.");
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.addEventListener("dataavailable", (event) => { if (event.data.size) recordedChunks.push(event.data); });
    mediaRecorder.addEventListener("stop", () => {
      recordedBlob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || "audio/webm" });
      $("#pronunciation-audio").src = URL.createObjectURL(recordedBlob);
      $("#pronunciation-audio").hidden = false;
      $("#analyze-pronunciation").disabled = !recordedBlob.size;
      mediaStream?.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      setStatus(pronunciationStatus, "Grabación lista. El audio solo se enviará al pulsar Analizar pronunciación.");
    }, { once: true });
    mediaRecorder.start();
    $("#start-recording").disabled = true;
    $("#stop-recording").disabled = false;
    setStatus(pronunciationStatus, "Grabando… Di la frase que aparece en el campo de frase esperada.");
  } catch (error) { setStatus(pronunciationStatus, `No se pudo grabar: ${error.message}`); }
});
$("#stop-recording").addEventListener("click", () => {
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  $("#start-recording").disabled = false;
  $("#stop-recording").disabled = true;
});

$("#analyze-pronunciation").addEventListener("click", async () => {
  const endpoint = $("#pronounce-endpoint").value.trim();
  const expected = $("#expected-text").value.trim();
  if (!recordedBlob?.size || !expected || !endpoint) {
    setStatus(pronunciationStatus, "Necesitas una grabación, una frase esperada y una URL de servicio.");
    return;
  }
  const button = $("#analyze-pronunciation");
  button.disabled = true;
  setStatus(pronunciationStatus, "Enviando audio a la instancia configurada…");
  try {
    const form = new FormData();
    form.append("file", recordedBlob, "hodie-practice-audio.webm");
    form.append("expected_text", expected);
    form.append("lang", "en");
    const response = await fetch(endpoint, { method: "POST", body: form });
    if (!response.ok) throw new Error(`El servicio respondió HTTP ${response.status}. Verifica el endpoint y CORS.`);
    const data = await response.json();
    pronunciationResults.textContent = JSON.stringify(data, null, 2);
    setStatus(pronunciationStatus, "Análisis recibido. La puntuación es orientativa, no una calificación oficial.");
  } catch (error) {
    setStatus(pronunciationStatus, `No se pudo analizar: ${error.message}. Para GitHub Pages, configura un servidor accesible por HTTPS y CORS.`);
  } finally { button.disabled = false; }
});

$("#build-practice").addEventListener("click", () => {
  const text = writingText.value.trim();
  const findings = evaluateKnownRules(text);
  if (!findings.length) {
    pedagogyResults.textContent = "No se encontró un patrón conocido para crear un ejercicio. Prueba con: “I learning English”, “She work every day” o “Yesterday I go to school”.";
    return;
  }
  const finding = findings[0];
  pedagogyResults.textContent = `Tu frase: ${text}\nCorrección sugerida: ${text.replace(finding.original, finding.correction)}\n\nExplicación: ${finding.explanation}\n\nPráctica: escribe una nueva frase usando la misma estructura y cambia el sujeto o el contexto.\n\nNota: esta regla cubre un patrón concreto; revisa siempre la frase completa.`;
});

window.addEventListener("pagehide", () => {
  window.speechSynthesis?.cancel();
  recognition?.abort?.();
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  mediaStream?.getTracks().forEach((track) => track.stop());
  harperLinter?.dispose?.();
});
