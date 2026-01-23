const TEXTS = {
  creation: {
    title: 'Create character',
    form: {
      title: 'Form title placeholder',
    },
    submit: {
      title: 'Submit button placeholder',
      description: 'Submit form',
      button: 'submit'
    }
  }
};

export function renderCreation() {
  return `
    <section class="creation">
        <h2>${TEXTS.creation.title}</h2>
        ${renderCreationForm()}
        ${renderSubmitButton()}
    </section>
  `;
}

function renderCreationForm() {
    return `
        <form id='creation' name='creation' method='post'>
            ${TEXTS.creation.form.title}
                    <h3>Character name </h3>
        ${renderInputText('Character name', 'Enter name...', '', true, 'Ahani')}
        <h4>Attributes</h4>
            ${renderInputText("accurate", '5', 'attributes.primary.', true)}
            ${renderInputText("cunning", '5', 'attributes.primary.', true)}
            ${renderInputText("discreet", '5', 'attributes.primary.', true)}
            ${renderInputText("allure", '5', 'attributes.primary.', true)}
            ${renderInputText("quick", '5', 'attributes.primary.', true)}
            ${renderInputText("resolute", '5', 'attributes.primary.', true)}
            ${renderInputText("vigilant", '5', 'attributes.primary.', true)}
            ${renderInputText("strong", '5', 'attributes.primary.', true)}
        </form>
    `
}

function renderInputText(label, placeholder, group, isRequired = false, value = placeholder) {
    return `
        <label for='${formatHTMLLabel(label)}'>${label}</label>
        <input id='${formatHTMLLabel(label)}' name="${group}${formatHTMLLabel(label)}" ${isRequired ? "required" : ""} placeholder="${placeholder}" value="${value}" />
    `
}

function formatHTMLLabel(string) {
    const str = string.toLowerCase();

    return str.replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => {
        return chr.toUpperCase();
    });
}

function renderSubmitButton() {
    return `
        <button class='submit-btn' form='creation' type='submit'>${TEXTS.creation.submit.title}</button>
    `
}