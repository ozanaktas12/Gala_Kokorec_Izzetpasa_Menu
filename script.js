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

  const categoryTitles = {
    kokorecler: "Kokoreçler",
    midyeler: "Midyeler",
    icecekler: "İçecekler"
  };

  init();

  async function init() {
    await renderMenuFromDb();
    initSectionNav();

    const updatedText = document.getElementById("updatedText");
    if (updatedText) {
      updatedText.textContent = `Son güncelleme: ${new Date().toLocaleDateString("tr-TR")}`;
    }
  }

  async function renderMenuFromDb() {
    const { data, error } = await sb
      .from("products")
      .select("id,name,description,category,price,image_url,is_active,sort_order")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Menü çekilemedi:", error.message);
      return;
    }

    const grouped = {
      kokorecler: [],
      midyeler: [],
      icecekler: []
    };

    data.forEach((item) => {
      if (grouped[item.category]) grouped[item.category].push(item);
    });

    for (const cat of Object.keys(grouped)) {
      const section = document.getElementById(cat);
      if (!section) continue;

      // Başlık
      const h2 = section.querySelector("h2");
      if (h2) h2.textContent = categoryTitles[cat];

      // Liste container
      let menuList = section.querySelector(".menu-list");
      if (!menuList) {
        menuList = document.createElement("div");
        menuList.className = "menu-list";
        section.appendChild(menuList);
      }

      menuList.innerHTML = grouped[cat]
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
    }
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

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();