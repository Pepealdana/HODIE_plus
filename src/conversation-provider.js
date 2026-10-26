import { validateAIRequest, validateAIResponse } from "./ai-provider-contract.js";

const PROVIDER_KINDS = new Set(["rule-based", "ai"]);

function createRuleBasedProvider(engine) {
  if (!engine) throw new Error("A conversation engine is required.");
  return {
    kind: "rule-based",
    start: (...args) => engine.createExperienceSession(...args),
    respond: (...args) => engine.evaluateExperienceTurn(...args),
    advance: (...args) => engine.advanceExperienceSession(...args)
  };
}

function createAIProvider(adapter) {
  if (!adapter || typeof adapter.respond !== "function") {
    throw new Error("An AI adapter with respond() is required.");
  }
  return {
    kind: "ai",
    respond: async (request) => {\n      validateAIRequest(request);\n      const response = await adapter.respond(request);\n      return validateAIResponse(response, request);\n    }
  };
}

function validateProvider(provider) {
  if (!provider?.kind || !PROVIDER_KINDS.has(provider.kind)) {
    throw new Error("Unsupported conversation provider.");
  }

  const requiredMethods = provider.kind === "rule-based"
    ? ["start", "respond", "advance"]
    : ["respond"];

  const missing = requiredMethods.filter((method) => typeof provider[method] !== "function");
  if (missing.length) {
    throw new Error(`Invalid ${provider.kind} provider: missing required method(s): ${missing.join(", ")}.`);
  }

  return provider;
}

export { PROVIDER_KINDS, createRuleBasedProvider, createAIProvider, validateProvider };
