/* ============================================================
   SIBE STYLE — Espace fournisseur
   ============================================================ */

let ADMIN_PRODUCTS = [];
let ADMIN_CATEGORIES = [];
let pendingProductImageFile = null;
let pendingCategoryImageFile = null;

/* ================= AUTHENTIFICATION ================= */
auth.onAuthStateChanged((user) => {
  if (user) {
    document.getElementById("login-screen").classList.add("hidden");
    document.getElementById("admin-shell").classList.remove("hidden");
    document.getElementById("admin-user-email").textContent = user.email;
    initDashboard();
  } else {
    document.getElementById("login-screen").classList.remove("hidden");
    document.getElementById("admin-shell").classList.add("hidden");
  }
});

function doLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";
  auth.signInWithEmailAndPassword(email, pass).catch((e) => {
    errEl.textContent = translateAuthError(e.code);
  });
}
function doSignup() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.textContent = "";
  if (!email || pass.length < 6) {
    errEl.textContent = "Entrez un email valide et un mot de passe d'au moins 6 caractères.";
    return;
  }
  auth.createUserWithEmailAndPassword(email, pass).catch((e) => {
    errEl.textContent = translateAuthError(e.code);
  });
}
function doLogout() { auth.signOut(); }
function translateAuthError(code) {
  const map = {
    "auth/invalid-email": "Adresse email invalide.",
    "auth/user-not-found": "Aucun compte avec cet email.",
    "auth/wrong-password": "Mot de passe incorrect.",
    "auth/email-already-in-use": "Ce compte existe déjà — connectez-vous plutôt.",
    "auth/weak-password": "Mot de passe trop faible (6 caractères minimum).",
  };
  return map[code] || "Erreur : " + code;
}

