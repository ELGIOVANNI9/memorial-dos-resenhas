
const SUPABASE_URL = "https://rvkqqvawzoigdnfcdnkf.supabase.co";
const SUPABASE_KEY = "sb_publishable_zSFKBIrplBzqMNh-UpATcg_tnIrXdn3";
const ADMIN_UID = "868350a2-0387-4e8a-bb26-49eaf5cbb0e7";

const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const formContainer = document.getElementById("form-container");
const form = document.getElementById("story-form");
const addButton = document.getElementById("add-button");
const cancelButton = document.getElementById("cancel-button");
const storyList = document.getElementById("story-list");
const searchInput = document.getElementById("search");
const total = document.getElementById("total");
const resultsLabel = document.getElementById("results-label");

let stories = [];
let currentUser = null;
let isAdmin = false;

document.getElementById("year").textContent = new Date().getFullYear();

// Botão de login/logout
const authButton = document.createElement("button");
authButton.type = "button";
authButton.className = "add-button";
authButton.textContent = "ENTRAR COMO ADMINISTRADOR";
addButton.parentElement.insertBefore(authButton, addButton);

// Painel de login
const loginPanel = document.createElement("div");
loginPanel.className = "form-container";
loginPanel.hidden = true;
loginPanel.innerHTML = `
  <form id="admin-login-form">
    <label for="admin-email">E-mail do administrador</label>
    <input id="admin-email" type="email" autocomplete="username"
      placeholder="Seu e-mail do Supabase" required>

    <label for="admin-password">Senha</label>
    <input id="admin-password" type="password"
      autocomplete="current-password" placeholder="Sua senha" required>

    <p id="login-message" role="status"></p>

    <div class="form-actions">
      <button type="button" id="login-cancel" class="cancel-button">
        CANCELAR
      </button>
      <button type="submit" class="main-button">ENTRAR</button>
    </div>
  </form>
`;
formContainer.parentElement.insertBefore(loginPanel, formContainer);

const loginForm = loginPanel.querySelector("#admin-login-form");
const loginMessage = loginPanel.querySelector("#login-message");

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatDate(value) {
  if (!value) return "DATA NÃO INFORMADA";

  const date = new Date(value + (value.length === 10 ? "T12:00:00" : ""));
  return Number.isNaN(date.getTime())
    ? "DATA NÃO INFORMADA"
    : date.toLocaleDateString("pt-BR");
}

function mapStory(row) {
  return {
    id: row.id,
    title: row.titulo,
    author: Array.isArray(row.envolvidos)
      ? row.envolvidos.join(", ")
      : "",
    category: row.categoria,
    description: row.descricao,
    date: row.data_resenha || row.created_at
  };
}

async function loadStories() {
  resultsLabel.textContent = "CARREGANDO ARQUIVOS...";

  const { data, error } = await db
    .from("resenhas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar resenhas:", error);
    stories = [];
    renderStories();
    resultsLabel.textContent = "ERRO AO CARREGAR. RECARREGUE A PÁGINA.";
    return;
  }

  stories = (data || []).map(mapStory);
  renderStories();
}

function updateAuthUI() {
  isAdmin = currentUser?.id === ADMIN_UID;

  addButton.hidden = !isAdmin;
  formContainer.hidden = true;
  loginPanel.hidden = true;

  authButton.textContent = isAdmin
    ? "SAIR DA CONTA ADMINISTRADORA"
    : "ENTRAR COMO ADMINISTRADOR";

  authButton.setAttribute("aria-label", authButton.textContent);
}

