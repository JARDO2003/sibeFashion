/* ============================================================
   SIBE STYLE — Logique principale de la boutique
   ============================================================ */

/* ---------- Produits de démonstration (repli si Firestore est vide) ---------- */
const DEMO_PRODUCTS = [
  { id: "demo1", nom: "T-shirt Oversize Noir", prix: 19900, categorie: "T-shirts",
    image: "https://images.unsplash.com/photo-1503341504253-dff4815485f1?q=80&w=800&auto=format&fit=crop" },
  { id: "demo2", nom: "Hoodie Chaotic Marron", prix: 29900, categorie: "Hoodies",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=800&auto=format&fit=crop" },
  { id: "demo3", nom: "Jean Baggy Bleu Clair", prix: 24900, categorie: "Jeans",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop" },
  { id: "demo4", nom: "Cargo Poches Noir", prix: 22900, categorie: "Cargo",
    image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=800&auto=format&fit=crop" },
  { id: "demo5", nom: "Sneakers 530 Blanc", prix: 39900, categorie: "Sneakers",
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=800&auto=format&fit=crop" },
];

const DEMO_CATEGORIES = [
  { nom: "T-shirts", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop" },
  { nom: "Hoodies", image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=300&auto=format&fit=crop" },
  { nom: "Jeans", image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=300&auto=format&fit=crop" },
  { nom: "Cargo", image: "https://images.unsplash.com/photo-1517438476312-10d79c077509?q=80&w=300&auto=format&fit=crop" },
  { nom: "Sneakers", image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=300&auto=format&fit=crop" },
  { nom: "Accessoires", image: "https://images.unsplash.com/photo-1521369909029-2afed882baee?q=80&w=300&auto=format&fit=crop" },
];

const LOOKBOOK_IMAGES = [
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=500&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=500&auto=format&fit=crop",
];

let PRODUCTS = [];
let CART = JSON.parse(sessionStorage.getItem("sibe_cart") || "[]");
let selectedProductForChat = null;

/* ================= SPLASH SCREEN ================= */
(async function initSplash() {
  const proverbEl = document.getElementById("splash-proverb");
  try {
    const all = await loadAllProverbs();
    proverbEl.textContent = getRandomProverb(all);
  } catch (e) {
    proverbEl.textContent = getRandomProverb(PROVERBS_LOCAL);
  }
})();

function hideSplash() {
  document.getElementById("splash").classList.add("hidden");
  sessionStorage.setItem("sibe_splash_seen", "1");
}
document.getElementById("splash-enter").addEventListener("click", hideSplash);
// Auto-fermeture après le chargement (durée du loader)
setTimeout(hideSplash, 4500);

/* ================= HERO SLIDER (léger) ================= */
const HERO_SLIDES = [
  "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1516257984-b1b4d707412e?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=1200&auto=format&fit=crop",
];
let heroIdx = 0;
function renderHero() {
  document.querySelector(".hero-image img").src = HERO_SLIDES[heroIdx];
  document.getElementById("hero-idx").textContent = heroIdx + 1;
}
function heroNext() { heroIdx = (heroIdx + 1) % HERO_SLIDES.length; renderHero(); }
function heroPrev() { heroIdx = (heroIdx - 1 + HERO_SLIDES.length) % HERO_SLIDES.length; renderHero(); }

/* ================= CHARGEMENT CATALOGUE (Firestore + repli démo) ================= */
async function loadCategories() {
  const grid = document.getElementById("cat-grid");
  let cats = DEMO_CATEGORIES;
  try {
    const snap = await db.collection("categories").get();
    if (!snap.empty) cats = snap.docs.map((d) => d.data());
  } catch (e) { console.warn("Firestore catégories indisponible, repli démo.", e); }

  grid.innerHTML = cats.map((c) => `
    <div class="cat-card" onclick="filterByCategory('${c.nom}')">
      <div class="cat-thumb"><img src="${c.image}" alt="${c.nom}"></div>
      <span>${c.nom}</span>
    </div>`).join("");
}

async function loadProducts() {
  const grid = document.getElementById("prod-grid");
  try {
    const snap = await db.collection("produits").orderBy("dateAjout", "desc").limit(10).get();
    PRODUCTS = snap.empty ? DEMO_PRODUCTS : snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("Firestore produits indisponible, repli démo.", e);
    PRODUCTS = DEMO_PRODUCTS;
  }
  renderProducts(PRODUCTS);
}

function renderProducts(list) {
  const grid = document.getElementById("prod-grid");
  if (!list.length) { grid.innerHTML = `<p style="color:#999;">Aucun produit pour le moment.</p>`; return; }
  grid.innerHTML = list.map((p) => {
    const promo = p.enPromo && p.prixPromo;
    const price = promo
      ? `<span class="old">${fmtPrice(p.prix)}</span>${fmtPrice(p.prixPromo)}`
      : fmtPrice(p.prix);
    return `
    <div class="prod-card">
      <div class="prod-thumb" onclick="openProductModal('${p.id}')">
        ${promo ? `<span class="promo-badge">PROMO</span>` : ""}
        <button class="wish-btn" onclick="event.stopPropagation(); showToast('Ajouté aux favoris ❤')">♡</button>
        <img src="${p.image}" alt="${p.nom}">
      </div>
      <h5 class="prod-name">${p.nom}</h5>
      <p class="prod-price">${price} FCFA</p>
      <div class="prod-actions">
        <button class="btn-add" onclick="addToCart('${p.id}')">🛍 Ajouter au panier</button>
      </div>
    </div>`;
  }).join("");
}

function filterByCategory(cat) {
  const filtered = PRODUCTS.filter((p) => p.categorie === cat);
  renderProducts(filtered.length ? filtered : PRODUCTS);
  document.getElementById("nouveautes").scrollIntoView({ behavior: "smooth" });
}

function renderLookbook() {
  document.getElementById("lookbook-grid").innerHTML = LOOKBOOK_IMAGES
    .map((src) => `<img src="${src}" alt="Look SIBE STYLE">`).join("");
}

function fmtPrice(n) { return Number(n || 0).toLocaleString("fr-FR"); }

/* ================= PRODUIT — MODAL DÉTAIL ================= */
function openProductModal(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  document.getElementById("product-modal-body").innerHTML = `
    <img src="${p.image}" style="width:100%;border-radius:4px;max-height:340px;object-fit:cover;margin-bottom:16px;">
    <h3>${p.nom}</h3>
    <p class="prod-price" style="font-size:16px;">${fmtPrice(p.enPromo ? p.prixPromo : p.prix)} FCFA</p>
    <p style="color:#6f6a5e;font-size:14px;line-height:1.5;">${p.description || "Pièce streetwear premium SIBE STYLE, coupe soignée et matières durables."}</p>
    <div style="display:flex;gap:10px;margin-top:18px;">
      <button class="btn btn-primary" style="flex:1;" onclick="addToCart('${p.id}'); closeModal('product-modal');">Ajouter au panier</button>
      <button class="btn btn-secondary" style="flex:1;" onclick="closeModal('product-modal'); startChatWithProduct('${p.id}');">Personnaliser ce modèle</button>
    </div>`;
  document.getElementById("product-modal").classList.add("open");
}
function closeModal(id) { document.getElementById(id).classList.remove("open"); }

/* ================= PANIER ================= */
function saveCart() { sessionStorage.setItem("sibe_cart", JSON.stringify(CART)); renderCart(); }

function addToCart(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  const existing = CART.find((c) => c.id === id);
  if (existing) existing.qty += 1;
  else CART.push({ id: p.id, nom: p.nom, prix: p.enPromo ? p.prixPromo : p.prix, image: p.image, qty: 1 });
  saveCart();
  showToast(`${p.nom} ajouté au panier`);
}
function changeQty(id, delta) {
  const item = CART.find((c) => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) CART = CART.filter((c) => c.id !== id);
  saveCart();
}

function renderCart() {
  const body = document.getElementById("cart-body");
  const countEl = document.getElementById("cart-count");
  const totalEl = document.getElementById("cart-total");
  const totalQty = CART.reduce((s, c) => s + c.qty, 0);
  countEl.textContent = totalQty;
  if (!CART.length) {
    body.innerHTML = `<p style="color:#999;font-size:13px;">Votre panier est vide.</p>`;
    totalEl.textContent = "0 FCFA";
    return;
  }
  body.innerHTML = CART.map((c) => `
    <div class="cart-item">
      <img src="${c.image}" alt="${c.nom}">
      <div class="info">
        <h5>${c.nom}</h5>
        <span style="font-size:12px;color:#6f6a5e;">${fmtPrice(c.prix)} FCFA</span>
        <div class="qty-row">
          <button onclick="changeQty('${c.id}',-1)">−</button>
          <span>${c.qty}</span>
          <button onclick="changeQty('${c.id}',1)">+</button>
        </div>
      </div>
    </div>`).join("");
  const total = CART.reduce((s, c) => s + c.prix * c.qty, 0);
  totalEl.textContent = fmtPrice(total) + " FCFA";
}

function openCart() { document.getElementById("cart-overlay").classList.add("open"); document.getElementById("cart-drawer").classList.add("open"); }
function closeCart() { document.getElementById("cart-overlay").classList.remove("open"); document.getElementById("cart-drawer").classList.remove("open"); }
document.getElementById("cart-btn").addEventListener("click", openCart);

/* ================= CHECKOUT — commande directe ================= */
function openCheckout() {
  if (!CART.length) { showToast("Votre panier est vide."); return; }
  closeCart();
  document.getElementById("checkout-modal").classList.add("open");
}

async function submitDirectOrder(e) {
  e.preventDefault();
  const form = e.target;
  const total = CART.reduce((s, c) => s + c.prix * c.qty, 0);
  const commande = {
    type: "directe",
    articles: CART.map((c) => ({ produitId: c.id, nom: c.nom, prix: c.prix, qty: c.qty })),
    nom: form.nom.value,
    telephone: form.telephone.value,
    adresse: form.adresse.value,
    paiement: form.paiement.value,
    montant: total,
    statut: "en_attente",
    dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await db.collection("commandes").add(commande);
    showToast("Commande envoyée ! Nous vous contactons très vite.");
    CART = []; saveCart();
    closeModal("checkout-modal");
    form.reset();
  } catch (err) {
    console.error(err);
    showToast("Erreur lors de l'envoi. Réessayez.");
  }
}

/* ================= TOAST ================= */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2600);
}

/* ================================================================
   CHATBOT — Commande personnalisée / sur mesure
   L'utilisatrice peut :
   1) Décrire librement ce qu'elle veut (texte libre)
   2) Choisir un modèle existant puis cliquer "Spécifications" pour
      ajouter des options (tissu, taille, couleur, broderie, délai...)
   ================================================================ */
let chatState = { step: "menu", draft: {} };

function openChatbot() {
  document.getElementById("chatbot-panel").classList.add("open");
  document.getElementById("chatbot-launcher").style.display = "none";
  if (!document.getElementById("chat-body").childElementCount) startChat();
}
function closeChatbot() {
  document.getElementById("chatbot-panel").classList.remove("open");
  document.getElementById("chatbot-launcher").style.display = "flex";
}

function chatAppend(html, who) {
  const body = document.getElementById("chat-body");
  const div = document.createElement("div");
  div.className = `chat-msg ${who}`;
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
}
function chatAppendRaw(node) {
  const body = document.getElementById("chat-body");
  body.appendChild(node);
  body.scrollTop = body.scrollHeight;
}

function startChat() {
  chatState = { step: "menu", draft: {} };
  chatAppend("Bonjour 👋 Je suis l'assistant SIBE STYLE. Comment voulez-vous procéder pour votre commande sur mesure ?", "bot");
  const opts = document.createElement("div");
  opts.className = "chat-msg bot";
  opts.innerHTML = `<div class="chat-options">
      <button onclick="chatChooseFreeText()">✍️ Je décris ce que je veux</button>
      <button onclick="chatChooseModel()">👕 Choisir un modèle existant</button>
    </div>`;
  chatAppendRaw(opts);
}

function startChatWithProduct(id) {
  openChatbot();
  const p = PRODUCTS.find((x) => x.id === id);
  if (p) selectProductInChat(p);
}

function chatChooseFreeText() {
  chatState.step = "free_text";
  chatAppend("Décrivez librement le vêtement que vous voulez : type, tissu, couleur, taille, inspiration... Je note tout 📝", "bot");
}

function chatChooseModel() {
  chatState.step = "pick_model";
  chatAppend("Voici quelques modèles de notre collection. Cliquez sur celui qui vous plaît :", "bot");
  const wrap = document.createElement("div");
  wrap.className = "chat-msg bot";
  const list = (PRODUCTS.length ? PRODUCTS : DEMO_PRODUCTS).slice(0, 4);
  wrap.innerHTML = `<div class="chat-product-pick">
    ${list.map((p) => `
      <button class="cpp" onclick='selectProductInChat(${JSON.stringify(p).replace(/'/g, "&#39;")})'>
        <img src="${p.image}" alt="${p.nom}"><span>${p.nom}</span>
      </button>`).join("")}
  </div>`;
  chatAppendRaw(wrap);
}

function selectProductInChat(p) {
  selectedProductForChat = p;
  chatState.draft.modeleBase = p.nom;
  chatState.draft.modeleImage = p.image;
  chatAppend(`J'ai choisi : <strong>${p.nom}</strong>`, "user");
  chatState.step = "ask_specs";
  chatAppend("Très bon choix ! Voulez-vous ajouter des spécifications (taille, couleur, tissu, broderie, options) à ce modèle ?", "bot");
  const opts = document.createElement("div");
  opts.className = "chat-msg bot";
  opts.innerHTML = `<div class="chat-options">
      <button onclick="chatAskSpecs()">⚙️ Spécifications</button>
      <button onclick="chatSkipSpecs()">➡️ Continuer sans options</button>
    </div>`;
  chatAppendRaw(opts);
}

function chatAskSpecs() {
  chatState.step = "collect_specs";
  chatAppend("Parfait. Décrivez vos options souhaitées (ex : taille M, couleur bleu marine, broderie initiales 'AK', tissu coton lourd, délai souhaité...) :", "bot");
}
function chatSkipSpecs() {
  chatState.step = "contact_info";
  chatState.draft.specifications = "Aucune spécification particulière — modèle standard.";
  chatAppend("D'accord, on garde le modèle tel quel.", "user");
  chatAskContact();
}
function chatAskContact() {
  chatAppend("Pour finaliser, donnez-moi : votre nom, votre numéro de téléphone et votre ville/adresse de livraison (en un seul message, séparés par des virgules).", "bot");
}

async function sendChatText() {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  chatAppend(text, "user");
  input.value = "";

  switch (chatState.step) {
    case "free_text":
      chatState.draft.specifications = text;
      chatState.draft.modeleBase = "Description libre";
      chatState.step = "contact_info";
      chatAppend("Merci ! J'ai bien noté votre description. 👍", "bot");
      chatAskContact();
      break;

    case "collect_specs":
      chatState.draft.specifications = text;
      chatState.step = "contact_info";
      chatAppend("Merci, vos spécifications sont enregistrées. 👍", "bot");
      chatAskContact();
      break;

    case "contact_info":
      await finalizeCustomOrder(text);
      break;

    default:
      chatAppend("Cliquez sur une option ci-dessus pour commencer, ou choisissez comment vous voulez commander 🙂", "bot");
      const opts = document.createElement("div");
      opts.className = "chat-msg bot";
      opts.innerHTML = `<div class="chat-options">
          <button onclick="chatChooseFreeText()">✍️ Je décris ce que je veux</button>
          <button onclick="chatChooseModel()">👕 Choisir un modèle existant</button>
        </div>`;
      chatAppendRaw(opts);
  }
}

async function finalizeCustomOrder(contactLine) {
  const parts = contactLine.split(",").map((s) => s.trim());
  const commande = {
    type: "personnalisee",
    modeleBase: chatState.draft.modeleBase || "Description libre",
    modeleImage: chatState.draft.modeleImage || null,
    specifications: chatState.draft.specifications || "",
    nom: parts[0] || contactLine,
    telephone: parts[1] || "",
    adresse: parts.slice(2).join(", ") || "",
    contactBrut: contactLine,
    statut: "en_attente",
    montant: null,
    dateCreation: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    await db.collection("commandes").add(commande);
    chatAppend("🎉 Votre commande sur mesure a bien été envoyée ! Notre équipe vous contacte très vite pour confirmer les détails et le prix.", "bot");
    chatState = { step: "done", draft: {} };
  } catch (err) {
    console.error(err);
    chatAppend("Une erreur est survenue lors de l'envoi. Réessayez dans un instant.", "bot");
  }
}

/* ================= INIT ================= */
renderHero();
renderLookbook();
renderCart();
loadCategories();
loadProducts();