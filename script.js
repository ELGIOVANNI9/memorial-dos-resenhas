
const STORAGE_KEY = "memorial-dos-resenhas-v1";

const formContainer = document.getElementById("form-container");
const form = document.getElementById("story-form");
const addButton = document.getElementById("add-button");
const cancelButton = document.getElementById("cancel-button");
const storyList = document.getElementById("story-list");
const searchInput = document.getElementById("search");
const total = document.getElementById("total");
const resultsLabel = document.getElementById("results-label");

let stories = loadStories();

document.getElementById("year").textContent = new Date().getFullYear();

function loadStories() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(story =>
      story &&
      typeof story.id === "string" &&
      typeof story.title === "string" &&
      typeof story.author === "string" &&
      typeof story.description === "string" &&
      typeof story.category === "string" &&
      typeof story.date === "string"
    ) : [];
  } catch {
    return [];
  }
}

function saveStories() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stories));
    return true;
  } catch {
    alert("Não foi possível salvar. O armazenamento do navegador pode estar cheio.");
    return false;
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createStoryCard(story) {
  const card = makeElement("article", "story-card");
  const top = makeElement("div", "card-top");
  const category = makeElement("span", "category", story.category);
  const date = makeElement("span", "card-date",
    new Date(story.date).toLocaleDateString("pt-BR"));

  const title = makeElement("h3", "", story.title);
  const description = makeElement("p", "description", story.description);
  const footer = makeElement("div", "card-footer");
  const author = makeElement("span", "", "ARQUIVADO POR: " + story.author);
  const deleteButton = makeElement("button", "delete-button", "EXCLUIR");

  deleteButton.type = "button";
  deleteButton.addEventListener("click", () => {
    const confirmed = confirm(
      "Tem certeza que deseja excluir esta resenha deste navegador?"
    );

    if (!confirmed) return;

    const previous = stories;
    stories = stories.filter(item => item.id !== story.id);

    if (!saveStories()) {
      stories = previous;
      return;
    }

    renderStories();
  });

  top.append(category, date);
  footer.append(author, deleteButton);
  card.append(top, title, description, footer);

  return card;
}

function renderStories() {
  const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");

  const filtered = stories.filter(story =>
    [story.title, story.author, story.description, story.category]
      .some(value => value.toLocaleLowerCase("pt-BR").includes(query))
  );

  total.textContent = stories.length;
  resultsLabel.textContent =
    `${filtered.length} ARQUIVO(S) ENCONTRADO(S)`;

  storyList.replaceChildren();

  if (filtered.length === 0) {
    const empty = makeElement("div", "empty-state");
    const heading = makeElement(
      "strong",
      "",
      query ? "NENHUMA RESENHA ENCONTRADA." : "O MEMORIAL ESTÁ VAZIO."
    );
    const message = makeElement(
      "p",
      "",
      query
        ? "Tente outra busca. Até o arquivo tem seus mistérios."
        : "Clique em + NOVA RESENHA para registrar a primeira atrocidade."
    );

    empty.append(heading, message);
    storyList.append(empty);
    return;
  }

  filtered.forEach(story => {
    storyList.append(createStoryCard(story));
  });
}

addButton.addEventListener("click", () => {
  formContainer.hidden = !formContainer.hidden;

  if (!formContainer.hidden) {
    document.getElementById("story-title").focus();
    formContainer.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

cancelButton.addEventListener("click", () => {
  form.reset();
  formContainer.hidden = true;
});

form.addEventListener("submit", event => {
  event.preventDefault();

  const story = {
    id: crypto.randomUUID(),
    title: document.getElementById("story-title").value.trim(),
    author: document.getElementById("story-author").value.trim(),
    category: document.getElementById("story-category").value,
    description: document.getElementById("story-description").value.trim(),
    date: new Date().toISOString()
  };

  if (!story.title || !story.author || !story.description) {
    alert("Preencha todos os campos antes de arquivar.");
    return;
  }

  stories.unshift(story);

  if (!saveStories()) {
    stories.shift();
    return;
  }

  form.reset();
  formContainer.hidden = true;
  searchInput.value = "";
  renderStories();

  document.getElementById("mural").scrollIntoView({
    behavior: "smooth"
  });
});

searchInput.addEventListener("input", renderStories);

renderStories();
