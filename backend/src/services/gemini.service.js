const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const FRENCH_MISSING_GEMINI =
  'Configuration Gemini incomplète. Définissez GEMINI_API_KEY dans .env.';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error(FRENCH_MISSING_GEMINI);
  client = new GoogleGenerativeAI(apiKey);
  return client;
}

function getModelName() {
  return process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
}

// Returns { text, usage } where text is the raw JSON string Gemini produced
// (guaranteed by responseMimeType + responseSchema) and usage is the
// usageMetadata block from the response (for token logging).
async function generateJson(prompt, responseSchema) {
  const c = getClient();
  const model = c.getGenerativeModel({ model: getModelName() });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  });

  return {
    text: result.response.text(),
    usage: result.response.usageMetadata,
  };
}

async function generateText(prompt) {
  const c = getClient();
  const model = c.getGenerativeModel({ model: getModelName() });

  const result = await model.generateContent(prompt);
  return {
    text: result.response.text(),
    usage: result.response.usageMetadata,
  };
}

module.exports = { generateJson, generateText, SchemaType };
