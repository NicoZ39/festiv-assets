(() => {
  const LOCALE = "fr-FR";

  // ✅ CSS chargé via JS (contourne les limitations Simple.ink)
  // Remplace USER/REPO par ton GitHub (ex: nicolaslogerot/festiv-assets)
  const CSS_URL = "https://cdn.jsdelivr.net/gh/USER/REPO@main/festiv.css?v=1";

  const loadCSS = () => {
    if (document.getElementById("festiv-css-link")) return;
    const link = document.createElement("link");
    link.id = "festiv-css-link";
    link.rel = "stylesheet";
    link.href = CSS_URL;
    document.head.appendChild(link);
  };

  // --- Ton code actuel (fusionné / 1 observer / debounce) ---
  let t;
  const schedule = () => {
    clearTimeout(t);
    t = setTimeout(run, 60);
  };

  const run = () => {
    // (1) Logo cliquable -> accueil
    const logoDiv = document.querySelector(".styles_logo__JgM3o");
    if (logoDiv && !logoDiv.querySelector("a")) {
      const img = logoDiv.querySelector("img");
      if (img) {
        const a = document.createElement("a");
        a.href = "/";
        a.appendChild(img.cloneNode(true));
        logoDiv.innerHTML = "";
        logoDiv.appendChild(a);
        logoDiv.style.marginBottom = "20px";
      }
    }

    // (2) Dates FR
    document
      .querySelectorAll(".notion-property-date, .notion-callout-text .notion-text")
      .forEach((el) => {
        const m = el.textContent.match(/([A-Za-z]+ \d{1,2}, \d{4})( \d{2}:\d{2})?/);
        if (!m) return;

        const d = new Date(m[1] + (m[2] || ""));
        if (isNaN(d)) return;

        const dateFR = d.toLocaleDateString(LOCALE, {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        if (m[2]) {
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          const day = d.toLocaleDateString(LOCALE, { weekday: "long" });
          el.textContent = `⏰ ${day} ${dateFR} dès ${hh}h${mm}`;
        } else {
          el.textContent = dateFR;
        }
      });

    // (3) Footer colonnes + copyright
    const footer =
      document.querySelector("footer.styles_main_footer__LoNow") ||
      document.querySelector("footer");

    if (footer && !footer.querySelector(".festiv-footer-columns")) {
      const w = document.createElement("div");
      w.className = "festiv-footer-columns";
      w.innerHTML = `
        <div class="festiv-footer-column">
          <a href="/">Accueil</a>
          <a href="/nos-evenements-d0b436d5a1e1428d8bd76845ab0654de">Événements</a>
          <a href="/blog-35adaa1207fd47b38b9d6b4115740b22">Articles</a>
          <a href="https://festiv-ounans.thesimple.ink/Foire-aux-questions-1d06ae9a98f2804a838fea4211af04f1">Questions fréquentes</a>
        </div>
        <div class="festiv-footer-column">
          <a href="https://www.facebook.com/FestivOunans/" target="_blank" rel="noopener">Facebook</a>
          <a href="https://www.instagram.com/festiv_ounans/" target="_blank" rel="noopener">Instagram</a>
          <a href="/press-kit-festivounans-1d16ae9a98f280a2b1fac57ddcfcf2cf">Press Kit</a>
          <a href="/desabonnement-1046ae9a98f280d39023f3ba28cfc7c9">Désinscription</a>
        </div>
        <div class="festiv-footer-column">
          <a href="/a-propos-19f3c0c80f76450e926ba49e49f4bceb">À propos</a>
          <a href="/contact-7b3a8f150fff44bb972726bbd828a57f">Nous contacter</a>
          <a href="/mentions-legales-ea6aaecc43b448438befb83d9a2f60f7">Mentions légales</a>
          <a href="/politique-de-confidentialite-905b976410cf420caff3c6a618a147f9">Politique de confidentialité</a>
        </div>
      `;
      footer.appendChild(w);
    }

    if (footer && !footer.querySelector(".festiv-copyright")) {
      const c = document.createElement("div");
      c.className = "festiv-copyright";
      c.textContent = `Copyright © ${new Date().getFullYear()} - Festiv'Ounans - Tous droits réservés`;
      footer.appendChild(c);
    }
  };

  // --- Init ---
  const init = () => {
    loadCSS(); // ✅ important : charge ton CSS externe
    run();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
