// System primer + cheat-detection helpers for the pedagogical chatbot.

const BASE_PRIMER =
  "Tu es un assistant pédagogique pour la plateforme SmartMoodle. Tu aides " +
  "les étudiants à comprendre leurs cours. Réponds en français, sois clair, " +
  "pédagogique et bienveillant. Si la question sort du cadre académique ou " +
  "demande de tricher (donner les réponses d'un quiz par exemple), refuse " +
  "poliment. Adapte tes explications au profil d'apprentissage de " +
  "l'étudiant si fourni.";

// Maps the normalized dominant_style stored on vark_profiles to a French
// hint appended to the system primer. Keys are lowercased.
const VARK_HINTS = {
  visual:
    "L'étudiant a un profil d'apprentissage Visuel — privilégie les " +
    "diagrammes, les schémas, les listes structurées, les analogies " +
    "visuelles, et organise tes réponses avec des titres et des puces.",
  auditory:
    "L'étudiant a un profil d'apprentissage Auditif — privilégie les " +
    "explications narratives, le rythme et la répétition, et reformule " +
    "les concepts comme s'il fallait les énoncer à voix haute.",
  reading:
    "L'étudiant a un profil d'apprentissage Lecture/Écriture — " +
    "privilégie les définitions précises, les listes textuelles et les " +
    "références aux passages écrits du cours.",
  kinesthetic:
    "L'étudiant a un profil d'apprentissage Kinesthésique — privilégie " +
    "les exemples concrets, les exercices pratiques et les analogies " +
    "basées sur l'expérience ou l'action.",
};

function buildSystemPrimer({ courseContext, varkStyle }) {
  const parts = [BASE_PRIMER];

  if (courseContext) {
    let block = `Contexte actuel : tu aides l'étudiant sur le cours « ${courseContext.title} ».`;
    if (courseContext.description) {
      block += ` Description du cours : ${courseContext.description}`;
    }
    parts.push(block);

    if (Array.isArray(courseContext.materialTitles) && courseContext.materialTitles.length) {
      const lines = courseContext.materialTitles.map((t) => `- ${t}`).join('\n');
      parts.push(`Matériel disponible dans ce cours :\n${lines}`);
    }
  }

  const normalised = (varkStyle || '').toLowerCase();
  if (VARK_HINTS[normalised]) {
    parts.push(VARK_HINTS[normalised]);
  }

  return parts.join('\n\n');
}

// Simple keyword guardrail: detects messages that look like a student asking
// for direct quiz answers. We deliberately err on the side of accepting
// legitimate questions — only obvious cheat phrasings should match.
const CHEAT_PATTERNS = [
  /r[ée]ponses?\s+(du|au|de|aux?)\s+(quiz|questionnaire|qcm|examen|test|devoir|contr[ôo]le)/i,
  /donne[- ]?(moi|les)\s+(les?\s+)?r[ée]ponses?/i,
  /quelles?\s+sont\s+les?\s+r[ée]ponses?\s+(du|au|[àa])/i,
  /solution(s)?\s+(du|au|de)\s+(quiz|qcm|examen|devoir|contr[ôo]le)/i,
  /correction\s+(du|au|de)\s+(quiz|qcm|examen|devoir|contr[ôo]le)/i,
  /answers?\s+(to|for|of)\s+(the\s+)?(quiz|test|exam|assignment)/i,
  /give\s+me\s+the\s+answers?/i,
  /triche[rz]?\s+(pour|sur)\s+(le|au)\s+(quiz|qcm|examen)/i,
];

function detectsQuizCheating(message) {
  if (!message) return false;
  return CHEAT_PATTERNS.some((re) => re.test(message));
}

const CHEAT_REFUSAL =
  "Je ne peux pas te donner les réponses d'un quiz. En revanche, je peux " +
  "t'expliquer les concepts associés pour t'aider à comprendre par toi-même. " +
  "Quelle notion veux-tu approfondir ?";

module.exports = {
  buildSystemPrimer,
  detectsQuizCheating,
  CHEAT_REFUSAL,
  VARK_HINTS,
};
