(function () {
  const locale = "fr-FR";
  const DEBUG = true;

  function log(...args) {
    if (DEBUG) console.log("[festiv20]", ...args);
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // 1) Logo cliquable
  function makeLogoClickable() {
    try {
      const logoDiv = document.querySelector(".styles_logo__JgM3o");
      if (!logoDiv) return;
      if (logoDiv.closest("a") || logoDiv.querySelector("a")) return;

      const img = logoDiv.querySelector("img");
      if (!img) return;

      const link = document.createElement("a");
      link.href = "/";
      link.appendChild(img.cloneNode(true));

      logoDiv.innerHTML = "";
      logoDiv.appendChild(link);
      logoDiv.style.marginBottom = "20px";
    } catch (e) {
      console.error("[festiv20] makeLogoClickable error:", e);
    }
  }

  // Parse date depuis texte (EN / FR / ISO) + support "dès 06h00"
  function parseDateFromText(text) {
    const t = (text || "").trim();

    // ISO: 2026-05-14, 2026-05-14T06:00
    const iso = t.match(/\b(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?\b/);
    if (iso) {
      const d = new Date(iso[0].replace(" ", "T"));
      if (!isNaN(d)) return d;
    }
    // Slash: 2026/01/30 ou 2025/05/8
const slash = t.match(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/);
if (slash) {
  const year = Number(slash[1]);
  const month = Number(slash[2]) - 1; // 0-11
  const day = Number(slash[3]);
  const d = new Date(year, month, day);
  if (!isNaN(d)) return d;
}

    // EN: "May 14, 2026" + optional time "06:00"
    const en = t.match(/\b([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})(?:\s+(\d{2}:\d{2}))?\b/);
    if (en) {
      const d = new Date(en[0]);
      if (!isNaN(d)) return d;
    }

    // EN sans virgule: "Jan 30 2026" + optional time "06:00"
const en2 = t.match(/\b([A-Za-z]{3,9}\s+\d{1,2}\s+\d{4})(?:\s+(\d{2}:\d{2}))?\b/);
if (en2) {
  const d = new Date(en2[1] + (en2[2] ? " " + en2[2] : ""));
  if (!isNaN(d)) return d;
}

    // FR: "14 mai 2026" + optional "dès 06h00" / "à 6h00"
    const fr = t
      .replace(/^⏰\s*/g, "")
      .match(/\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/i);

    if (fr) {
      const day = Number(fr[1]);
      const month = fr[2].toLowerCase();
      const year = Number(fr[3]);

      const months = {
        janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
        juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
      };

      const time = t.match(/\b(?:dès|à)\s*(\d{1,2})h(\d{2})\b/i);
      const hh = time ? Number(time[1]) : 0;
      const mm = time ? Number(time[2]) : 0;

      const d = new Date(year, months[month], day, hh, mm);
      if (!isNaN(d)) return d;
    }

    return null;
  }

  // 2) Format dates
  // 2) Format dates (robuste : callout + tables + pages)
// 2) Format dates (callout + simple table + texte simple)
function formatDates() {
  try {
    const els = document.querySelectorAll([
      // Dates “prop” (page + DB)
      ".notion-property-date",
      // Dates dans les cartes (vignettes / gallery / list)
      ".notion-collection-card .notion-property-date",
      ".notion-collection-card .notion-property .notion-text",
      // Dates en vue table (DB table view)
      ".notion-collection .notion-table-cell .notion-property-date",
      ".notion-collection .notion-table-cell .notion-text",
      // Simple Table Notion (ton cas “Jan 30, 2026” en tableau)
      ".notion-simple-table-cell"
    ].join(","));

    els.forEach((el) => {
      if (el.dataset.festivDateDone === "1") return;

      // on ne modifie que les feuilles
      if (el.children && el.children.length > 0) return;

      const raw = (el.textContent || "").replace(/\u00A0/g, " ").trim();
      if (!raw) return;

      // évite de retoucher un texte déjà FR (ex: “vendredi 30 janvier 2026”)
      if (/^\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(raw)) {
        el.dataset.festivDateDone = "1";
        return;
      }

      // pré-filtre très léger : doit ressembler à une date
      const looksLikeDate =
  /\b\d{4}-\d{2}-\d{2}\b/.test(raw) ||                    // ISO
  /\b\d{4}\/\d{1,2}\/\d{1,2}\b/.test(raw) ||              // ✅ Slash (blog)
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/.test(raw) ||    // EN
  /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/i.test(raw); // FR


      if (!looksLikeDate) return;

      const d = parseDateFromText(raw);
      if (!d) return;

      const dateStr = d.toLocaleDateString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const hasTime =
        /\b(\d{2}:\d{2})\b/.test(raw) ||
        /\b(?:dès|à)\s*\d{1,2}h\d{2}\b/i.test(raw);

      el.textContent = hasTime
        ? `⏰ ${dateStr} dès ${pad2(d.getHours())}h${pad2(d.getMinutes())}`
        : dateStr;

      el.dataset.festivDateDone = "1";
    });
  } catch (e) {
    console.error("[festiv20] formatDates error:", e);
  }
}





  // 3) Footer colonnes + copyright
  function createFooterColumns() {
    try {
      const footer = document.querySelector("footer.styles_main_footer__LoNow");
      if (!footer || footer.querySelector(".festiv-footer-columns")) return;

      const wrapper = document.createElement("div");
      wrapper.className = "festiv-footer-columns";
      wrapper.innerHTML = `
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
</div>`;

      footer.appendChild(wrapper);
    } catch (e) {
      console.error("[festiv20] createFooterColumns error:", e);
    }
  }

  function addCopyright() {
    try {
      const footer = document.querySelector("footer.styles_main_footer__LoNow");
      if (!footer || footer.querySelector(".festiv-copyright")) return;

      const year = new Date().getFullYear();
      const div = document.createElement("div");
      div.className = "festiv-copyright";
      div.textContent = `Copyright © ${year} - Festiv'Ounans - Tous droits réservés`;
      Object.assign(div.style, {
        width: "100%",
        textAlign: "center",
        fontSize: "14px",
        color: "#666",
        marginTop: "20px",
        paddingBottom: "20px",
      });
      footer.appendChild(div);
    } catch (e) {
      console.error("[festiv20] addCopyright error:", e);
    }
  }

  // 4) Cover
  function tweakCover() {
    try {
      const img = document.querySelector(".notion-page-cover-wrapper img");
      if (!img) return;
      img.style.height = "500px";
      img.style.objectFit = "cover";
      img.style.objectPosition = "center 50%";
    } catch (e) {
      console.error("[festiv20] tweakCover error:", e);
    }
  }
  // 5) Indicateurs scroll horizontal pour les tables (robuste)
  function setupTableScrollUX() {
    try {
      const tables = document.querySelectorAll(".notion-collection .notion-table");
      if (!tables.length) return;

      tables.forEach((table) => {
        // évite les doublons avec ton MutationObserver
        if (table.dataset.festivUxBound === "1") return;
        table.dataset.festivUxBound = "1";

        // 1) Ajout du hint texte (vrai DOM, pas ::before)
        if (!table.previousElementSibling || !table.previousElementSibling.classList.contains("festiv-table-hint")) {
          const hint = document.createElement("div");
          hint.className = "festiv-table-hint";
          hint.textContent = "👉 Faites glisser le tableau horizontalement";
          table.parentNode.insertBefore(hint, table);
        }

        // 2) Trouver le vrai élément qui scrolle (parfois .notion-table, parfois .notion-table-view)
        const candidates = [
          table,
          table.querySelector(".notion-table-view"),
          table.querySelector(".notion-table-body"),
        ].filter(Boolean);

        const scroller =
          candidates.find((el) => el.scrollWidth > el.clientWidth + 2) || candidates[0];

        const update = () => {
          const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
          const EPS = 2;

          const canLeft = scroller.scrollLeft > EPS;
          const canRight = scroller.scrollLeft < (maxScrollLeft - EPS);

          table.classList.toggle("festiv-can-scroll-left", canLeft);
          table.classList.toggle("festiv-can-scroll-right", canRight);

          // si pas de débordement, on enlève tout
          if (maxScrollLeft <= EPS) {
            table.classList.remove("festiv-can-scroll-left", "festiv-can-scroll-right");
          }
        };

        // listeners
        scroller.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });

        // update initial + après rendu
        update();
        setTimeout(update, 200);
        setTimeout(update, 800);
        setTimeout(update, 1500);
      });
    } catch (e) {
      console.error("[festiv20] setupTableScrollUX error:", e);
    }
  }
  // 6) Shortcode [retour] => bouton retour (anti "clic fantôme")
function shortcodeRetour() {
  try {
    const pageBornAt = (window.__FESTIV_PAGE_BORN_AT ||= Date.now());

    const nodes = document.querySelectorAll(
      ".notion-text, .notion-callout-text .notion-text, .notion-paragraph"
    );

    nodes.forEach((node) => {
      if (node.dataset.festivRetourDone === "1") return;

      const txt = (node.textContent || "").trim();
      if (!txt.includes("[retour]")) return;

      node.dataset.festivRetourDone = "1";

      const makeBtn = () => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "festiv-back-btn";
        btn.textContent = "← Retour";

        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // Anti clic "hérité" du clic qui a ouvert la page
          if (Date.now() - pageBornAt < 900) return;

          if (window.history.length > 1) window.history.back();
          else window.location.href = "/";
        });

        return btn;
      };

      // Cas 1 : bloc uniquement "[retour]"
      if (txt === "[retour]") {
        node.textContent = "";
        node.appendChild(makeBtn());
        return;
      }

      // Cas 2 : [retour] au milieu du texte
      const safe = node.textContent;
      const parts = safe.split("[retour]");

      node.textContent = "";
      parts.forEach((part, i) => {
        if (part) node.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) node.appendChild(makeBtn());
      });
    });
  } catch (e) {
    console.error("[festiv20] shortcodeRetour error:", e);
  }
}
// 7) Mapping des boutons Notion -> navigation contrôlée
function bindNotionButtons() {
  try {
    if (window.__FESTIV_NOTION_BTNS_BOUND) return;
    window.__FESTIV_NOTION_BTNS_BOUND = true;

    // 🔗 Mapping texte du bouton -> URL
    const BUTTON_LINKS = {
  "👉 Inscription Exposants": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a",
  "👉 Voir les prochains événements": "https://festiv-ounans.thesimple.ink/d0b436d5-a1e1-428d-8bd7-6845ab0654de",
  "🌶️ Participer au jeu du piment": "https://festiv-ounans.thesimple.ink/2fb6ae9a-98f2-8198-b110-c772434e56b8",
  "👉 Voir tous les événements": "https://festiv-ounans.thesimple.ink/d0b436d5-a1e1-428d-8bd7-6845ab0654de",
  "👉 S’inscrire comme exposant": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a"
};

    document.addEventListener(
      "click",
      (e) => {
        const btn = e.target.closest?.("button.notion-button");
        if (!btn) return;

        const label = (btn.textContent || "").trim();
        const url = BUTTON_LINKS[label];
        if (!url) return;

        e.preventDefault();
        e.stopPropagation();

        // 👉 toujours même onglet (interne Festiv'Ounans)
        window.location.assign(url);
      },
      true // capture : passe avant Simple.ink
    );

    if (DEBUG) console.log("[festiv20] Notion buttons bound ✅");
  } catch (e) {
    console.error("[festiv20] bindNotionButtons error:", e);
  }
}
// 8) Corrige les <a target="_blank"> internes => même onglet
function fixInternalAnchors() {
  try {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach((a) => {
      const href = (a.getAttribute("href") || "").trim();
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }

      const isInternal =
        url.origin === window.location.origin ||
        url.hostname.endsWith(".thesimple.ink"); // tes pages internes en absolu

      if (isInternal) {
        // ✅ même onglet
        a.removeAttribute("target");          // le plus fiable
        a.removeAttribute("rel");
      } else {
        // ✅ externe => nouvel onglet
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });
  } catch (e) {
    console.error("[festiv20] fixInternalAnchors error:", e);
  }
}

  function runAll() {
    makeLogoClickable();
    formatDates();
    createFooterColumns();
    addCopyright();
    tweakCover();
    setupTableScrollUX();
    shortcodeRetour();
    bindNotionButtons();
    fixInternalAnchors();
  }
setTimeout(fixInternalAnchors, 500);
setTimeout(fixInternalAnchors, 1500);

  onReady(() => {
    log("loaded ✅");
    runAll();

    let t = null;
    const observer = new MutationObserver(() => {
      // debounce pour éviter 200 appels
      clearTimeout(t);
      t = setTimeout(runAll, 60);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
