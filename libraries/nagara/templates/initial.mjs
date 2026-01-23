const TEXTS = {
  welcome: {
    title: 'Character Builder',
    subtitle: 'Welcome to our RPG system',
    create: {
      title: 'Create New Character',
      description: 'Start a brand new adventure',
      button: 'Create New'
    },
    recover: {
      title: 'Recover Character',
      description: 'Restore an existing character',
      button: 'Recover'
    }
  }
};

export function renderInitial() {
  return `
    <section class="initial">
    <!-- <h1>${TEXTS.welcome.title}</h1> -->
    <h2>${TEXTS.welcome.subtitle}</h2>
      ${renderCreateButton()}
      ${renderRecoverButton()}
    </section>

    ${addDialogContent()}
  `;
}

function renderCreateButton() {
  return `<button class="create-btn">Create New</button>`;
}

function renderRecoverButton() {
  return `<button class="recover-btn">Recover</button>`;
}

function addDialogContent() {
    return `
        <form id='portal' name='recover' method='dialog'>
            Recover form placeholder
        </form>
    `
}

//@TODO: add trusted types support on the client
function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  }[m]));
}