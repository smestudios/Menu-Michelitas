const firebaseConfig = window.__FIREBASE_CONFIG__;

const state = {
  sections: [],
  products: [],
  firestoreReady: false,
};

const menuGrid = document.querySelector("#menu-grid");
const panel = document.querySelector("#admin-panel");
const sectionForm = document.querySelector("#section-form");
const sectionList = document.querySelector("#section-list");
const productForm = document.querySelector("#product-form");
const productList = document.querySelector("#product-list");
const sectionSelect = document.querySelector("#product-section");
const sectionTemplate = document.querySelector("#section-template");
const productTemplate = document.querySelector("#product-template");

let db;
let addDoc;
let collection;
let deleteDoc;
let doc;
let getDocs;
let getFirestore;
let initializeApp;
let onSnapshot;
let orderBy;
let query;
let serverTimestamp;

function byOrder(a, b) {
  return (a.order ?? 9999) - (b.order ?? 9999);
}

function nowStamp() {
  return new Date().toISOString();
}

function ensureFallbackData() {
  if (!state.sections.length) {
    state.sections = [
      { id: crypto.randomUUID(), name: "Clásicos", order: 0 },
      { id: crypto.randomUUID(), name: "Tikis", order: 1 },
      { id: crypto.randomUUID(), name: "Vinos", order: 2 },
    ];
  }
}

function persistLocal() {
  localStorage.setItem("menuSections", JSON.stringify(state.sections));
  localStorage.setItem("menuProducts", JSON.stringify(state.products));
}

function loadLocal() {
  state.sections = JSON.parse(localStorage.getItem("menuSections") || "[]");
  state.products = JSON.parse(localStorage.getItem("menuProducts") || "[]");
  ensureFallbackData();
  persistLocal();
  renderAll();
}

function renderAll() {
  renderMenu();
  renderAdminSections();
  renderAdminProducts();
  fillSectionSelect();
}

function renderMenu() {
  menuGrid.innerHTML = "";
  [...state.sections].sort(byOrder).forEach((section) => {
    const node = sectionTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector(".menu-section__title").textContent = section.name;

    const productsWrap = node.querySelector(".menu-products");
    const rows = state.products
      .filter((p) => p.sectionId === section.id)
      .sort(byOrder);

    if (!rows.length) {
      const empty = document.createElement("p");
      empty.textContent = "Sin productos todavía.";
      empty.className = "menu-item__desc";
      productsWrap.append(empty);
    } else {
      rows.forEach((product) => {
        const productNode = productTemplate.content.firstElementChild.cloneNode(true);
        productNode.querySelector(".menu-item__name").textContent = product.name;
        productNode.querySelector(".menu-item__desc").textContent = product.description || "";
        productNode.querySelector(".menu-item__price").textContent = product.price || "";
        productsWrap.append(productNode);
      });
    }

    menuGrid.append(node);
  });
}

function fillSectionSelect() {
  sectionSelect.innerHTML = "";
  [...state.sections].sort(byOrder).forEach((s) => {
    const option = document.createElement("option");
    option.value = s.id;
    option.textContent = s.name;
    sectionSelect.append(option);
  });
}

function renderAdminSections() {
  sectionList.innerHTML = "";
  [...state.sections].sort(byOrder).forEach((section) => {
    const li = document.createElement("li");
    li.className = "admin-row";
    li.innerHTML = `<span>${section.name}</span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Eliminar";
    button.addEventListener("click", () => removeSection(section.id));
    li.append(button);
    sectionList.append(li);
  });
}

function renderAdminProducts() {
  productList.innerHTML = "";
  state.products.forEach((product) => {
    const section = state.sections.find((s) => s.id === product.sectionId);
    const li = document.createElement("li");
    li.className = "admin-row";
    li.innerHTML = `<span><strong>${product.name}</strong><br><small>${section?.name || "Sin sección"}</small></span>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Eliminar";
    button.addEventListener("click", () => removeProduct(product.id));
    li.append(button);
    productList.append(li);
  });
}

