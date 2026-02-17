(() => {
  const SUPABASE_URL = "https://nzyrjazicbaqafqucyhe.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXJqYXppY2JhcWFmcXVjeWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjQwNTYsImV4cCI6MjA4NjkwMDA1Nn0.6SlY9ZnnLBedb7iw2rf8V-CgTqUz4Wd13Tr9TijUOcY";

  if (!window.supabase) {
    alert("Supabase kütüphanesi yüklenemedi.");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // Auth DOM
  const loginCard = document.getElementById("loginCard");
  const panel = document.getElementById("panel");
  const emailInput = document.getElementById("emailInput");
  const passwordInput = document.getElementById("passwordInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginMsg = document.getElementById("loginMsg");

  // Panel DOM
  const itemsContainer = document.getElementById("itemsContainer");
  const saveBtn = document.getElementById("saveBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const saveMsg = document.getElementById("saveMsg");

  // Quick add DOM
  const qaName = document.getElementById("qaName");
  const qaPrice = document.getElementById("qaPrice");
  const qaCategory = document.getElementById("qaCategory");
  const qaOrder = document.getElementById("qaOrder");
  const qaDescription = document.getElementById("qaDescription");
  const qaAddBtn = document.getElementById("qaAddBtn");

  // Category DOM
  const newCategoryInput = document.getElementById("newCategoryInput");
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  const removeCategorySelect = document.getElementById("removeCategorySelect");
  const removeCategoryBtn = document.getElementById("removeCategoryBtn");

  let menuData = [];
  let categories = [];

  init();

  async function init() {
    const { data } = await sb.auth.getSession();
    if (data.session) {
      showPanel();
      await loadAll();
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

  loginBtn?.addEventListener("click", async () => {
    loginMsg.textContent = "";
    const email = (emailInput?.value || "").trim();
    const password = (passwordInput?.value || "").trim();

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
    await loadAll();
  });

  passwordInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn?.click();
  });

  logoutBtn?.addEventListener("click", async () => {
    await sb.auth.signOut();
    showLogin();
  });

  qaAddBtn?.addEventListener("click", async () => {
    const name = (qaName?.value || "").trim();
    const price = Number(qaPrice?.value || 0);
    const category = qaCategory?.value || "midyeler";
    const description = (qaDescription?.value || "").trim();
    const order = Number(qaOrder?.value || getNextOrder(category));

    if (!name) {
      alert("Ürün adı zorunlu.");
      return;
    }

    const { error } = await sb.from("products").insert({
      name,
      description,
      category,
      price: Number.isFinite(price) ? price : 0,
      image_url: "",
      is_active: true,
      sort_order: Number.isFinite(order) ? order : 999
    });

    if (error) {
      alert(`Ekleme hatası: ${error.message}`);
      return;
    }

    qaName.value = "";
    qaPrice.value = "";
    qaDescription.value = "";
    qaOrder.value = "";

    saveMsg.textContent = "Yeni ürün eklendi ✅";
    await loadAll();
  });

  addCategoryBtn?.addEventListener("click", async () => {
    const raw = (newCategoryInput?.value || "").trim().toLowerCase();
    const slug = toSlug(raw);

    if (!slug) {
      alert("Geçerli kategori adı gir.");
      return;
    }

    if (categories.some((c) => c.slug === slug)) {
      alert("Bu kategori zaten var.");
      return;
    }

    const nextSort = getNextCategorySortOrder();
    const label = toLabel(raw, slug);

    const { error } = await sb.from("menu_categories").insert({
      slug,
      label,
      is_active: true,
      sort_order: nextSort
    });

    if (error) {
      alert(`Kategori ekleme hatası: ${error.message}`);
      return;
    }

    if (newCategoryInput) newCategoryInput.value = "";
    saveMsg.textContent = `Kategori eklendi: ${label}`;
    await loadCategories();
    renderCategorySelects();
    renderItems();
  });

  removeCategoryBtn?.addEventListener("click", async () => {
    const slug = removeCategorySelect?.value;
    if (!slug) return;

    const hasItems = menuData.some((x) => x.category === slug);
    if (hasItems) {
      alert("Bu kategoriye bağlı ürünler var. Önce ürünleri taşı veya sil.");
      return;
    }

    const ok = confirm(`\"${slug}\" kategorisini silmek istiyor musun?`);
    if (!ok) return;

    const { error } = await sb.from("menu_categories").delete().eq("slug", slug);
    if (error) {
      alert(`Kategori silme hatası: ${error.message}`);
      return;
    }

    saveMsg.textContent = `Kategori silindi: ${slug}`;
    await loadCategories();
    renderCategorySelects();
    renderItems();
  });

  saveBtn?.addEventListener("click", async () => {
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    saveMsg.textContent = "Kaydediliyor...";

    try {
      const cards = [...document.querySelectorAll(".item[data-id]")];
      const payload = [];

      for (const card of cards) {
        const id = card.dataset.id;
        const name = card.querySelector("[data-field='name']")?.value.trim() || "";
        const description = card.querySelector("[data-field='description']")?.value.trim() || "";
        const category = card.querySelector("[data-field='category']")?.value || "midyeler";
        const price = Number(card.querySelector("[data-field='price']")?.value.trim() || 0);
        const image_url = card.querySelector("[data-field='image_url']")?.value.trim() || "";
        const is_active = !!card.querySelector("[data-field='is_active']")?.checked;
        const sort_order = Number(card.querySelector("[data-field='sort_order']")?.value.trim() || 999);

        if (!name) continue;

        payload.push({ id, name, description, category, price: Number.isFinite(price) ? price : 0, image_url, is_active, sort_order });
      }

      for (const row of payload) {
        const { id, ...rest } = row;
        const { error } = await sb.from("products").update(rest).eq("id", id);
        if (error) throw new Error(`Update hatası (${row.name}): ${error.message}`);
      }

      saveMsg.textContent = "Kaydedildi ✅";
      await loadAll();
    } catch (err) {
      saveMsg.textContent = String(err.message || err);
    } finally {
      saveBtn.disabled = false;
    }
  });

  async function loadAll() {
    await Promise.all([loadCategories(), loadProducts()]);
    renderCategorySelects();
    renderItems();
    saveMsg.textContent = "";
  }

  async function loadCategories() {
    const { data, error } = await sb
      .from("menu_categories")
      .select("slug,label,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error) {
      saveMsg.textContent = `Kategori çekme hatası: ${error.message}`;
      categories = fallbackCategories();
      return;
    }

    categories = (data || []).map((c) => ({ slug: c.slug, label: c.label || labelize(c.slug), sort_order: c.sort_order ?? 999 }));
    if (!categories.length) categories = fallbackCategories();
  }

  async function loadProducts() {
    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      saveMsg.textContent = `Veri çekme hatası: ${error.message}`;
      menuData = [];
      return;
    }

    menuData = data || [];

    const missing = Array.from(new Set(menuData.map((x) => x.category))).filter(
      (slug) => slug && !categories.some((c) => c.slug === slug)
    );
    if (missing.length) {
      const maxSort = getNextCategorySortOrder();
      missing.forEach((slug, i) => categories.push({ slug, label: labelize(slug), sort_order: maxSort + i }));
      categories.sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label, "tr"));
    }
  }

  function renderCategorySelects() {
    const options = categories.map((c) => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.label)}</option>`).join("");
    if (qaCategory) qaCategory.innerHTML = options;
    if (removeCategorySelect) removeCategorySelect.innerHTML = options;
  }

  function getNextOrder(category) {
    const arr = menuData.filter((x) => x.category === category);
    if (!arr.length) return 1;
    return Math.max(...arr.map((x) => Number(x.sort_order) || 0)) + 1;
  }

  function getNextCategorySortOrder() {
    if (!categories.length) return 1;
    return Math.max(...categories.map((c) => Number(c.sort_order) || 0)) + 1;
  }

  function fallbackCategories() {
    return [
      { slug: "kokorecler", label: "Kokoreçler", sort_order: 1 },
      { slug: "midyeler", label: "Midyeler", sort_order: 2 },
      { slug: "icecekler", label: "İçecekler", sort_order: 3 }
    ];
  }

  async function uploadImage(file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `menu/${fileName}`;

    const { error } = await sb.storage.from("menu-images").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (error) throw error;

    const { data } = sb.storage.from("menu-images").getPublicUrl(filePath);
    return data.publicUrl;
  }

  async function removeItem(id) {
    const ok = confirm("Bu ürünü silmek istediğine emin misin?");
    if (!ok) return;

    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) {
      alert(`Silme hatası: ${error.message}`);
      return;
    }

    await loadAll();
  }

  function renderItems() {
    const sorted = [...menuData].sort((a, b) => {
      const aIndex = categories.findIndex((c) => c.slug === a.category);
      const bIndex = categories.findIndex((c) => c.slug === b.category);
      const catCmp = aIndex - bIndex;
      return (Number.isNaN(catCmp) ? 0 : catCmp) || (a.sort_order - b.sort_order);
    });

    itemsContainer.innerHTML = "";

    for (const item of sorted) {
      const el = document.createElement("article");
      el.className = "item";
      el.dataset.id = item.id;

      el.innerHTML = `
        <div class="item-grid">
          <div>
            <label>Ürün Adı</label>
            <input data-field="name" value="${escapeHtml(item.name || "")}" />
          </div>
          <div>
            <label>Kategori</label>
            <select data-field="category">
              ${categories.map((c) => `<option value="${escapeHtml(c.slug)}" ${item.category === c.slug ? "selected" : ""}>${escapeHtml(c.label)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label>Fiyat (₺)</label>
            <input data-field="price" type="number" min="0" step="0.01" value="${Number(item.price || 0)}" />
          </div>
          <div>
            <label>Görsel URL</label>
            <input data-field="image_url" value="${escapeHtml(item.image_url || "")}" placeholder="https://..." />
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
          <div>
            <label>Fotoğraf yükle</label>
            <input data-field="image_file" type="file" accept="image/*" />
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

    itemsContainer.querySelectorAll(".item[data-id]").forEach((card) => {
      const fileInput = card.querySelector("[data-field='image_file']");
      const urlInput = card.querySelector("[data-field='image_url']");
      if (!fileInput || !urlInput) return;

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          saveMsg.textContent = "Fotoğraf yükleniyor...";
          const publicUrl = await uploadImage(file);
          urlInput.value = publicUrl;
          saveMsg.textContent = "Fotoğraf yüklendi. Kaydet'e basmayı unutma ✅";
        } catch (err) {
          alert(`Yükleme hatası: ${err.message || err}`);
          saveMsg.textContent = "";
        } finally {
          fileInput.value = "";
        }
      });
    });
  }

  function toSlug(raw) {
    return String(raw || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ş/g, "s")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .replace(/^_+|_+$/g, "");
  }

  function toLabel(raw, slug) {
    const cleaned = (raw || "").trim();
    if (cleaned) return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return labelize(slug);
  }

  function labelize(raw) {
    if (!raw) return "";
    const map = { kokorecler: "Kokoreçler", midyeler: "Midyeler", icecekler: "İçecekler" };
    if (map[raw]) return map[raw];
    return raw.split("_").map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : "")).join(" ");
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