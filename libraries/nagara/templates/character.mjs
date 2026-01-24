const TEXTS = {
  character: {
    title: "Character name",
    form: {
      title: "Your character",
    },
    submit: {
      title: "Edit character",
      description: "Edit form",
      button: "submit",
    },
  },
};

export function renderCharacter(character) {
  return `
    <section class="character">
        <h2>${character.characterName}</h2>
        ${renderCharacterForm(character)}
        ${renderEditButton()}
    </section>
  `;
}

function renderCharacterForm(character) {
  return `
        <form id="character" name="character" method="post">
            ${TEXTS.character.form.title}
            <h3>${TEXTS.character.title}</h3>
        ${renderInputText(character.characterName, "Enter name...", "", true, true, "Ahani")}
        <h4>Attributes</h4>
            ${renderInputText("accurate", `${character.attributes.primary.accurate}`, "attributes.primary.", true, true)}
            ${renderInputText("cunning", `${character.attributes.primary.cunning}`, "attributes.primary.", true, true)}
            ${renderInputText("discreet", `${character.attributes.primary.discreet}`, "attributes.primary.", true, true)}
            ${renderInputText("allure", `${character.attributes.primary.allure}`, "attributes.primary.", true, true)}
            ${renderInputText("quick", `${character.attributes.primary.quick}`, "attributes.primary.", true, true)}
            ${renderInputText("resolute", `${character.attributes.primary.resolute}`, "attributes.primary.", true, true)}
            ${renderInputText("vigilant", `${character.attributes.primary.vigilant}`, "attributes.primary.", true, true)}
            ${renderInputText("strong", `${character.attributes.primary.strong}`, "attributes.primary.", true, true)}
        </form>
    `;
}

function renderInputText(
  label,
  placeholder,
  group,
  isRequired = false,
  disabled = false,
  value = placeholder,
) {
  return `
        <label for="${formatHTMLLabel(label)}">${label}</label>
        <input id="${formatHTMLLabel(label)}" name="${group}${formatHTMLLabel(label)}" ${isRequired ? "required" : ""} placeholder="${placeholder}" value="${value}" ${disabled ? "readonly" : ""} />
    `;
}

function formatHTMLLabel(string) {
  const str = string.toLowerCase();

  return str.replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => {
    return chr.toUpperCase();
  });
}

function renderEditButton() {
  return `
        <button class="edit-btn" form="character" type="${TEXTS.character.submit.button}">${TEXTS.character.submit.title}</button>
    `;
}
