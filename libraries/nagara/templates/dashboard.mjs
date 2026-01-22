export function renderDashboard(characters) {
  return `
    <section class="dashboard">
    <h2>Your Characters</h2>
      ${renderCharacterList(characters)}
      ${renderCreateButton()}
    </section>

    ${addScriptElement(characters)}
  `;
}

function renderCharacterList(characters) {
  if (characters.length === 0) {
    return '<p class="empty-state">No characters yet. Create your first!</p>';
  }
  
  return `
    <ul class="characters">
      ${characters.map(character => `
        <li class="character-card" data-character-id="${character.id}">
          <h3>${escapeHtml(character.characterName)}</h3>
          <span class="level">Level ${calculateLevel(character)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function calculateLevel(character) {
  return "";
}

function renderCreateButton() {
  return `<button class="create-btn">Create New</button>`;
}

function addScriptElement(characters) {
  return `
    <script type="application/json">
      ${JSON.stringify(characters)}
    </script>
  `;
}

function escapeHtml(unsafe) {
  return unsafe.replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;'
  }[m]));
}