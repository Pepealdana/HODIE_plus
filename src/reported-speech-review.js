const RULES = [
  {
    id: "RS-SAY-TELL-001",
    pattern: /\bsaid\s+(me|him|her|us|them)\b/gi,
    replace: (match, object) => "told " + object,
    target: "say-tell-object",
    message: "Use tell + person for this pattern: “told me”. “Said me” is not standard English.",
    messageEs: "Usa tell + persona en este patrón: “told me”. “Said me” no es una estructura estándar en inglés."
  },
  {
    id: "RS-TELL-CLAUSE-001",
    pattern: /\btold\s+that\b/gi,
    replace: () => "said that",
    target: "say-tell-object",
    message: "Tell normally needs a person object before a that-clause (for example, “told me that…”). Without that object, use “said that…”.",
    messageEs: "Tell normalmente necesita un complemento de persona antes de una oración con that (por ejemplo, “told me that…”). Sin ese complemento, usa “said that…”."
  },
  {
    id: "RS-INDIRECT-WHERE-001",
    pattern: /\basked\s+(me|him|her|us|them)\s+where\s+did\s+I\s+(live|work|study|play|use|teach|build|go|make|have)\b/gi,
    replace: (match, object, verb) => {
      const past = { live: "lived", work: "worked", study: "studied", play: "played", use: "used", teach: "taught", build: "built", go: "went", make: "made", have: "had" };
      return match.replace(/where\s+did\s+I\s+\w+$/i, "where I " + past[verb.toLowerCase()]);
    },
    target: "reported-question-word-order",
    message: "A reported question uses statement word order. After “asked me where”, write “I lived/worked…” rather than “did I live/work”. This narrow rule assumes a past-time question.",
    messageEs: "Una pregunta indirecta usa el orden afirmativo. Después de “asked me where”, escribe “I lived/worked…” y no “did I live/work”. Esta regla limitada supone una pregunta situada en el pasado."
  },
  {
    id: "RS-INDIRECT-YESNO-001",
    pattern: /\basked\s+(me|him|her|us|them)\s+(if|whether)\s+(am|is|are|was|were|can|could|will|would|has|have|had)\s+(I|he|she|we|they|you|it)\b/gi,
    replace: (match) => match.replace(/\b(if|whether)\s+(am|is|are|was|were|can|could|will|would|has|have|had)\s+(I|he|she|we|they|you|it)\b/i, (_, conjunction, verb, subject) => conjunction + " " + subject + " " + verb),
    target: "reported-question-word-order",
    message: "A reported yes/no question uses statement word order after “if/whether”: subject before verb.",
    messageEs: "Una pregunta indirecta de sí/no usa orden afirmativo después de “if/whether”: primero el sujeto y luego el verbo."
  }
];

function reviewReportedSpeech(text) {
  const original = String(text ?? "");
  let correctedText = original;
  const errors = [];

  for (const rule of RULES) {
    const regex = new RegExp(rule.pattern.source, rule.pattern.flags.includes("g") ? rule.pattern.flags : rule.pattern.flags + "g");
    let cursor = 0;
    let next = "";
    let changed = false;
    for (const match of correctedText.matchAll(regex)) {
      const replacement = rule.replace(match[0], ...match.slice(1));
      if (!replacement || replacement === match[0]) continue;
      next += correctedText.slice(cursor, match.index) + replacement;
      errors.push({
        ruleId: rule.id,
        target: rule.target,
        type: "grammar",
        actual: match[0],
        expected: replacement,
        correction: replacement,
        start: match.index,
        end: match.index + match[0].length,
        severity: "medium",
        priority: "high",
        message: rule.message,
        messageEs: rule.messageEs,
        retry: true,
        confidence: "high"
      });
      cursor = match.index + match[0].length;
      changed = true;
    }
    if (changed) correctedText = next + correctedText.slice(cursor);
  }

  return {
    correctedText,
    errors,
    status: errors.length ? "corrected-reviewed-pattern" : "no-reported-speech-pattern-matched",
    scope: "Narrow, tested patterns only. No match does not mean the response is fully correct."
  };
}

export { reviewReportedSpeech };