/* ================= NAVIGATION ================= */
function switchTab(tab) {
  document.querySelectorAll(".admin-side nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
  document.getElementById("tab-" + tab).classList.remove("hidden");
  const titles = { commandes: "Commandes", produits: "Produits", categories: "Catégories", promotions: "Promotions", proverbes: "Proverbes" };
  document.getElementById("tab-title").textContent = titles[tab];
}

function initDashboard() {
  loadOrders();
  loadCategoriesAdmin();
  loadProductsAdmin();
  loadProverbsAdmin();
}

/* ================= COMMANDES ================= */
function loadOrders() {
  db.collection("commandes").orderBy("dateCreation", "desc").onSnapshot((snap) => {
    const rows = [];
    let total = 0, enAttente = 0, livrees = 0;
    snap.forEach((doc) => {
      const o = doc.data();
      total += 1;
      if (o.statut === "en_attente") enAttente += 1;
      if (o.statut === "livree") livrees += 1;

      const detail = o.type === "directe"
        ? (o.articles || []).map((a) => `${a.qty}× ${a.nom}`).join(", ")
        : `Base: ${o.modeleBase || "—"}<br><em style="color:#8a8578;">${(o.specifications || "").slice(0, 90)}</em>`;

      rows.push(`
        <tr>
          <td><strong>${o.nom || "—"}</strong><br><span style="color:#8a8578;">${o.telephone || ""}</span></td>
          <td>${o.type === "directe" ? "Directe" : "Sur mesure"}</td>
          <td>${detail}</td>
          <td>${o.montant ? fmtPriceAdmin(o.montant) + " FCFA" : "À définir"}</td>
          <td>
            <select class="status-select" onchange="updateOrderStatus('${doc.id}', this.value)">
              ${["en_attente","confirmee","en_cours","livree","annulee"].map((s) =>
                `<option value="${s}" ${o.statut === s ? "selected" : ""}>${statusLabel(s)}</option>`).join("")}
            </select>
          </td>
          <td>${o.dateCreation && o.dateCreation.toDate ? o.dateCreation.toDate().toLocaleDateString("fr-FR") : "—"}</td>
        </tr>`);
    });
    document.getElementById("orders-body").innerHTML = rows.join("") || `<tr><td colspan="6">Aucune commande pour le moment.</td></tr>`;
    renderStats(total, enAttente, livrees);
  }, (err) => console.error("Erreur chargement commandes", err));
}

function statusLabel(s) {
  return { en_attente: "En attente", confirmee: "Confirmée", en_cours: "En cours", livree: "Livrée", annulee: "Annulée" }[s] || s;
}
async function updateOrderStatus(id, statut) {
  try {
    await db.collection("commandes").doc(id).update({ statut });
    showToastAdmin("Statut mis à jour.");
  } catch (e) { console.error(e); showToastAdmin("Erreur de mise à jour."); }
}

function renderStats(total, enAttente, livrees) {
  document.getElementById("stat-row").innerHTML = `
    <div class="stat-card"><span>Total commandes</span><strong>${total}</strong></div>
    <div class="stat-card"><span>En attente</span><strong>${enAttente}</strong></div>
    <div class="stat-card"><span>Livrées</span><strong>${livrees}</strong></div>
    <div class="stat-card"><span>Produits au catalogue</span><strong>${ADMIN_PRODUCTS.length}</strong></div>`;
}

/* ================= PRODUITS ================= */
function previewImage(input, targetId) {
  const file = input.files[0];
  if (!file) return;
  pendingProductImageFile = file;
  const img = document.getElementById(targetId);
  img.src = URL.createObjectURL(file);
  img.classList.remove("hidden");
}

async function submitProduct(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Ajout en cours...";

  try {
    let imageUrl = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=800&auto=format&fit=crop";
    if (pendingProductImageFile) {
      imageUrl = await uploadImageToCloudinary(pendingProductImageFile, (pct) => {
        document.getElementById("upload-progress").textContent = `Envoi de l'image : ${pct}%`;
      });
    }
    await db.collection("produits").add({
      nom: form.nom.value,
      categorie: form.categorie.value,
      prix: Number(form.prix.value),
      stock: Number(form.stock.value || 0),
      description: form.description.value,
      image: imageUrl,
      enPromo: false,
      prixPromo: null,
      dateAjout: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showToastAdmin("Produit ajouté avec succès !");
    form.reset();
    document.getElementById("product-img-preview").classList.add("hidden");
    pendingProductImageFile = null;
    document.getElementById("upload-progress").textContent = "";
    loadProductsAdmin();
  } catch (err) {
    console.error(err);
    showToastAdmin("Erreur lors de l'ajout du produit.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Ajouter le produit";
  }
}

function loadProductsAdmin() {
  db.collection("produits").orderBy("dateAjout", "desc").onSnapshot((snap) => {
    ADMIN_PRODUCTS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderProductsAdminTable();
    renderPromoTable();
    document.getElementById("stat-row").children.length && (document.querySelectorAll(".stat-card strong")[3] && (document.querySelectorAll(".stat-card strong")[3].textContent = ADMIN_PRODUCTS.length));
  }, (err) => console.error(err));
}

function renderProductsAdminTable() {
  document.getElementById("products-body").innerHTML = ADMIN_PRODUCTS.map((p) => `
    <tr class="prod-row">
      <td style="display:flex;gap:10px;align-items:center;"><img src="${p.image}">${p.nom}</td>
      <td>${p.categorie || "—"}</td>
      <td><input type="number" value="${p.prix}" style="width:90px;" onchange="updateProductField('${p.id}','prix',Number(this.value))"></td>
      <td>${p.enPromo ? "Oui" : "Non"}</td>
      <td><input type="number" value="${p.stock || 0}" style="width:70px;" onchange="updateProductField('${p.id}','stock',Number(this.value))"></td>
      <td><button class="small-btn" onclick="deleteProduct('${p.id}')">Supprimer</button></td>
    </tr>`).join("") || `<tr><td colspan="6">Aucun produit. Ajoutez-en un ci-dessus.</td></tr>`;
}

async function updateProductField(id, field, value) {
  try {
    await db.collection("produits").doc(id).update({ [field]: value });
    showToastAdmin("Produit mis à jour.");
  } catch (e) { console.error(e); }
}
async function deleteProduct(id) {
  if (!confirm("Supprimer ce produit ?")) return;
  await db.collection("produits").doc(id).delete();
  showToastAdmin("Produit supprimé.");
}

/* ================= CATÉGORIES ================= */
function loadCategoriesAdmin() {
  db.collection("categories").onSnapshot((snap) => {
    ADMIN_CATEGORIES = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const select = document.getElementById("product-cat-select");
    select.innerHTML = (ADMIN_CATEGORIES.length ? ADMIN_CATEGORIES : [{nom:"T-shirts"},{nom:"Hoodies"},{nom:"Jeans"},{nom:"Cargo"},{nom:"Sneakers"},{nom:"Accessoires"}])
      .map((c) => `<option>${c.nom}</option>`).join("");
    document.getElementById("categories-body").innerHTML = ADMIN_CATEGORIES.map((c) => `
      <tr><td><img src="${c.image}" style="width:44px;height:44px;object-fit:cover;border-radius:6px;"></td>
      <td>${c.nom}</td><td><button class="small-btn" onclick="deleteCategory('${c.id}')">Supprimer</button></td></tr>`).join("")
      || `<tr><td colspan="3">Aucune catégorie personnalisée — les catégories par défaut sont utilisées sur le site.</td></tr>`;
  });
}
document.addEventListener("change", (e) => {
  if (e.target && e.target.id === "cat-image-input") pendingCategoryImageFile = e.target.files[0];
});
async function submitCategory(e) {
  e.preventDefault();
  const nom = document.getElementById("cat-nom").value;
  let imageUrl = "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=300&auto=format&fit=crop";
  try {
    if (pendingCategoryImageFile) imageUrl = await uploadImageToCloudinary(pendingCategoryImageFile);
    await db.collection("categories").add({ nom, image: imageUrl });
    showToastAdmin("Catégorie ajoutée.");
    e.target.reset();
    pendingCategoryImageFile = null;
  } catch (err) { console.error(err); showToastAdmin("Erreur lors de l'ajout de la catégorie."); }
}
async function deleteCategory(id) {
  if (!confirm("Supprimer cette catégorie ?")) return;
  await db.collection("categories").doc(id).delete();
}

/* ================= PROMOTIONS ================= */
function renderPromoTable() {
  document.getElementById("promo-body").innerHTML = ADMIN_PRODUCTS.map((p) => `
    <tr>
      <td>${p.nom}</td>
      <td>${fmtPriceAdmin(p.prix)} FCFA</td>
      <td><input type="number" value="${p.prixPromo || ""}" placeholder="Prix promo" style="width:110px;" onchange="updateProductField('${p.id}','prixPromo',Number(this.value))"></td>
      <td><input type="checkbox" ${p.enPromo ? "checked" : ""} onchange="updateProductField('${p.id}','enPromo', this.checked)"></td>
      <td></td>
    </tr>`).join("") || `<tr><td colspan="5">Ajoutez d'abord des produits.</td></tr>`;
}

/* ================= PROVERBES ================= */
function loadProverbsAdmin() {
  db.collection("proverbes").onSnapshot((snap) => {
    document.getElementById("proverb-count").textContent = snap.size;
    document.getElementById("proverbs-body").innerHTML = snap.docs.map((d) => `
      <tr><td>${d.data().texte}</td><td><button class="small-btn" onclick="deleteProverb('${d.id}')">Supprimer</button></td></tr>`).join("")
      || `<tr><td colspan="2">Aucun proverbe ajouté pour l'instant.</td></tr>`;
  });
}
async function submitProverb(e) {
  e.preventDefault();
  const text = document.getElementById("proverb-text").value.trim();
  if (!text) return;
  await db.collection("proverbes").add({ texte: text });
  document.getElementById("proverb-text").value = "";
  showToastAdmin("Proverbe ajouté.");
}
async function deleteProverb(id) {
  await db.collection("proverbes").doc(id).delete();
}

/* ================= UTIL ================= */
function fmtPriceAdmin(n) { return Number(n || 0).toLocaleString("fr-FR"); }
let toastTimerAdmin;
function showToastAdmin(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimerAdmin);
  toastTimerAdmin = setTimeout(() => t.classList.remove("show"), 2600);
}