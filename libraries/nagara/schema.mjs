function createDefaultCharacter(
  playerId,
  characterName,
  playerName = "Unknown",
) {
  return {
    id: "", // by storage
    playerId,
    player: playerName,
    characterName,
    backupCode: "", // by storage
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),

    portrait: {
      path: "",
    },

    experience: { total: 0, unspent: 0 },
    corruption: { permanent: 0, temporary: 0 },

    attributes: {
      primary: {
        accurate: 5,
        cunning: 5,
        discreet: 5,
        allure: 5,
        quick: 5,
        resolute: 5,
        vigilant: 5,
        strong: 5,
      },
      secondary: {
        toughness: { max: 10, current: 10 },
        painThreshold: 7,
        corruptionThreshold: 7,
        defense: 0,
      },
    },

    // abilities, powers, boons, sins
    traits: [],

    equipment: {
      money: 0,
      weapons: [],
      ammunition: [],
      armor: {
        body: null,
        plug: [],
      },
      runes: [],
      professional: {
        assassin: [],
        utility: [],
      },
      inventory: {
        self: [],
        home: [],
      },
      artifacts: [],
    },

    assets: [],

    location: "",

    background: {
      race: "",
      shadow: "",
      age: 0,
      portrait: "",
      kinkList: [],
      journal: {
        open: [],
        done: [],
        rumours: [],
      },
      notes: [],
    },
  };
}

function validateCharacterData(data) {
  const errors = [];

  if (!data.characterName || data.characterName.trim().length < 2) {
    errors.push("Character name must be at least 2 characters");
  }

  if (data.characterName && data.characterName.length > 50) {
    errors.push("Character name must be less than 50 characters");
  }

  if (data.attributes && data.attributes.primary) {
    const primaryAttrs = [
      "accurate",
      "cunning",
      "discreet",
      "allure",
      "quick",
      "resolute",
      "vigilant",
      "strong",
    ];
    for (const attr of primaryAttrs) {
      if (
        data.attributes.primary[attr] !== undefined &&
        (data.attributes.primary[attr] < 5 ||
          data.attributes.primary[attr] > 15)
      ) {
        errors.push(`${attr} must be between 5 and 15`);
      }
    }
  }

  console.log("VALIDATION RESULTS:", errors);

  if (errors.length > 0) {
    throw new Error(errors.join(", "));
  }

  return true;
}

export { createDefaultCharacter, validateCharacterData };
