# Reported Speech in HODIE

## Purpose and CEFR-informed progression

This is a HODIE learning pathway informed by CEFR communicative progression, not an official CEFR mapping, examination or certification. Level assignment describes the intended task demand; it does not certify that every learner at a level has mastered the structure.

- **A1 — recognise and relay familiar messages:** identify who said a short, familiar message and preserve its basic meaning. Learners are not expected to master tense backshift at this stage.
- **A2 — report familiar statements and plans:** practise common reported statements, pronoun reference, simple requests and frequent time/tense changes when the past reporting frame makes them useful.
- **B1 — report conversations, questions and requests:** use statement word order in indirect questions; report requests, advice and short interviews; distinguish common reporting verbs such as *say*, *tell*, *ask*, *advise* and *deny*.
- **B2 — preserve stance, evidence and nuance:** attribute claims, distinguish evidence from opinion, report concessions and uncertainty, select reporting verbs precisely and summarise disagreement fairly.

The progression is deliberately communicative. Backshift is presented as a common pattern, not an absolute rule: speakers may retain a present tense when information is still true or relevant. Time and place words such as *today*, *tomorrow*, *here* and *now* change only when the reporting context requires it.

## Current activity library

The active data/micro-practice-library.json contains **284 activities overall**. Reported Speech contributes **70 activities** across the six skills represented in this topic:

| Level | Active Reported Speech activities | Intended emphasis |
|---|---:|---|
| A1 | 11 | Recognising and relaying familiar messages |
| A2 | 16 | Simple statements, plans and messages |
| B1 | 43 | Indirect questions, requests, advice, listening, speaking and writing |
| B2 | 24 in the separate locked pack | Attribution, stance, uncertainty and evidence boundaries |

The 24 B2 activities are authored in data/reported-speech-b2-pack.json, which remains **locked until the progression evidence gate is implemented**. B2 content is not inserted into the active micro-library and cannot be reached merely by choosing a topic.

The active topic uses varied interaction types already supported by HODIE: multiple choice, gap completion, ordering, listening comprehension, spoken repetition, and guided written production. Some activities add memory recall, riddles or a time limit. A timer changes the task conditions; it does not by itself demonstrate language mastery.

## Runtime integration and relationships

The activity catalogue reads data/micro-practice-library.json and filters by level, skill and topic. Search for “Reported Speech” or “Estilo indirecto”. Related activities are linked through relatedCanDoIds and the Can-Do recovery graph; the catalogue no longer truncates those links to three items.

Practice selection can expand a small Can-Do pool to other activities **at the same CEFR level and in the requested skill/resource**. This fills sessions without silently replacing Listening with Speaking or a writing task. Mixed practice can draw on several skills. The default session can contain up to ten activities when enough matching material exists; a specific catalogue item still opens as an individual activity.

Learning targets live in data/can-do-matrix.json. The B2 gate remains closed intentionally. Before unlocking B2, HODIE must assess independent evidence across skills and Can-Do goals, retention and transfer—not activity count alone.

## Correction rules and confidence boundaries

src/reported-speech-review.js adds four **narrow, tested** high-confidence patterns:

1. *said me* → *told me*
2. *told that* → *said that* when no person object is present
3. *asked me where did I live* → *asked me where I lived* for a small, explicit verb list and a past-time question
4. *asked me if was I ready* → *asked me if I was ready*

The rules run only on activities identified as Reported Speech. Each correction includes an English and Spanish explanation. Positive and negative regression tests protect the known examples.

These rules are intentionally limited. No correction means only that none of the reviewed patterns matched; it does **not** mean the whole answer is correct. The checker does not automatically decide whether backshift is required in every context, and it does not claim to fully grade open-ended writing or pronunciation. Speaking activities that use browser speech recognition check for key words in the transcript; that is not a phonetic assessment. Listening activities currently use browser-generated speech for the supplied audioText, not recordings of different real speakers or accents.

Closed activities use answer-specific feedback. Open production uses a checklist of observable task features; meeting the checklist is not a full CEFR assessment or a guarantee that every sentence is grammatically correct.

## Validation

tests/activity-library-integrity.test.js checks unique IDs, Can-Do references, answer-option integrity, ordering tokens, listening source text, speaking requirements, writing criteria, level coverage and session selection. tests/reported-speech-review.test.js checks each targeted correction and negative cases. The existing micro-practice and PWA contracts verify skill boundaries and offline asset paths.

Automated checks are necessary but not sufficient. A real desktop and Android PWA smoke test is still needed to verify the complete click, audio, microphone-permission, retry, offline and install flows in browsers.
