(() => {
  // Basit şifre (istersen değiştir)
  const ADMIN_PASSWORD = "gala2026";

  const STORAGE_KEY_MENU = "gala_menu_v1";
  const STORAGE_KEY_AUTH = "gala_admin_auth_v1";

  const defaultMenu = [
    // Kokoreçler
    { id: crypto.randomUUID(), category: "kokorecler", name: "Yarım Ekmek Kokoreç", desc: "Özel baharatlı, köz tadında", price: 190, image: "assets/images/kokorec_yarim.jpeg", active: true, order: 1 },
    { id: crypto.randomUUID(), category: "kokorecler", name: "Tam Ekmek Kokoreç", desc: "Doyurucu porsiyon", price: 290, image: "assets/images/kokorec_tam_ekmek.jpeg", active: true, order: 2 },
    { id: crypto.randomUUID(), category: "kokorecler", name: "Çeyrek Ekmek Kokoreç", desc: "Atıştırmalık boy", price: 120, image: "assets/images/kokorec_ceyrek.jpeg", active: true, order: 3 },
    { id: crypto.randomUUID(), category: "kokorecler", name: "Porsiyon Kokoreç", desc: "Tabakta servis", price: 260, image: "assets/images/kokorec_uc_ceyrek.jpeg", active: true, order: 4 },

    // Midyeler
    { id: crypto.randomUUID(), category: "midyeler", name: "Midye Dolma (1 adet)", desc: "Günlük taze", price: 25, image: "assets/images/midye.jpeg", active: true, order: 1 },
    { id: crypto.randomUUID(), category: "midyeler", name: "Patates Kızartması", desc: "İnce kesim", price: 90, image: "", active: true, order: 2 },
    { id: crypto.randomUUID(), category: "midyeler", name: "Turşu Tabağı", desc: "Karışık turşu", price: 70, image: "", active: true, order: 3 },

    // İçecekler
    { id: crypto.randomUUID(), category: "icecekler", name: "Ayran", desc: "Açık / Kapalı", price: 35, image: "assets/images/ayran_acik.jpeg", active: true, order: 1 },
    { id: crypto.randomUUID(), category: "icecekler", name: "Şalgam", desc: "Acılı / Acısız", price: 45, image: "", active: true, order: 2 },
    { id: crypto.randomUUID(), category: "icecekler", name: "Kutu İçecek", desc: "Cola / Fanta / Sprite", price: 55, image: "", active: true, order: 3 },
    { id: crypto.randomUUID(), category: "icecekler", name: "Su (0.5L)", desc: "Soğuk servis", price: 15, image: "", active: true, order: 4 }
  ];

  let menuData = getMenuData();

  const loginCard = document.getElementById("loginCard");
  const panel = document.getElementById("panel");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItemBtn");
  const saveBtn = document.getElementById("saveBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const saveMsg = document.getElementById("saveMsg");

  function getMenuData() {
    const raw = localStorage.getItem(STORAGE_KEY_MENU);
    if (!raw) return structuredClone(defaultMenu);
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      return structuredClone(defaultMenu);
    } catch {
      return structuredClone(defaultMenu);
    }
  }

  function setMenuData(data) {
    localStorage.setItem(STORAGE_KEY_MENU, JSON.stringify(data));
  }

  function showPanel() {
    loginCard.classList.add("hidden");
    panel.classList.remove("hidden");
    renderItems();
  }

  function showLogin() {
    panel.classList.add("hidden");
    loginCard.classList.remove("hidden");
  }

  function checkAuth() {
    const isAuth = localStorage.getItem(STORAGE_KEY_AUTH) === "1";
    if (isAuth) showPanel();
    else showLogin();
  }

  loginBtn.addEventListener("click", () => {
    const pw = passwordInput.value.trim();
    if (pw === ADMIN_PASSWORD) {
      localStorage.setItem(STORAGE_KEY_AUTH, "1");
      loginMsg.textContent = "";
      showPanel();
    } else {
      loginMsg.textContent = "Şifre hatalı.";
    }
  });

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY_AUTH);
    showLogin();
  });

  addItemBtn.addEventListener("click", () => {
    menuData.push({
      id: crypto.randomUUID(),
      category: "kokorecler",
      name: "",
      desc: "",
      price: 0,
      image: "",
      active: true,
      order: getNextOrder("kokorecler")
    });
    renderItems();
    saveMsg.textContent = "";
  });

  saveBtn.addEventListener("click", () => {
    const cards = [...document.querySelectorAll(".item[data-id]")];
    const next = [];

    for (const card of cards) {
      const id = card.dataset.id;
      const name = card.querySelector("[data-field='name']").value.trim();
      const desc = card.querySelector("[data-field='desc']").value.trim();
      const category = card.querySelector("[data-field='category']").value;
      const priceStr = card.querySelector("[data-field='price']").value.trim();
      const image = card.querySelector("[data-field='image']").value.trim();
      const active = card.querySelector("[data-field='active']").checked;
      const orderStr = card.querySelector("[data-field='order']").value.trim();

      const price = Number(priceStr);
      const order = Number(orderStr);

      if (!name) continue; // adı boş olanı kaydetme
      next.push({
        id,
        name,
        desc,
        category,
        price: Number.isFinite(price) ? price : 0,
        image,
        active,
        order: Number.isFinite(order) ? order : 999
      });
    }

    menuData = next.sort((a, b) => a.category.localeCompare(b.category) || a.order - b.order);
    setMenuData(menuData);
    saveMsg.textContent = "Kaydedildi ✅ Menü güncellendi.";
    renderItems();
  });

  function getNextOrder(category) {
    const arr = menuData.filter(x => x.category === category);
    if (!arr.length) return 1;
    return Math.max(...arr.map(x => Number(x.order) || 0)) + 1;
  }

  function removeItem(id) {
    menuData = menuData.filter(x => x.id !== id);
    renderItems();
  }

  function renderItems() {
    const sorted = [...menuData].sort((a, b) => a.category.localeCompare(b.category) || (a.order - b.order));
    itemsContainer.innerHTML = "";

    for (const item of sorted) {
      const el = document.createElement("article");
      el.className = "item";
      el.dataset.id = item.id;

      el.innerHTML = `
        <div class="item-grid">
          <div>
            <label>Ürün Adı</label>
            <input data-field="name" value="${escapeHtml(item.name)}" />
          </div>
          <div>
            <label>Kategori</label>
            <select data-field="category">
              <option value="kokorecler" ${item.category === "kokorecler" ? "selected" : ""}>Kokoreçler</option>
              <option value="midyeler" ${item.category === "midyeler" ? "selected" : ""}>Midyeler</option>
              <option value="icecekler" ${item.category === "icecekler" ? "selected" : ""}>İçecekler</option>
            </select>
          </div>
          <div>
            <label>Fiyat (₺)</label>
            <input data-field="price" type="number" min="0" step="1" value="${item.price}" />
          </div>
          <div>
            <label>Görsel (URL/path)</label>
            <input data-field="image" value="${escapeHtml(item.image || "")}" placeholder="assets/images/..." />
          </div>
        </div>

        <div class="item-grid-2">
          <div>
            <label>Açıklama</label>
            <input data-field="desc" value="${escapeHtml(item.desc || "")}" />
          </div>
          <div>
            <label>Sıra</label>
            <input data-field="order" type="number" min="1" step="1" value="${item.order ?? 999}" />
          </div>
          <div>
            <label>Aktif</label>
            <input data-field="active" type="checkbox" ${item.active ? "checked" : ""} />
          </div>
          <div class="actions">
            <button class="danger" data-remove="${item.id}">Sil</button>
          </div>
        </div>
      `;
      itemsContainer.appendChild(el);
    }

    itemsContainer.querySelectorAll("[data-remove]").forEach(btn => {
      btn.addEventListener("click", () => removeItem(btn.dataset.remove));
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  checkAuth();
})();