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
      if (!logoDiv || logoDiv.querySelector("a")) return;

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

    // EN: "May 14, 2026" + optional time "06:00"
    const en = t.match(/\b([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})(?:\s+(\d{2}:\d{2}))?\b/);
    if (en) {
      const d = new Date(en[0]);
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
  function formatDates() {
    try {
      const els = document.querySelectorAll(".notion-property-date, .notion-callout-text .notion-text");

      els.forEach((el) => {
        const raw = (el.textContent || "").trim();
        if (!raw) return;

        const d = parseDateFromText(raw);
        if (!d) return;

        const dateStr = d.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        // Si le texte original contient une heure (dès/à ou hh:mm), on l’affiche
        const hasTime =
          /\b(\d{2}:\d{2})\b/.test(raw) || /\b(?:dès|à)\s*\d{1,2}h\d{2}\b/i.test(raw);

        if (hasTime) {
          el.textContent = `⏰ ${dateStr} dès ${pad2(d.getHours())}h${pad2(d.getMinutes())}`;
        } else {
          el.textContent = dateStr.replace(/^\p{L}+/u, (w) => w); // noop mais safe
        }
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
<style>
.festiv-footer-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center;padding:0 10px;width:100%;}
.festiv-footer-column a{display:block;color:#555;text-decoration:none;margin-bottom:8px;transition:color 0.2s;}
.festiv-footer-column a:hover{color:#000;}
@media(max-width:600px){.festiv-footer-columns{grid-template-columns:1fr;}}
</style>
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
  // 5) Indicateurs scroll horizontal pour les tables
  function setupTableScrollShadows() {
    try {
      const tables = document.querySelectorAll(".notion-collection > .notion-table");
      if (!tables.length) return;

      tables.forEach((table) => {
        const scroller = table.querySelector(".notion-table-view");
        if (!scroller) return;

        // évite de re-binder 50 fois à cause du MutationObserver
        if (scroller.dataset.festivShadowBound === "1") return;
        scroller.dataset.festivShadowBound = "1";

        const update = () => {
          const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;

          // petite tolérance pour éviter les clignotements (arrondis)
          const EPS = 2;

          const canLeft = scroller.scrollLeft > EPS;
          const canRight = scroller.scrollLeft < (maxScrollLeft - EPS);

          table.classList.toggle("festiv-can-scroll-left", canLeft);
          table.classList.toggle("festiv-can-scroll-right", canRight);
        };

        // update initial + listeners
        update();
        scroller.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });

        // au cas où le contenu arrive après (lazy render)
        setTimeout(update, 200);
        setTimeout(update, 800);
      });
    } catch (e) {
      console.error("[festiv20] setupTableScrollShadows error:", e);
    }
  }

  function runAll() {
    makeLogoClickable();
    formatDates();
    createFooterColumns();
    addCopyright();
    tweakCover();
    setupTableScrollShadows();
  }

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
