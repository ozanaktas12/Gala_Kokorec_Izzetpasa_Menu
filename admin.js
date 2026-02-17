(() => {
  // ==============================
  // 1) Supabase ayarları
  // ==============================
  const SUPABASE_URL = "https://nzyrjazicbaqafqucyhe.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXJqYXppY2JhcWFmcXVjeWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjQwNTYsImV4cCI6MjA4NjkwMDA1Nn0.6SlY9ZnnLBedb7iw2rf8V-CgTqUz4Wd13Tr9TijUOcY";
  if (!window.supabase) {
    alert("Supabase kütüphanesi yüklenemedi.");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ==============================
  // 2) DOM
  // ==============================
  const loginCard = document.getElementById("loginCard");
  const panel = document.getElementById("panel");

  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  const itemsContainer = document.getElementById("itemsContainer");
  const addItemBtn = document.getElementById("addItemBtn");
  const saveBtn = document.getElementById("saveBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const saveMsg = document.getElementById("saveMsg");

  let menuData = [];

  init();

  async function init() {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      showPanel();
      await loadProducts();
    } else {
      showLogin();
    }
  }

  function showPanel() {
    loginCard.classList.add("hidden");
    panel.classList.remove("hidden");
  }

  function showLogin() {
    panel.classList.add("hidden");
    loginCard.classList.remove("hidden");
  }

  // ==============================
  // 3) Auth
  // ==============================
  loginBtn.addEventListener("click", async () => {
    loginMsg.textContent = "";
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      loginMsg.textContent = "Email ve şifre zorunlu.";
      return;
    }

    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      loginMsg.textContent = `Giriş başarısız: ${error.message}`;
      return;
    }

    showPanel();
    await loadProducts();
  });

  passwordInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  logoutBtn.addEventListener("click", async () => {
    await sb.auth.signOut();
    showLogin();
  });

  // ==============================
  // 4) CRUD
  // ==============================
  addItemBtn.addEventListener("click", () => {
    menuData.push({
      id: crypto.randomUUID(), // geçici id (db insert sonrası gerçek id gelir)
      name: "",
      description: "",
      category: "midyeler",
      price: 0,
      image_url: "",
      is_active: true,
      sort_order: getNextOrder("midyeler"),
      _isNew: true
    });
    renderItems();
  });

  saveBtn.addEventListener("click", async () => {
    saveMsg.textContent = "Kaydediliyor...";

    const cards = [...document.querySelectorAll(".item[data-id]")];
    const payload = [];

    for (const card of cards) {
      const id = card.dataset.id;
      const name = card.querySelector("[data-field='name']").value.trim();
      const description = card.querySelector("[data-field='description']").value.trim();
      const category = card.querySelector("[data-field='category']").value;
      const price = Number(card.querySelector("[data-field='price']").value.trim() || 0);
      const image_url = card.querySelector("[data-field='image_url']").value.trim();
      const is_active = card.querySelector("[data-field='is_active']").checked;
      const sort_order = Number(card.querySelector("[data-field='sort_order']").value.trim() || 999);
      const isNew = card.dataset.isNew === "1";

      if (!name) continue;

      payload.push({
        id,
        name,
        description,
        category,
        price: Number.isFinite(price) ? price : 0,
        image_url,
        is_active,
        sort_order,
        _isNew: isNew
      });
    }

    // 1) Yeni kayıtlar
    const toInsert = payload
      .filter((x) => x._isNew)
      .map(({ _isNew, id, ...rest }) => rest);

    if (toInsert.length > 0) {
      const { error } = await sb.from("products").insert(toInsert);
      if (error) {
        saveMsg.textContent = `Insert hatası: ${error.message}`;
        return;
      }
    }

    // 2) Mevcut kayıtlar
    const toUpdate = payload.filter((x) => !x._isNew);
    for (const row of toUpdate) {
      const { _isNew, id, ...rest } = row;
      const { error } = await sb.from("products").update(rest).eq("id", id);
      if (error) {
        saveMsg.textContent = `Update hatası (${row.name}): ${error.message}`;
        return;
      }
    }

    saveMsg.textContent = "Kaydedildi ✅";
    await loadProducts();
  });

  async function loadProducts() {
    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      saveMsg.textContent = `Veri çekme hatası: ${error.message}`;
      return;
    }

    menuData = data || [];
    renderItems();
    saveMsg.textContent = "";
  }

  function getNextOrder(category) {
    const arr = menuData.filter((x) => x.category === category);
    if (!arr.length) return 1;
    return Math.max(...arr.map((x) => Number(x.sort_order) || 0)) + 1;
  }

  async function removeItem(id) {
    // yeni ama db'ye kaydedilmemiş satırsa localden sil
    const target = menuData.find((x) => x.id === id);
    if (target && target._isNew) {
      menuData = menuData.filter((x) => x.id !== id);
      renderItems();
      return;
    }

    const ok = confirm("Bu ürünü silmek istediğine emin misin?");
    if (!ok) return;

    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) {
      alert(`Silme hatası: ${error.message}`);
      return;
    }

    await loadProducts();
  }

  function renderItems() {
    const sorted = [...menuData].sort(
      (a, b) => a.category.localeCompare(b.category) || (a.sort_order - b.sort_order)
    );

    itemsContainer.innerHTML = "";

    for (const item of sorted) {
      const el = document.createElement("article");
      el.className = "item";
      el.dataset.id = item.id;
      el.dataset.isNew = item._isNew ? "1" : "0";

      el.innerHTML = `
        <div class="item-grid">
          <div>
            <label>Ürün Adı</label>
            <input data-field="name" value="${escapeHtml(item.name || "")}" />
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
            <input data-field="price" type="number" min="0" step="0.01" value="${Number(item.price || 0)}" />
          </div>
          <div>
            <label>Görsel yolu (assets/images/... veya tam URL)</label>
            <input data-field="image_url" value="${escapeHtml(item.image_url || "")}" />
          </div>
        </div>

        <div class="item-grid-2">
          <div>
            <label>Açıklama</label>
            <input data-field="description" value="${escapeHtml(item.description || "")}" />
          </div>
          <div>
            <label>Sıra</label>
            <input data-field="sort_order" type="number" min="1" step="1" value="${Number(item.sort_order || 999)}" />
          </div>
          <div>
            <label>Aktif</label>
            <input data-field="is_active" type="checkbox" ${item.is_active ? "checked" : ""} />
          </div>
          <div class="actions">
            <button class="danger" data-remove="${item.id}">Sil</button>
          </div>
        </div>
      `;
      itemsContainer.appendChild(el);
    }

    itemsContainer.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => removeItem(btn.dataset.remove));
    });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();