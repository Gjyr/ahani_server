const TEXTS = {
  welcome: {
    title: "Character Builder",
    subtitle: "Welcome to our RPG system",
    article: {
      title: "NAGARA",
      welcomeText: "This here is a character builder for Nagara RPG. Welcome!",
      description:
        "If this isn&rsquo;t your first visit, yet you still see this page instead of your characters, try Recover button. Or contact me personally, that should work too.",
    },
    contacts: {
      wow: {
        label: "World of Warcraft",
        term: "EU &sol; Argent Dawn",
        url: "https://worldofwarcraft.blizzard.com/en-gb/character/eu/argent-dawn/genetta/",
        css: ["hintable", "interactable"],
        tooltip:
          "Find&nbsp;him&nbsp;on&nbsp;the&nbsp;official&nbsp;armory&nbsp;website",
        content: "Genetta",
      },
      discord: {
        label: "Discord",
        url: "https://worldofwarcraft.blizzard.com/en-gb/character/eu/argent-dawn/genetta/",
        css: ["hintable", "interactable", "copyable"],
        tooltip:
          "Click&nbsp;to&nbsp;copy&nbsp;that&nbsp;name&nbsp;to&nbsp;the&nbsp;clipboard",
        content: "black.feather",
      },
      pinterest: {
        label: "Pinterest",
        url: "https://www.pinterest.com/outofhisdepth/aesthetics/",
        css: ["hintable", "interactable"],
        tooltip: "Have&nbsp;a&nbsp;look&nbsp;at&nbsp;his&nbsp;board",
        content: "&sol;outofhisdepth",
      },
      flist: {},
    },
    create: {
      content: "CREATE",
      css: ["primary"],
      type: "button",
      action: "create",
      label: "Create new character",
    },
    recover: {
      content: "RECOVER",
      css: [],
      type: "button",
      action: "recover",
      label: "Invoke modal window to help recover own characters",
    },
  },
};

export function renderInitial() {
  return `
    ${renderWelcomeBlock()}

    ${renderContactsBlock()}

    ${renderMenuBlock()}

    ${addDialogContent()}
  `;
}

function renderWelcomeBlock() {
  return `
    <article>
      <h1>${TEXTS.welcome.article.title}</h1>

      <p>${TEXTS.welcome.article.welcomeText}</p>

      <p>${TEXTS.welcome.article.description}</p>
    </article>
  `;
}

function renderContactsBlock() {
  return `
    <aside>
      <dl>
        ${renderContactsRow("wow", true, true)}

        ${renderContactsRow("discord", false, false, 'data-clipboard="black.feather"')}

        ${renderContactsRow("pinterest", true, true)}
      </dl>
    </aside>
  `;
}

function renderMenuBlock() {
  return `
    <menu>
      ${renderCreateButton()}

      ${renderRecoverButton()}
    </menu>
  `;
}

function renderContactsRow(
  contactName,
  secondTerm = false,
  isLink = false,
  customAttribute = "",
) {
  return `
    <div id="contacts__${contactName}">
      <svg role="img" aria-label="${TEXTS.welcome.contacts[contactName].label} icon">
        <use href="/assets/icons/hero/icon-${contactName}.svg"></use>
      </svg>

      <dt>${TEXTS.welcome.contacts[contactName].label}</dt>
      ${secondTerm ? `<dt>${TEXTS.welcome.contacts[contactName].term}</dt>` : ""}
      <dd>
        <a
          ${isLink ? `href="${TEXTS.welcome.contacts[contactName].url}"` : ""}
          ${isLink ? `rel="author"` : ""}
          ${isLink ? `target="_blank"` : ""}
          class="${TEXTS.welcome.contacts[contactName].css.join(" ")}"
          data-tooltip="${TEXTS.welcome.contacts[contactName].tooltip}"
          ${customAttribute}
          >${TEXTS.welcome.contacts[contactName].content}</a
        >
      </dd>
    </div>
  `;
}

function renderCreateButton() {
  return `
    <button
      type="${TEXTS.welcome.create.type}"
      data-action="${TEXTS.welcome.create.action}"
      class="${TEXTS.welcome.create.css.join(" ")}"
      aria-label:"${TEXTS.welcome.create.label}"
    >
      <span>${TEXTS.welcome.create.content}</span>
    </button>
  `;
}

function renderRecoverButton() {
  return `
    <button
      type="${TEXTS.welcome.recover.type}"
      data-action="${TEXTS.welcome.recover.action}"
      command="show-modal"
      commandfor="recover"
      aria-label:"${TEXTS.welcome.recover.label}"
    >
      <span>${TEXTS.welcome.recover.content}</span
    </button>
  `;
}

function addDialogContent() {
  return `
    <form id='portal' name='recover' method='dialog'>
        Recover form placeholder
    </form>
  `;
}

//@TODO: add trusted types support on the client
function escapeHtml(unsafe) {
  return unsafe.replace(
    /[&<>"']/g,
    (m) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[m],
  );
}
