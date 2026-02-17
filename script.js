(function () {
  // Son güncelleme tarihi
  const updatedText = document.getElementById("updatedText");
  const now = new Date();
  const trDate = now.toLocaleDateString("tr-TR");
  if (updatedText) updatedText.textContent = `Son güncelleme: ${trDate}`;

  // Bölüm butonları aktif durumu
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

      if (visible.length > 0) {
        setActiveById(visible[0].target.id);
      }
    },
    {
      root: null,
      rootMargin: "-25% 0px -55% 0px",
      threshold: [0.15, 0.35, 0.6],
    }
  );

  sections.forEach((section) => observer.observe(section));

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href")?.replace("#", "");
      if (id) setActiveById(id);
    });
  });
})();