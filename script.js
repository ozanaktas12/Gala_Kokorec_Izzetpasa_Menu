(() => {
  // ==============================
  // 1) Supabase ayarları
  // ==============================
  const SUPABASE_URL = "https://nzyrjazicbaqafqucyhe.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56eXJqYXppY2JhcWFmcXVjeWhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjQwNTYsImV4cCI6MjA4NjkwMDA1Nn0.6SlY9ZnnLBedb7iw2rf8V-CgTqUz4Wd13Tr9TijUOcY";

  if (!window.supabase) {
    console.error("Supabase kütüphanesi yüklenemedi.");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  init();

  async function init() {
    const loadingEl = document.getElementById("menuLoading");
    let sections = document.querySelectorAll(".menu-section");

    // İlk açılışta eski statik içeriği gizle
    sections.forEach((s) => s.classList.add("is-hidden"));

    try {
      await renderMenuFromDb();
      sections = document.querySelectorAll(".menu-section");
      initSectionNav();

      const updatedText = document.getElementById("updatedText");
      if (updatedText) {
        updatedText.textContent = `Son güncelleme: ${new Date().toLocaleDateString("tr-TR")}`;
      }

      // DB verisi yüklendikten sonra menüyü göster
      sections.forEach((s) => s.classList.remove("is-hidden"));

      if (loadingEl) loadingEl.remove();
    } catch (e) {
      console.error("Init hatası:", e);
      if (loadingEl) {
        loadingEl.textContent = "Menü yüklenemedi. Lütfen tekrar deneyin.";
      }
    }
  }

  async function renderMenuFromDb() {
    // 1) Aktif kategorileri çek
    const { data: catData, error: catError } = await sb
      .from("menu_categories")
      .select("slug,label,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (catError) {
      console.error("Kategori çekilemedi:", catError.message);
      throw catError;
    }

    // 2) Aktif ürünleri çek
    const { data: productData, error: productError } = await sb
      .from("products")
      .select("id,name,description,category,price,image_url,is_active,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (productError) {
      console.error("Menü çekilemedi:", productError.message);
      throw productError;
    }

    const categories = (catData || []).map((c) => ({
      slug: c.slug,
      label: c.label || labelizeCategory(c.slug),
      sort_order: c.sort_order ?? 999
    }));

    const products = productData || [];

    // Ürünlerde olup kategori tablosunda olmayanlar için fallback
    const missing = Array.from(new Set(products.map((p) => p.category))).filter(
      (slug) => slug && !categories.some((c) => c.slug === slug)
    );
    missing.forEach((slug, i) => {
      categories.push({ slug, label: labelizeCategory(slug), sort_order: 10000 + i });
    });

    categories.sort((a, b) => (a.sort_order - b.sort_order) || a.label.localeCompare(b.label, "tr"));

    // Kategori bazlı grupla
    const grouped = {};
    categories.forEach((c) => {
      grouped[c.slug] = [];
    });

    products.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });

    const main = document.querySelector("main.container");
    const nav = document.querySelector(".section-nav");
    if (!main || !nav) return;

    // Eski sectionları temizle (menu-section olanlar)
    main.querySelectorAll(".menu-section").forEach((s) => s.remove());

    // Nav linklerini temizle
    nav.innerHTML = "";

    categories.forEach((cat, index) => {
      const section = document.createElement("section");
      section.className = "category menu-section";
      section.id = cat.slug;
      section.dataset.category = cat.slug;

      section.innerHTML = `
        <h2>${escapeHtml(cat.label)}</h2>
        <div class="menu-list"></div>
      `;

      const menuList = section.querySelector(".menu-list");
      const items = grouped[cat.slug] || [];

      menuList.innerHTML = items
        .map((item) => {
          const imgHtml = item.image_url
            ? `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}" class="item-image" />`
            : `<div class="item-image placeholder" aria-hidden="true">🍽️</div>`;

          return `
            <article class="item">
              <div class="item-left">
                ${imgHtml}
                <div class="item-text">
                  <h3>${escapeHtml(item.name)}</h3>
                  <p class="desc">${escapeHtml(item.description || "")}</p>
                </div>
              </div>
              <p class="price">₺${formatPrice(item.price)}</p>
            </article>
          `;
        })
        .join("");

      if (!items.length) {
        menuList.innerHTML = `<p class="empty-note">Bu kategoride henüz ürün yok.</p>`;
      }

      main.appendChild(section);

      const link = document.createElement("a");
      link.href = `#${cat.slug}`;
      link.dataset.nav = cat.slug;
      link.textContent = cat.label;
      if (index === 0) link.classList.add("is-active");
      nav.appendChild(link);
    });
  }

  function formatPrice(value) {
    const n = Number(value || 0);
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }

  function initSectionNav() {
    const navLinks = Array.from(document.querySelectorAll(".section-nav a"));
    const sections = navLinks
      .map((link) => document.querySelector(link.getAttribute("href")))
      .filter(Boolean);

    function setActiveById(id) {
      navLinks.forEach((link) => {
        const active = link.getAttribute("href") === `#${id}`;
        link.classList.toggle("is-active", active);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) setActiveById(visible[0].target.id);
      },
      {
        root: null,
        rootMargin: "-25% 0px -55% 0px",
        threshold: [0.15, 0.35, 0.6]
      }
    );

    sections.forEach((section) => observer.observe(section));

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        const id = link.getAttribute("href")?.replace("#", "");
        if (id) setActiveById(id);
      });
    });
  }

  function labelizeCategory(raw) {
    if (!raw) return "";
    const map = {
      kokorecler: "Kokoreçler",
      midyeler: "Midyeler",
      icecekler: "İçecekler"
    };
    if (map[raw]) return map[raw];
    return raw
      .split("_")
      .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ""))
      .join(" ");
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