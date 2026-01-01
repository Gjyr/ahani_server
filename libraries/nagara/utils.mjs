function generateId() {
  return (
    crypto.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).substring(2)
  );
}

function generateBackupCode() {
  const adjectives = ["Iris", "Crystal", "Shadow", "Iron", "Golden", "Silent"];
  const nouns = ["Wolf", "Dragon", "Phoenix", "Tiger", "Hawk", "Serpent"];
  const numbers = Math.floor(100 + Math.random() * 900);

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${adj}-${noun}-${numbers}`;
}

function validateCharacter(data) {
  if (!data.characterName || data.characterName.trim().length < 2) {
    throw new Error("Character name must be at least 2 characters");
  }

  return true;
}

export { generateId, generateBackupCode, validateCharacter };