async function addSection(name) {
  const payload = {
    name,
    order: state.sections.length,
    createdAt: state.firestoreReady ? serverTimestamp() : nowStamp(),
  };

  if (state.firestoreReady) {
    await addDoc(collection(db, "sections"), payload);
    return;
  }

  state.sections.push({ id: crypto.randomUUID(), ...payload });
  persistLocal();
  renderAll();
}

async function removeSection(id) {
  if (state.firestoreReady) {
    await deleteDoc(doc(db, "sections", id));
    const attached = state.products.filter((p) => p.sectionId === id);
    await Promise.all(attached.map((p) => deleteDoc(doc(db, "products", p.id))));
    return;
  }

  state.sections = state.sections.filter((s) => s.id !== id);
  state.products = state.products.filter((p) => p.sectionId !== id);
  persistLocal();
  renderAll();
}

async function addProduct(form) {
  const payload = {
    sectionId: form.sectionId,
    name: form.name,
    description: form.description,
    price: form.price,
    order: state.products.filter((p) => p.sectionId === form.sectionId).length,
    createdAt: state.firestoreReady ? serverTimestamp() : nowStamp(),
  };

  if (state.firestoreReady) {
    await addDoc(collection(db, "products"), payload);
    return;
  }

  state.products.push({ id: crypto.randomUUID(), ...payload });
  persistLocal();
  renderAll();
}

async function removeProduct(id) {
  if (state.firestoreReady) {
    await deleteDoc(doc(db, "products", id));
    return;
  }

  state.products = state.products.filter((p) => p.id !== id);
  persistLocal();
  renderAll();
}

function setupHotkey() {
  window.addEventListener("keydown", (event) => {
    if (event.ctrlKey && event.key.toLowerCase() === "r") {
      event.preventDefault();
      if (panel.open) {
        panel.close();
      } else {
        panel.showModal();
      }
    }
  });
}

function bindForms() {
  sectionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.querySelector("#section-name").value.trim();
    if (!name) return;
    await addSection(name);
    sectionForm.reset();
  });

  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = {
      sectionId: sectionSelect.value,
      name: document.querySelector("#product-name").value.trim(),
      description: document.querySelector("#product-description").value.trim(),
      price: document.querySelector("#product-price").value.trim(),
    };

    if (!form.sectionId || !form.name) return;
    await addProduct(form);
    productForm.reset();
  });
}

function renderConfigError(msg) {
  const p = document.createElement("p");
  p.className = "error";
  p.textContent = msg;
  document.querySelector(".hero").append(p);
}

function listenFirestore() {
  const sectionsQ = query(collection(db, "sections"), orderBy("order", "asc"));
  const productsQ = query(collection(db, "products"), orderBy("order", "asc"));

  onSnapshot(sectionsQ, (snapshot) => {
    state.sections = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  });

  onSnapshot(productsQ, (snapshot) => {
    state.products = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderAll();
  });
}

async function loadFirebaseSdk() {
  const [{ initializeApp: initApp }, firestore] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/10.12.4/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js"),
  ]);

  initializeApp = initApp;
  addDoc = firestore.addDoc;
  collection = firestore.collection;
  deleteDoc = firestore.deleteDoc;
  doc = firestore.doc;
  getDocs = firestore.getDocs;
  getFirestore = firestore.getFirestore;
  onSnapshot = firestore.onSnapshot;
  orderBy = firestore.orderBy;
  query = firestore.query;
  serverTimestamp = firestore.serverTimestamp;
}

async function initFirebase() {
  if (!firebaseConfig) {
    renderConfigError("Firebase no configurado. Funciona en modo local (localStorage).");
    return;
  }

  try {
    await loadFirebaseSdk();
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    await getDocs(query(collection(db, "sections")));
    state.firestoreReady = true;
    listenFirestore();
  } catch (error) {
    console.error(error);
    renderConfigError("No se pudo conectar a Firebase. Se mantiene modo local.");
  }
}

setupHotkey();
bindForms();
loadLocal();
initFirebase();
