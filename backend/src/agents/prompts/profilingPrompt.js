const { SchemaType } = require('@google/generative-ai');

// Builds the prompt + responseSchema for a learning-path generation call.
// `materials` is [{id, title}], `varkStyle` is lowercase canonical (or null
// → balanced), `quizStats` is {count, averageScore, mostCommonEndDifficulty}.
function buildProfilingPrompt({
  courseTitle,
  courseDescription,
  materials,
  varkStyle,
  quizStats,
}) {
  const materialList = materials
    .map((m, i) => `${i + 1}. (id=${m.id}) ${m.title}`)
    .join('\n');
  const materialIds = materials.map((m) => m.id).join(', ');

  const profileLine = varkStyle
    ? `Profil d'apprentissage dominant de l'étudiant : ${varkStyle}.`
    : "Profil d'apprentissage : inconnu. Donne des recommandations équilibrées (visuel, auditif, lecture/écriture, kinesthésique).";

  let statsLine;
  if (quizStats.count > 0) {
    statsLine =
      `Activité quiz récente : ${quizStats.count} tentative(s) terminée(s), ` +
      `score moyen ${quizStats.averageScore}/100, ` +
      `difficulté la plus fréquente en fin de tentative : ${quizStats.mostCommonEndDifficulty}.`;
  } else {
    statsLine = "Activité quiz récente : aucune tentative terminée pour le moment.";
  }

  const prompt = `Tu es un assistant pédagogique expert. Tu dois proposer un parcours d'apprentissage personnalisé à un étudiant pour un cours donné.

Cours : « ${courseTitle} »${courseDescription ? `\nDescription : ${courseDescription}` : ''}

Matériel disponible (utilise UNIQUEMENT ces IDs) :
${materialList || '(aucun matériel disponible)'}

${profileLine}
${statsLine}

Ta tâche :
1. Donne l'ordre RECOMMANDÉ d'étude des matériels (champ "material_order") sous forme d'un tableau d'IDs entiers. Tous les IDs doivent provenir EXCLUSIVEMENT de la liste ci-dessus (${materialIds || 'liste vide'}). Pas de doublons.
2. Choisis une "recommended_difficulty" parmi exactement "easy", "medium", "hard", en fonction du score moyen :
   - score moyen < 50 ou aucune tentative → "easy"
   - score moyen entre 50 et 75 → "medium"
   - score moyen > 75 → "hard"
3. Fournis "tips" : entre 2 et 3 conseils d'étude courts (1–2 phrases chacun), en français, adaptés au profil d'apprentissage indiqué. Les conseils doivent être concrets et actionnables, pas génériques.

Réponds UNIQUEMENT avec un objet JSON conforme au schéma. Pas de markdown, pas de commentaires.`;

  const responseSchema = {
    type: SchemaType.OBJECT,
    properties: {
      material_order: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.INTEGER },
      },
      recommended_difficulty: {
        type: SchemaType.STRING,
        enum: ['easy', 'medium', 'hard'],
      },
      tips: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
    },
    required: ['material_order', 'recommended_difficulty', 'tips'],
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

module.exports = { buildProfilingPrompt, buildRetryPrompt };
