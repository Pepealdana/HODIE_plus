const CONTRACT_VERSION = "1.0.0";
const REQUEST_TASK_TYPES = new Set([
  "conversation_turn",
  "explain",
  "generate_activity",
  "suggest_feedback",
  "analyze_interaction"
]);
const RESPONSE_STATUSES = new Set(["ok", "refused", "unavailable", "invalid"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

function validateAIRequest(request) {
  requireCondition(isRecord(request), "AI request must be an object.");
  requireCondition(request.contractVersion === CONTRACT_VERSION, "Unsupported AI request contractVersion.");
  requireCondition(typeof request.requestId === "string" && request.requestId.trim(), "AI request must include requestId.");
  requireCondition(REQUEST_TASK_TYPES.has(request.taskType), "Unsupported AI request taskType.");
  requireCondition(typeof request.learningObjective === "string" && request.learningObjective.trim(), "AI request must include learningObjective.");
  requireCondition(typeof request.input === "string", "AI request input must be a string.");
  requireCondition(isRecord(request.constraints), "AI request constraints must be an object.");
  if (request.languageLevel !== undefined && request.languageLevel !== null) {
    requireCondition(typeof request.languageLevel === "string", "languageLevel must be a string when provided.");
  }
  if (request.referenceIds !== undefined) {
    requireCondition(Array.isArray(request.referenceIds) && request.referenceIds.every((id) => typeof id === "string"), "referenceIds must be an array of strings.");
  }
  if (request.maxOutputChars !== undefined) {
    requireCondition(Number.isInteger(request.maxOutputChars) && request.maxOutputChars > 0 && request.maxOutputChars <= 20000, "maxOutputChars must be an integer from 1 to 20000.");
  }
  return request;
}

function validateAIResponse(response, expectedRequest = {}) {
  requireCondition(isRecord(response), "AI response must be an object.");
  requireCondition(response.contractVersion === CONTRACT_VERSION, "Unsupported AI response contractVersion.");
  requireCondition(typeof response.requestId === "string" && response.requestId.trim(), "AI response must include requestId.");
  requireCondition(!expectedRequest.requestId || response.requestId === expectedRequest.requestId, "AI response requestId does not match the request.");
  requireCondition(REQUEST_TASK_TYPES.has(response.taskType), "Unsupported AI response taskType.");
  requireCondition(!expectedRequest.taskType || response.taskType === expectedRequest.taskType, "AI response taskType does not match the request.");
  requireCondition(RESPONSE_STATUSES.has(response.status), "Unsupported AI response status.");
  if (response.status === "ok") {
    requireCondition(Object.hasOwn(response, "result") && response.result !== undefined && response.result !== null, "Successful AI response must include result.");
  }
  if (response.uncertainty !== undefined) {
    requireCondition(typeof response.uncertainty === "number" && response.uncertainty >= 0 && response.uncertainty <= 1, "uncertainty must be a number from 0 to 1.");
  }
  if (response.warnings !== undefined) {
    requireCondition(Array.isArray(response.warnings) && response.warnings.every((item) => typeof item === "string"), "warnings must be an array of strings.");
  }
  for (const field of ["provider", "model"]) {
    if (response[field] !== undefined) {
      requireCondition(typeof response[field] === "string" && response[field].trim(), field + " must be a non-empty string when provided.");
    }
  }
  return response;
}

export {
  CONTRACT_VERSION,
  REQUEST_TASK_TYPES,
  RESPONSE_STATUSES,
  validateAIRequest,
  validateAIResponse
};
