const { SchemaType } = require('@google/generative-ai');

// Builds the user prompt + responseSchema for a single quiz-generation call.
// The schema is enforced server-side by Gemini, but we still validate the
// returned payload in the agent (defence in depth).
function buildQuizPrompt({ sourceText, numEasy, numMedium, numHard }) {
  const total = numEasy + numMedium + numHard;

  const prompt = `Tu es un assistant pédagogique expert qui crée des QCM (questions à choix multiples) à partir de matériel de cours.

À partir du contenu de cours fourni ci-dessous, génère exactement ${total} questions :
- ${numEasy} question(s) FACILE(s) (difficulty="easy") : restitution / rappel direct, définitions explicites.
- ${numMedium} question(s) MOYENNE(s) (difficulty="medium") : compréhension, application simple d'un concept.
- ${numHard} question(s) DIFFICILE(s) (difficulty="hard") : analyse, synthèse, comparaison entre concepts.

Contraintes ABSOLUES :
1. Chaque question possède EXACTEMENT 4 options de réponse.
2. EXACTEMENT 1 option est correcte (is_correct=true), les 3 autres sont incorrectes (is_correct=false).
3. Les distracteurs (réponses incorrectes) doivent être plausibles : du même domaine, du même type de réponse, mais factuellement faux selon le contenu fourni.
4. Toutes les questions, options et explications sont rédigées EN FRANÇAIS.
5. Ne pose des questions QUE sur des informations explicitement présentes dans le contenu ci-dessous. N'invente rien.
6. Réponds UNIQUEMENT avec un objet JSON conforme au schéma demandé : pas de Markdown, pas de commentaire, pas de texte hors JSON.

Contenu du cours :
"""
${sourceText}
"""`;

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      questions: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.OBJECT,
          properties: {
            question_text: { type: SchemaType.STRING },
            difficulty: {
              type: SchemaType.STRING,
              enum: ['easy', 'medium', 'hard'],
            },
            answers: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  answer_text: { type: SchemaType.STRING },
                  is_correct: { type: SchemaType.BOOLEAN },
                },
                required: ['answer_text', 'is_correct'],
              },
            },
          },
          required: ['question_text', 'difficulty', 'answers'],
        },
      },
    },
    required: ['questions'],
  };

  return { prompt, responseSchema };
}

function buildRetryPrompt(originalPrompt) {
  return (
    "Ta réponse précédente n'était pas un JSON valide ou ne respectait pas " +
    'le schéma. Réponds UNIQUEMENT avec un objet JSON conforme au schéma, ' +
    'sans markdown ni commentaires.\n\n' +
    originalPrompt
  );
}

// Used to compress an oversized PDF into a smaller "key concepts" digest
// before quiz generation. Output language: French.
function buildSummaryPrompt(chunk) {
  return `Résume les concepts clés du passage suivant d'un cours, en français, de manière concise mais complète. Conserve les définitions importantes, les formules, les noms propres et les exemples significatifs. Réponds uniquement avec le résumé, sans introduction ni conclusion.

Passage :
"""
${chunk}
"""`;
}

module.exports = { buildQuizPrompt, buildRetryPrompt, buildSummaryPrompt };
