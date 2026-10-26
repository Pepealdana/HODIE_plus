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
const pronunciationEndpoint = $("#pronounce-endpoint");
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
    item.append(title);
    if (finding.explanation) {
      const detail = document.createElement("p");
      detail.textContent = finding.explanation;
      item.append(detail);
    }
    if (finding.suggestions?.length) {
      const suggestion = document.createElement("p");
      suggestion.textContent = `Sugerencia: ${finding.suggestions.join(" / ")}`;
      item.append(suggestion);
    } else if (finding.message && !finding.original) {
      const detail = document.createElement("p");
      detail.textContent = "Harper detectó un posible problema, pero no proporcionó una sustitución automática.";
      item.append(detail);
    }
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
      return {
        message: `${lint.message()}${location}`,
        suggestions,
        original: "",
        correction: "",
        explanation: ""
      };
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
  recognition.interimResults = false;
  recognition.continuous = false;
  recognition.addEventListener("result", (event) => {
    const transcript = Array.from(event.results)
      .filter((result) => result.isFinal)
      .map((result) => result[0].transcript.trim())
      .filter(Boolean)
      .join(" ");
    browserTranscript.textContent = transcript || "No se detectaron palabras.";
  });
  recognition.addEventListener("error", (event) => setStatus(browserVoiceStatus, `Reconocimiento no disponible: ${event.error}. Puedes probar la síntesis de voz igualmente.`));
  recognition.addEventListener("end", () => {
    $("#start-recognition").disabled = false;
    $("#stop-recognition").disabled = true;
    if (browserTranscript.textContent === "Escuchando…" || !browserTranscript.textContent.trim()) {
      browserTranscript.textContent = "No se obtuvo una transcripción final. Intenta hablar más cerca del micrófono y pronunciar una frase corta.";
      setStatus(browserVoiceStatus, "No se recibió una transcripción final.");
    } else {
      setStatus(browserVoiceStatus, "Reconocimiento terminado. Compara el texto con la frase objetivo; no es una puntuación de pronunciación.");
    }
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


function renderPronunciationResult(data) {
  pronunciationResults.replaceChildren();
  if (!data || typeof data !== "object") {
    pronunciationResults.textContent = "El servidor no devolvió un resultado válido.";
    return;
  }
  const score = typeof data.score === "number" ? data.score : null;
  const transcript = data.transcribe || data.transcript || "";
  const summary = document.createElement("p");
  summary.textContent = score === null
    ? "El servidor respondió, pero no incluyó una puntuación reconocible."
    : `Puntuación orientativa: ${score}/100`;
  pronunciationResults.append(summary);
  if (transcript) {
    const transcriptLine = document.createElement("p");
    transcriptLine.textContent = `El sistema entendió: ${transcript}`;
    pronunciationResults.append(transcriptLine);
  }
  const errors = data.differences?.errors;
  if (Array.isArray(errors) && errors.length) {
    const heading = document.createElement("h3");
    heading.textContent = "Palabras o sonidos para revisar";
    pronunciationResults.append(heading);
    for (const error of errors.slice(0, 20)) {
      const line = document.createElement("p");
      const phones = Array.isArray(error.phones)
        ? error.phones.map((phone) => `${phone.expected ?? "?"} → ${phone.heard ?? "?"}`).join(", ")
        : "";
      line.textContent = `${error.word ?? "Palabra"}: esperado ${error.expected ?? "?"}; escuchado ${error.actual ?? "?"}${phones ? ` (sonidos: ${phones})` : ""}`;
      pronunciationResults.append(line);
    }
  } else {
    const note = document.createElement("p");
    note.textContent = "No se devolvieron errores por palabra. Revisa también la transcripción y recuerda que el resultado puede contener falsos positivos.";
    pronunciationResults.append(note);
  }
  const details = document.createElement("details");
  const summaryDetails = document.createElement("summary");
  summaryDetails.textContent = "Ver respuesta técnica completa";
  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(data, null, 2);
  details.append(summaryDetails, pre);
  pronunciationResults.append(details);
}

$("#check-pronunciation-server").addEventListener("click", async () => {
  const baseUrl = pronunciationEndpoint.value.trim().replace(/\\/+$/, "");
  if (!baseUrl) {
    setStatus(pronunciationStatus, "Escribe primero la URL base del servidor. La página no incluye el motor OpenPronounce.");
    return;
  }
  const button = $("#check-pronunciation-server");
  button.disabled = true;
  setStatus(pronunciationStatus, "Comprobando el endpoint /health…");
  try {
    const response = await fetch(`${baseUrl}/health`, { method: "GET" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (data.status !== "ok") throw new Error("El endpoint respondió, pero no confirmó status: ok.");
    setStatus(pronunciationStatus, "Servidor OpenPronounce disponible. Ya puedes grabar una frase y analizarla.");
  } catch (error) {
    setStatus(pronunciationStatus, `No se pudo conectar: ${error.message}. Comprueba URL, servidor, HTTPS y CORS.`);
  } finally {
    button.disabled = false;
  }
});

$("#analyze-pronunciation").addEventListener("click", async () => {
  const baseUrl = pronunciationEndpoint.value.trim().replace(/\\/+$/, "");
  const expected = $("#expected-text").value.trim();
  if (!recordedBlob?.size || !expected || !baseUrl) {
    setStatus(pronunciationStatus, "Necesitas una grabación, una frase esperada y la URL base de un servidor OpenPronounce activo.");
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
    const response = await fetch(`${baseUrl}/pronunciation`, { method: "POST", body: form });
    if (!response.ok) throw new Error(`El servicio respondió HTTP ${response.status}. Verifica el endpoint y CORS.`);
    const data = await response.json();
    renderPronunciationResult(data);
    setStatus(pronunciationStatus, "Análisis recibido. La puntuación es orientativa, no una calificación oficial.");
  } catch (error) {
    setStatus(pronunciationStatus, `No se pudo analizar: ${error.message}. Confirma que el servidor esté activo, accesible por HTTPS y permita CORS desde GitHub Pages.`);
  } finally { button.disabled = false; }
});

$("#build-practice").addEventListener("click", () => {
  const text = writingText.value.trim();
  const findings = evaluateKnownRules(text);
  if (!findings.length) {
    pedagogyResults.textContent = "No se encontró un patrón conocido para crear un ejercicio. Prueba con: “I learning English”, “She work every day” o “Yesterday I go to school”.";
    return;
  }
  let corrected = text;
  const applied = [];
  for (const finding of findings) {
    if (corrected.includes(finding.original)) {
      corrected = corrected.replace(finding.original, finding.correction);
      applied.push(finding);
    }
  }
  const explanation = applied.map((finding, index) => `${index + 1}. ${finding.explanation}`).join("\\n");
  const practice = applied.map((finding, index) => `${index + 1}. ${finding.id === "present-continuous-be" ? "Completa: I ___ (learn) English now." : finding.id === "want-to" ? "Completa: I want ___ (improve) my English." : finding.id === "third-person-s" ? "Completa: She ___ (teach) English." : finding.id === "past-simple-go" ? "Completa: Yesterday I ___ (go) to school." : finding.id === "do-support-he" ? "Completa: He ___ like coffee." : "Reescribe la edad usando “I am … years old”."}`).join("\\n");
  pedagogyResults.textContent = `Tu frase:\\n${text}\\n\\nCorrección sugerida:\\n${corrected}\\n\\nPor qué:\\n${explanation}\\n\\nPractica:\\n${practice}\\n\\nEstas reglas detectan solo patrones concretos. Revisa la frase completa y no tomes la sugerencia como una evaluación exhaustiva.`;
});

window.addEventListener("pagehide", () => {
  window.speechSynthesis?.cancel();
  recognition?.abort?.();
  if (mediaRecorder?.state === "recording") mediaRecorder.stop();
  mediaStream?.getTracks().forEach((track) => track.stop());
  harperLinter?.dispose?.();
});