function createStoryCard(story) {
  const card = makeElement("article", "story-card");
  const top = makeElement("div", "card-top");
  const category = makeElement("span", "category", story.category);
  const date = makeElement("span", "card-date", formatDate(story.date));
  const title = makeElement("h3", "", story.title);
  const description = makeElement("p", "description", story.description);
  const footer = makeElement("div", "card-footer");
  const author = makeElement("span", "", "ENVOLVIDOS: " + story.author);

  top.append(category, date);
  footer.append(author);

  if (isAdmin) {
    const deleteButton = makeElement("button", "delete-button", "EXCLUIR");
    deleteButton.type = "button";

    deleteButton.addEventListener("click", async () => {
      if (!isAdmin) return;

      const confirmed = confirm(
        "Tem certeza que deseja excluir esta resenha do memorial público?"
      );

      if (!confirmed) return;

      deleteButton.disabled = true;

      const { error } = await db
        .from("resenhas")
        .delete()
        .eq("id", story.id);

      if (error) {
        console.error("Erro ao excluir:", error);
        alert("Não foi possível excluir. Confira se você continua conectado.");
        deleteButton.disabled = false;
        return;
      }

      await loadStories();
    });

    footer.append(deleteButton);
  }

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
  resultsLabel.textContent = `${filtered.length} ARQUIVO(S) ENCONTRADO(S)`;
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
        : isAdmin
          ? "Clique em + NOVA RESENHA para registrar a primeira atrocidade."
          : "Ainda não há resenhas arquivadas."
    );

    empty.append(heading, message);
    storyList.append(empty);
    return;
  }

  filtered.forEach(story => storyList.append(createStoryCard(story)));
}

authButton.addEventListener("click", async () => {
  if (isAdmin) {
    const { error } = await db.auth.signOut();

    if (error) {
      alert("Não foi possível sair da conta.");
      return;
    }

    currentUser = null;
    updateAuthUI();
    renderStories();
    return;
  }

  loginPanel.hidden = !loginPanel.hidden;
  formContainer.hidden = true;

  if (!loginPanel.hidden) {
    document.getElementById("admin-email").focus();
    loginPanel.scrollIntoView({ behavior: "smooth", block: "center" });
  }
});

loginPanel.querySelector("#login-cancel").addEventListener("click", () => {
  loginForm.reset();
  loginMessage.textContent = "";
  loginPanel.hidden = true;
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = "Verificando acesso...";

  const email = document.getElementById("admin-email").value.trim();
  const password = document.getElementById("admin-password").value;

  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    loginMessage.textContent = "Login falhou. Confira o e-mail e a senha.";
    return;
  }

  if (data.user.id !== ADMIN_UID) {
    await db.auth.signOut();
    currentUser = null;
    updateAuthUI();
    loginMessage.textContent = "Esta conta não tem permissão de administrador.";
    loginPanel.hidden = false;
    return;
  }

  currentUser = data.user;
  updateAuthUI();
  await loadStories();
});

addButton.addEventListener("click", () => {
  if (!isAdmin) return;

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

form.addEventListener("submit", async event => {
  event.preventDefault();

  if (!isAdmin || currentUser?.id !== ADMIN_UID) {
    alert("Você precisa entrar com a conta administradora.");
    return;
  }

  const title = document.getElementById("story-title").value.trim();
  const author = document.getElementById("story-author").value.trim();
  const category = document.getElementById("story-category").value;
  const description = document.getElementById("story-description").value.trim();

  if (!title || !author || !description) {
    alert("Preencha todos os campos antes de arquivar.");
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  const { error } = await db.from("resenhas").insert({
    titulo: title,
    descricao: description,
    categoria: category,
    envolvidos: author.split(",").map(name => name.trim()).filter(Boolean),
    data_resenha: new Date().toLocaleDateString("en-CA"),
    video_url: null
  });

  submitButton.disabled = false;

  if (error) {
    console.error("Erro ao salvar resenha:", error);
    alert("Não foi possível salvar a resenha. Confira sua conexão e as políticas do Supabase.");
    return;
  }

  form.reset();
  formContainer.hidden = true;
  searchInput.value = "";

  await loadStories();

  document.getElementById("mural").scrollIntoView({
    behavior: "smooth"
  });
});

searchInput.addEventListener("input", renderStories);

async function initialize() {
  const { data, error } = await db.auth.getSession();

  if (error) {
    console.error("Erro ao verificar sessão:", error);
  }

  currentUser = data?.session?.user || null;
  updateAuthUI();
  await loadStories();
}

initialize();
