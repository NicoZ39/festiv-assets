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

  // =========================================
  // THEME (auto système + override manuel)
  // =========================================

  function getSavedTheme() {
    try {
      const v = localStorage.getItem("festiv-theme"); // "dark" | "light" | null
      return v === "dark" || v === "light" ? v : null;
    } catch {
      return null;
    }
  }

  function getSystemTheme() {
    try {
      return window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } catch {
      return "light";
    }
  }

  function getEffectiveTheme() {
    return getSavedTheme() || getSystemTheme(); // ✅ auto si rien de sauvegardé
  }

  function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark-mode", isDark);

  // ✅ anti-flash : on retire le "cloak" dès que le thème est posé
  document.documentElement.classList.add("festiv-theme-ready");

  // si le bouton existe déjà, on le resync
  const wrap = document.getElementById("festiv-theme-toggle");
  if (wrap) {
    wrap.setAttribute("aria-pressed", isDark ? "true" : "false");
    wrap.classList.toggle("is-dark", isDark);
  }

    // ✅ si Disqus est présent (page commentaires), on resync
  if (document.getElementById("disqus_thread")) {
    setTimeout(() => { try { refreshDisqusTheme(); } catch {} }, 50);
  }
}


  function applySavedTheme() {
    try {
      applyTheme(getEffectiveTheme());
    } catch (e) {
      console.error("[festiv20] applySavedTheme error:", e);
    }
  }

  // ✅ si l’OS change de thème : on suit, mais seulement si pas d’override manuel
  function bindSystemThemeListener() {
    try {
      if (window.__FESTIV_SYS_THEME_BOUND) return;
      window.__FESTIV_SYS_THEME_BOUND = true;

      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        if (!getSavedTheme()) {
          applySavedTheme();       // suit l’OS
          syncAutoIndicator();     // met à jour le badge AUTO
        }
      };

      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange); // Safari old
    } catch (e) {
      console.error("[festiv20] bindSystemThemeListener error:", e);
    }
  }

  // ===== INDICATEUR AUTO (badge + tooltip) =====
  function isAutoMode() {
    return !getSavedTheme();
  }

  function syncAutoIndicator() {
    try {
      const wrap = document.getElementById("festiv-theme-toggle");
      if (!wrap) return;

      const auto = isAutoMode();
      wrap.classList.toggle("is-auto", auto);

      // Tooltip dynamique
      wrap.setAttribute(
        "title",
        auto ? "Auto : suit le thème de ton appareil" : "Thème forcé • Double-clic : revenir en Auto"
      );
    } catch {}
  }

  // =========================================
  // THEME TOGGLE (bouton)
  // =========================================
  let ignoreClickUntil = 0;

  function initThemeToggle() {
    try {
      let wrap = document.getElementById("festiv-theme-toggle");
      if (!wrap) {
        wrap = document.createElement("button");
        wrap.type = "button";
        wrap.id = "festiv-theme-toggle";
        wrap.className = "festiv-switch";
        wrap.setAttribute("aria-label", "Changer de thème");
        wrap.setAttribute("aria-pressed", "false");

        // (Le title sera géré par syncAutoIndicator)
        wrap.setAttribute("title", "Clic : changer le thème • Double-clic : Auto");

        // ✅ switch iOS + icônes SVG (moon / sun) centrées
        wrap.innerHTML = `
          <span class="festiv-switch__track" aria-hidden="true">
            <span class="festiv-switch__knob" aria-hidden="true">
              <span class="festiv-switch__knob-icon is-moon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true">
                  <path d="M21 14.5A8.5 8.5 0 0 1 9.5 3a7 7 0 1 0 11.5 11.5Z" fill="currentColor"/>
                </svg>
              </span>
              <span class="festiv-switch__knob-icon is-sun" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="14" height="14" focusable="false" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.2" fill="currentColor"/>
                  <path d="M12 2.6v2.2M12 19.2v2.2M4.8 12H2.6M21.4 12h-2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"
                    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>
                </svg>
              </span>
            </span>
          </span>
        `;

        // CLIC = toggle manuel => sauvegarde
        wrap.addEventListener("click", (e) => {
          // ✅ ignore le click déclenché juste après un dblclick
          if (Date.now() < ignoreClickUntil) return;

          e.preventDefault();
          e.stopPropagation();

          const isDark = document.documentElement.classList.toggle("dark-mode");
          wrap.setAttribute("aria-pressed", isDark ? "true" : "false");
          wrap.classList.toggle("is-dark", isDark);

          try {
            localStorage.setItem("festiv-theme", isDark ? "dark" : "light");
          } catch {}

         syncAutoIndicator();

        // ✅ Meteoblue : sync tout de suite + re-sync (iPhone / lazy)
        syncMeteoblueTheme();
        setTimeout(syncMeteoblueTheme, 300);
        setTimeout(syncMeteoblueTheme, 1200);

        // ✅ Disqus : forcer le thème à se recalculer sans refresh page
        refreshDisqusTheme();
        setTimeout(refreshDisqusTheme, 350);
        setTimeout(refreshDisqusTheme, 1200);

        });

        // DOUBLE-CLIC = retour AUTO (suit l’OS) => supprime la sauvegarde
        wrap.addEventListener("dblclick", (e) => {
          e.preventDefault();
          e.stopPropagation();

          // bloque le click “fantôme” juste après le dblclick
          ignoreClickUntil = Date.now() + 350;

          try { localStorage.removeItem("festiv-theme"); } catch {}
          applySavedTheme();
          syncAutoIndicator();

          // ✅ Disqus : idem
          refreshDisqusTheme();
          setTimeout(refreshDisqusTheme, 350);
          setTimeout(refreshDisqusTheme, 1200);
        });

        document.body.appendChild(wrap);
        syncAutoIndicator();
      }

      // Sync état à chaque runAll (navigation interne)
      const isDarkNow = document.documentElement.classList.contains("dark-mode");
      wrap.setAttribute("aria-pressed", isDarkNow ? "true" : "false");
      wrap.classList.toggle("is-dark", isDarkNow);

      syncAutoIndicator();
    } catch (e) {
      console.error("[festiv20] initThemeToggle error:", e);
    }
  }

  // 🔥 IMPORTANT : appliquer le thème le plus tôt possible
  applySavedTheme();
  bindSystemThemeListener();

  // =========================================
  // 1) Logo cliquable
  // =========================================
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

  // 2) Format dates (callout + simple table + texte simple)
  function formatDates() {
    try {
      const els = document.querySelectorAll([
        ".notion-property-date",
        ".notion-collection-card .notion-property-date",
        ".notion-collection-card .notion-property .notion-text",
        ".notion-collection .notion-table-cell .notion-property-date",
        ".notion-collection .notion-table-cell .notion-text",
        ".notion-callout-text .notion-text",
        ".notion-simple-table-cell"
      ].join(","));

      els.forEach((el) => {
        if (el.dataset.festivDateDone === "1") return;
        if (el.children && el.children.length > 0) return;

        const raw = (el.textContent || "").replace(/\u00A0/g, " ").trim();
        if (!raw) return;

        if (/^\s*(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(raw)) {
          el.dataset.festivDateDone = "1";
          return;
        }

        const looksLikeDate =
          /\b\d{4}-\d{2}-\d{2}\b/.test(raw) ||
          /\b\d{4}\/\d{1,2}\/\d{1,2}\b/.test(raw) ||
          /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/.test(raw) ||
          /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/i.test(raw);

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

        const formatted = hasTime
          ? `⏰ ${dateStr} dès ${pad2(d.getHours())}h${pad2(d.getMinutes())}`
          : dateStr;

        const datePattern =
          /\b\d{4}-\d{2}-\d{2}\b|\b\d{4}\/\d{1,2}\/\d{1,2}\b|\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b|\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/i;

        el.textContent = raw.replace(datePattern, formatted);
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
        if (table.dataset.festivUxBound === "1") return;
        table.dataset.festivUxBound = "1";

        if (
          !table.previousElementSibling ||
          !table.previousElementSibling.classList.contains("festiv-table-hint")
        ) {
          const hint = document.createElement("div");
          hint.className = "festiv-table-hint";
          hint.textContent = "👉 Faites glisser le tableau horizontalement";
          table.parentNode.insertBefore(hint, table);
        }

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

          if (maxScrollLeft <= EPS) {
            table.classList.remove("festiv-can-scroll-left", "festiv-can-scroll-right");
          }
        };

        scroller.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update, { passive: true });

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

            if (Date.now() - pageBornAt < 900) return;

            if (window.history.length > 1) window.history.back();
            else window.location.href = "/";
          });

          return btn;
        };

        if (txt === "[retour]") {
          node.textContent = "";
          node.appendChild(makeBtn());
          return;
        }

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
          window.location.assign(url);
        },
        true
      );

      if (DEBUG) console.log("[festiv20] Notion buttons bound ✅");
    } catch (e) {
      console.error("[festiv20] bindNotionButtons error:", e);
    }
  }

  // 8) Corrige les <a target="_blank"> internes => même onglet
  function fixInternalAnchors() {
    try {
      const anchors = document.querySelectorAll("a[href]");
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
          url.hostname.endsWith(".thesimple.ink");

        if (isInternal) {
          a.removeAttribute("target");
          a.removeAttribute("rel");
        } else {
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
        }
      });
    } catch (e) {
      console.error("[festiv20] fixInternalAnchors error:", e);
    }
  }

  function hideGenericCalloutIcons() {
    try {
      document
        .querySelectorAll('.notion-callout > svg.notion-page-icon[alt="Page"]')
        .forEach((svg) => {
          const callout = svg.closest(".notion-callout");
          if (callout) callout.classList.add("festiv-callout-noicon");
          svg.remove();
        });
    } catch (e) {
      console.error("[festiv20] hideGenericCalloutIcons error:", e);
    }
  }

  // FAQ : accordion + animation ouverture/fermeture + espace progressif
  function setupFaqAnimation() {
    try {
      if (window.__FESTIV_FAQ_ANIM_BOUND) return;
      window.__FESTIV_FAQ_ANIM_BOUND = true;

      const TOP_SPACE = 14;

      const closeWithAnim = (details) => {
        const content = details.querySelector(":scope > div");
        if (!content) {
          details.removeAttribute("open");
          return;
        }
        if (!details.hasAttribute("open")) return;

        const h = content.scrollHeight;
        content.style.height = h + "px";
        content.style.paddingTop = TOP_SPACE + "px";
        content.getBoundingClientRect();

        content.style.height = "0px";
        content.style.paddingTop = "0px";

        const onEnd = (ev) => {
          if (ev.propertyName !== "height") return;
          details.removeAttribute("open");
          content.style.height = "0px";
          content.style.paddingTop = "0px";
          content.removeEventListener("transitionend", onEnd);
        };
        content.addEventListener("transitionend", onEnd);
      };

      const openWithAnim = (details) => {
        const content = details.querySelector(":scope > div");
        if (!content) return;

        details.setAttribute("open", "");

        content.style.height = "0px";
        content.style.paddingTop = "0px";
        content.getBoundingClientRect(); // force reflow

        const h = content.scrollHeight;

        content.style.paddingTop = TOP_SPACE + "px";
        content.style.height = h + TOP_SPACE + "px";

        const onEnd = (ev) => {
          if (ev.propertyName !== "height") return;
          content.style.height = "auto";
          content.removeEventListener("transitionend", onEnd);
        };
        content.addEventListener("transitionend", onEnd);
      };

      document.addEventListener(
        "click",
        (e) => {
          const summary = e.target.closest("summary");
          if (!summary) return;

          const details = summary.parentElement;
          if (!details || !details.matches("details.notion-toggle")) return;

          e.preventDefault();

          const isOpen = details.hasAttribute("open");
          if (isOpen) {
            closeWithAnim(details);
            return;
          }

          document.querySelectorAll("details.notion-toggle[open]").forEach((d) => {
            if (d !== details) closeWithAnim(d);
          });

          openWithAnim(details);
        },
        true
      );

      if (DEBUG) console.log("[festiv20] FAQ anim+accordion ✅");
    } catch (e) {
      console.error("[festiv20] setupFaqAnimation error:", e);
    }
  }

  // i18n "Search" simple.ink -> FR (sans MutationObserver)
  function localizeSearchUI() {
    try {
      const FR = {
        buttonLabel: "Recherche",
        modalAriaLabel: "Recherche",
        inputPlaceholder: "Rechercher",
        toggleLabel: "Rechercher dans cette page",
      };

      document.querySelectorAll(".notion-search-button .search-title").forEach((el) => {
        if (el.textContent !== FR.buttonLabel) el.textContent = FR.buttonLabel;
      });

      function translateModal() {
        const modal = document.querySelector(".ReactModal__Content.notion-search");
        if (modal && modal.getAttribute("aria-label") !== FR.modalAriaLabel) {
          modal.setAttribute("aria-label", FR.modalAriaLabel);
        }

        const inp = document.querySelector("input.searchInput");
        if (inp && inp.getAttribute("placeholder") !== FR.inputPlaceholder) {
          inp.setAttribute("placeholder", FR.inputPlaceholder);
        }

        document.querySelectorAll(".searchmode-label").forEach((label) => {
          if (label.dataset.festivI18nDone === "1") return;

          const svg = label.querySelector("svg");
          if (!svg) return;

          Array.from(label.childNodes).forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) n.remove();
          });

          label.append(document.createTextNode(" " + FR.toggleLabel));
          label.dataset.festivI18nDone = "1";
        });
      }

      if (!window.__FESTIV_SEARCH_I18N_BOUND) {
        window.__FESTIV_SEARCH_I18N_BOUND = true;

        document.addEventListener(
          "click",
          (e) => {
            const btn = e.target.closest?.(".notion-search-button");
            if (!btn) return;

            setTimeout(translateModal, 0);
            setTimeout(translateModal, 50);
            setTimeout(translateModal, 200);
          },
          true
        );

        document.addEventListener(
          "keydown",
          (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
              setTimeout(translateModal, 0);
              setTimeout(translateModal, 50);
              setTimeout(translateModal, 200);
            }
          },
          false
        );
      }
    } catch (e) {
      console.error("[festiv20] localizeSearchUI error:", e);
    }
  }

  // 9) Back-to-top button (visible seulement après scroll)
  function setupBackToTop() {
    try {
      if (window.__FESTIV_BACKTOTOP_BOUND) return;
      window.__FESTIV_BACKTOTOP_BOUND = true;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "festiv-backtotop";
      btn.setAttribute("aria-label", "Revenir en haut");
      btn.innerHTML = "↑";

      document.body.appendChild(btn);

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

      const scrollToTop = () => {
        const behavior = reduceMotion.matches ? "auto" : "smooth";
        window.scrollTo({ top: 0, left: 0, behavior });
      };

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        scrollToTop();
      });

      const THRESHOLD = 220;

      const update = () => {
        const y = window.scrollY || document.documentElement.scrollTop || 0;
        btn.classList.toggle("is-visible", y > THRESHOLD);
      };

      update();
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update, { passive: true });
    } catch (e) {
      console.error("[festiv20] setupBackToTop error:", e);
    }
  }

  // 8bis) Traduire le calendrier Notion (mois, jours, Today)
  function translateNotionCalendar() {
    try {
      const monthMap = {
        January: "Janvier",
        February: "Février",
        March: "Mars",
        April: "Avril",
        May: "Mai",
        June: "Juin",
        July: "Juillet",
        August: "Août",
        September: "Septembre",
        October: "Octobre",
        November: "Novembre",
        December: "Décembre",
      };

      const dayMap = {
        Mon: "Lun",
        Tue: "Mar",
        Wed: "Mer",
        Thur: "Jeu",
        Thu: "Jeu",
        Fri: "Ven",
        Sat: "Sam",
        Sun: "Dim",
      };

      // Titre du mois: "February 2026" -> "Février 2026"
      const headerTitle = document.querySelector(".notion-calendar-header-title");
      if (headerTitle) {
        const parts = headerTitle.textContent.trim().split(/\s+/);
        if (parts.length >= 2 && monthMap[parts[0]]) {
          headerTitle.textContent = monthMap[parts[0]] + " " + parts.slice(1).join(" ");
        }
      }

      // Jours: Mon Tue Wed...
      document.querySelectorAll(".notion-calendar-body-title span").forEach((el) => {
        const k = el.textContent.trim();
        if (dayMap[k]) el.textContent = dayMap[k];
      });

      // Bouton Today -> Aujourd’hui
      document.querySelectorAll(".notion-calendar-header-controls span").forEach((el) => {
        if (el.textContent.trim() === "Today") el.textContent = "Aujourd’hui";
      });
    } catch (e) {
      console.error("[festiv20] translateNotionCalendar error:", e);
    }
  }

  // Pour que ça reste traduit après navigation (flèches mois / Today)
  function bindCalendarI18nHooks() {
    try {
      if (window.__FESTIV_CAL_I18N_BOUND) return;
      window.__FESTIV_CAL_I18N_BOUND = true;

      document.addEventListener(
        "click",
        () => {
          setTimeout(translateNotionCalendar, 0);
          setTimeout(translateNotionCalendar, 80);
          setTimeout(translateNotionCalendar, 200);
        },
        true
      );
    } catch (e) {
      console.error("[festiv20] bindCalendarI18nHooks error:", e);
    }
  }

  // =========================================
  // 10) Shortcode [contact-form] => Fillout natif (dynamic resize)
  // =========================================
  function shortcodeContactForm() {
    try {
      const FILL0UT_ID = "tZMYfrqCWAus";

      const nodes = document.querySelectorAll(
        ".notion-text, .notion-callout-text .notion-text, .notion-paragraph"
      );

      let found = false;

      nodes.forEach((node) => {
        if (node.dataset.festivContactFormDone === "1") return;

        const txt = (node.textContent || "").trim();
        if (!txt.includes("[contact-form]")) return;

        node.dataset.festivContactFormDone = "1";
        found = true;

        const mount = document.createElement("div");
        mount.className = "festiv-fillout";
        mount.style.width = "100%";
        mount.style.minHeight = "520px";
        mount.setAttribute("data-fillout-id", FILL0UT_ID);
        mount.setAttribute("data-fillout-embed-type", "standard");
        mount.setAttribute("data-fillout-inherit-parameters", "");
        mount.setAttribute("data-fillout-dynamic-resize", "");

        // Si le bloc ne contient QUE le shortcode -> on remplace tout
        if (txt === "[contact-form]") {
          node.textContent = "";
          node.appendChild(mount);
          return;
        }

        // Sinon on conserve le texte autour et on injecte au bon endroit
        const parts = (node.textContent || "").split("[contact-form]");
        node.textContent = "";
        parts.forEach((part, i) => {
          if (part) node.appendChild(document.createTextNode(part));
          if (i < parts.length - 1) node.appendChild(mount.cloneNode(true));
        });
      });

      // Charger le script Fillout une seule fois (seulement si besoin)
      if (found) {
        const SRC = "https://server.fillout.com/embed/v1/";
        const already = [...document.scripts].some((s) => s.src === SRC);
        if (!already) {
          const s = document.createElement("script");
          s.src = SRC;
          s.async = true;
          document.head.appendChild(s);
        }
      }
    } catch (e) {
      console.error("[festiv20] shortcodeContactForm error:", e);
    }
  }

  // =========================================
  // 11) Shortcode [inscription-form] => Fillout natif (dynamic resize)
  // =========================================
  function shortcodeInscriptionForm() {
    try {
      const FILL0UT_ID = "jYPEHAqG3Lus";

      const nodes = document.querySelectorAll(
        ".notion-text, .notion-callout-text .notion-text, .notion-paragraph"
      );

      let found = false;

      nodes.forEach((node) => {
        if (node.dataset.festivInscriptionFormDone === "1") return;

        const txt = (node.textContent || "").trim();
        if (!txt.includes("[inscription-form]")) return;

        node.dataset.festivInscriptionFormDone = "1";
        found = true;

        const mount = document.createElement("div");
        mount.className = "festiv-fillout";
        mount.style.width = "100%";
        mount.style.minHeight = "520px";
        mount.setAttribute("data-fillout-id", FILL0UT_ID);
        mount.setAttribute("data-fillout-embed-type", "standard");
        mount.setAttribute("data-fillout-inherit-parameters", "");
        mount.setAttribute("data-fillout-dynamic-resize", "");

        // Si le bloc ne contient QUE le shortcode -> on remplace tout
        if (txt === "[inscription-form]") {
          node.textContent = "";
          node.appendChild(mount);
          return;
        }

        // Sinon on conserve le texte autour et on injecte au bon endroit
        const parts = (node.textContent || "").split("[inscription-form]");
        node.textContent = "";
        parts.forEach((part, i) => {
          if (part) node.appendChild(document.createTextNode(part));
          if (i < parts.length - 1) node.appendChild(mount.cloneNode(true));
        });
      });

      // Charger le script Fillout une seule fois (seulement si besoin)
      if (found) {
        const SRC = "https://server.fillout.com/embed/v1/";
        const already = [...document.scripts].some((s) => s.src === SRC);
        if (!already) {
          const s = document.createElement("script");
          s.src = SRC;
          s.async = true;
          document.head.appendChild(s);
        }
      }
    } catch (e) {
      console.error("[festiv20] shortcodeInscriptionForm error:", e);
    }
  }

  // =========================================
  // DISQUS (uniquement si H2 "💬 Commentaires")
  // + respecte CookieHub + SPA-friendly
  // + patch FR du texte "I am 18 or older"
  // =========================================

  function patchDisqusAgeGateFR() {
    try {
      const root = document.querySelector("#disqus_thread");
      if (!root) return;

      root.querySelectorAll("label, span, div, p").forEach((el) => {
        const t = (el.textContent || "").trim();
        if (t === "I am 18 or older") el.textContent = "J’ai 18 ans ou plus";
      });
    } catch {}
  }

  function initDisqus() {
    try {
      // (optionnel mais propre) indique au site qu'on est en FR
      document.documentElement.setAttribute("lang", "fr");

      // 1) Cherche le marqueur
      const hs = document.querySelectorAll("h1,h2,h3");
      let marker = null;
      for (const h of hs) {
        if ((h.textContent || "").trim() === "💬 Commentaires") {
          marker = h;
          break;
        }
      }
      if (!marker) return;

      // 2) Consent CookieHub (souvent: "marketing")
      const CH = window.cookiehub;
      const consentOk = !CH || !CH.hasConsented ? true : CH.hasConsented("marketing"); // si besoin: "analytics"

      const existingWrap = document.querySelector(".festiv-disqus-wrap");

      // 3) Pas de consentement → placeholder
      if (!consentOk) {
        if (!existingWrap) {
          const wrap = document.createElement("div");
          wrap.className = "festiv-disqus-wrap";
          wrap.innerHTML = `
            <div class="festiv-disqus-consent">
              <p style="margin:0 0 10px 0;">Pour afficher les commentaires (Disqus), merci d’accepter les cookies correspondants.</p>
              <button type="button" class="festiv-disqus-consent-btn">⚙️ Gérer mes cookies</button>
            </div>
          `;
          marker.insertAdjacentElement("afterend", wrap);

          wrap.querySelector(".festiv-disqus-consent-btn")?.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              if (window.cookiehub?.openSettings) window.cookiehub.openSettings();
              else if (window.cookiehub?.openDialog) window.cookiehub.openDialog();
            } catch {}
          });
        }
        return;
      }

      // 4) Consent OK → retire le placeholder
      document.querySelector(".festiv-disqus-consent")?.remove();

      // 5) Crée le conteneur Disqus si absent
      if (!document.getElementById("disqus_thread")) {
        const wrap = existingWrap || document.createElement("div");
        wrap.className = "festiv-disqus-wrap";

        const thread = document.createElement("div");
        thread.id = "disqus_thread";
        wrap.appendChild(thread);

        if (!existingWrap) marker.insertAdjacentElement("afterend", wrap);
      }

      // 6) Config Disqus
      const disqusConfig = function () {
        this.page.url = window.location.href.split("#")[0];
        this.page.identifier = window.location.pathname;
        this.language = "fr";
      };

      // 7) Si déjà chargé → reset SPA propre
      if (window.DISQUS && typeof window.DISQUS.reset === "function") {
        window.DISQUS.reset({ reload: true, config: disqusConfig });

        // patch FR après rendu (2 tentatives)
        setTimeout(patchDisqusAgeGateFR, 300);
        setTimeout(patchDisqusAgeGateFR, 900);
        return;
      }

      // 8) Premier chargement
      window.disqus_config = disqusConfig;

      const already = [...document.scripts].some((s) =>
        (s.src || "").includes("festivounans.disqus.com/embed.js")
      );

      if (!already) {
        const s = document.createElement("script");
        s.src = "https://festivounans.disqus.com/embed.js";
        s.setAttribute("data-timestamp", String(+new Date()));
        (document.head || document.body).appendChild(s);
      }

      // patch FR après rendu (2 tentatives)
      setTimeout(patchDisqusAgeGateFR, 600);
      setTimeout(patchDisqusAgeGateFR, 1400);
    } catch (e) {
      console.error("[festiv20] initDisqus error:", e);
    }
  }
    // 🔁 Force Disqus à se recharger (utile quand on change de thème sans refresh)
  function refreshDisqusTheme() {
    try {
      if (!document.getElementById("disqus_thread")) return;

      const disqusConfig = function () {
        this.page.url = window.location.href.split("#")[0];
        this.page.identifier = window.location.pathname;
        this.language = "fr";
      };

      if (window.DISQUS && typeof window.DISQUS.reset === "function") {
        window.DISQUS.reset({ reload: true, config: disqusConfig });

        // patch FR + laisser le temps à Disqus de rerender
        setTimeout(patchDisqusAgeGateFR, 400);
        setTimeout(patchDisqusAgeGateFR, 1100);
      }
    } catch (e) {
      console.error("[festiv20] refreshDisqusTheme error:", e);
    }
  }

  // expose pour CookieHub callbacks (Simple.ink)
  window.__festivInitDisqus = initDisqus;

  // =========================================
  // CookieHub → si l'utilisateur change son choix,
  // on retente initDisqus() sans refresh.
  // =========================================
  function bindCookieHubForDisqus() {
    try {
      if (window.__FESTIV_COOKIEHUB_DISQUS_BOUND) return;
      window.__FESTIV_COOKIEHUB_DISQUS_BOUND = true;

      const rerun = () => {
        setTimeout(() => { try { initDisqus(); } catch {} }, 50);
        setTimeout(() => { try { initDisqus(); } catch {} }, 250);
      };

      // Fallback fiable : quand la page reprend le focus
      window.addEventListener("focus", rerun);

      // Si CookieHub expose une API d'events (selon version)
      const CH = window.cookiehub;
      if (CH && typeof CH.on === "function") {
        CH.on("onAllow", rerun);
        CH.on("onStatusChange", rerun);
        CH.on("onRevoke", rerun);
      }
    } catch (e) {
      console.error("[festiv20] bindCookieHubForDisqus error:", e);
    }
  }

function syncMeteoblueTheme(tries = 20) {
  try {
    const isDark = document.documentElement.classList.contains("dark-mode");

    // ✅ match large (langue variable / chemins variables)
    const iframe = document.querySelector(
      'iframe[src*="meteoblue.com"][src*="/weather/widget/"], iframe[data-src*="meteoblue.com"][data-src*="/weather/widget/"]'
    );

    if (!iframe) {
      if (tries > 0) setTimeout(() => syncMeteoblueTheme(tries - 1), 200);
      return;
    }

    const srcAttr = iframe.getAttribute("src");
    const dataSrcAttr = iframe.getAttribute("data-src");
    const current = srcAttr || dataSrcAttr || "";
    if (!current) {
      if (tries > 0) setTimeout(() => syncMeteoblueTheme(tries - 1), 200);
      return;
    }

    let url;
    try {
      url = new URL(current, window.location.href);
    } catch {
      return;
    }

    url.searchParams.set("layout", isDark ? "dark" : "bright");
    const next = url.toString();

    // ✅ met à jour les deux (iOS/lazy)
    if (srcAttr !== null && srcAttr !== next) iframe.setAttribute("src", next);
    if (dataSrcAttr !== null && dataSrcAttr !== next) iframe.setAttribute("data-src", next);

    // ✅ iOS/Simple.ink peut réécrire le src après coup → re-sync “tardive”
    if (tries === 20) {
      setTimeout(() => syncMeteoblueTheme(3), 900);
      setTimeout(() => syncMeteoblueTheme(3), 2500);
    }
  } catch (e) {
    console.error("[festiv20] syncMeteoblueTheme error:", e);
  }
}


// =========================================
// reCAPTCHA — FIX ULTIME (Shadow DOM + forcing loop)
// =========================================
function fixRecaptchaChallengePosition() {
  const MATCH_IFRAME = (ifr) => {
    try {
      const src = (ifr.getAttribute("src") || "") + " " + (ifr.getAttribute("data-src") || "");
      const title = (ifr.getAttribute("title") || "");
      return /recaptcha|google\.com\/recaptcha|recaptcha\.net|api2\/bframe/i.test(src + " " + title);
    } catch { return false; }
  };

  const isVisible = (el) => {
    try {
      const r = el.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return false;
      const cs = getComputedStyle(el);
      return cs.display !== "none" && cs.visibility !== "hidden" && cs.opacity !== "0";
    } catch { return false; }
  };

  // 🔎 Scan DOM + Shadow DOM (open)
  const collectAllElementsDeep = (root) => {
    const out = [];
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 1) out.push(node);

      // enfants classiques
      const kids = node.children ? Array.from(node.children) : [];
      for (const k of kids) walk(k);

      // shadow root (open)
      const sr = node.shadowRoot;
      if (sr) {
        const srKids = sr.children ? Array.from(sr.children) : [];
        for (const k of srKids) walk(k);
      }
    };
    walk(root);
    return out;
  };

  const forceCenter = (ifr) => {
    try {
      ifr.style.setProperty("position", "fixed", "important");
      ifr.style.setProperty("left", "50%", "important");
      ifr.style.setProperty("top", "50%", "important");
      ifr.style.setProperty("right", "auto", "important");
      ifr.style.setProperty("bottom", "auto", "important");
      ifr.style.setProperty("transform", "translate(-50%, -50%)", "important");
      ifr.style.setProperty("max-width", "calc(100vw - 24px)", "important");
      ifr.style.setProperty("max-height", "calc(100vh - 24px)", "important");
      ifr.style.setProperty("z-index", "2147483647", "important");
    } catch {}
  };

  // 🔧 Neutralise les ancêtres “casse-fixed” (transform/filter/overflow hidden)
  const hardenAncestors = (el) => {
    let p = el && el.parentElement;
    while (p && p !== document.body && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      const bad =
        cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" ||
        cs.overflow === "hidden" || cs.overflowX === "hidden" || cs.overflowY === "hidden";

      if (bad) {
        p.style.setProperty("transform", "none", "important");
        p.style.setProperty("filter", "none", "important");
        p.style.setProperty("perspective", "none", "important");
        p.style.setProperty("overflow", "visible", "important");
        p.style.setProperty("overflow-x", "visible", "important");
        p.style.setProperty("overflow-y", "visible", "important");
      }
      p = p.parentElement;
    }
  };

  const apply = () => {
    // scan deep
    const all = collectAllElementsDeep(document.documentElement);
    const iframes = all.filter((n) => n.tagName === "IFRAME" && MATCH_IFRAME(n));
    const visible = iframes.filter(isVisible);

    if (!visible.length) {
      document.documentElement.classList.remove("festiv-recaptcha-open");
      return;
    }

    document.documentElement.classList.add("festiv-recaptcha-open");

    // On centre tout ce qui est visible
    visible.forEach((ifr) => {
      forceCenter(ifr);
      hardenAncestors(ifr);
    });

    // debug (si DEBUG true en haut de ton fichier)
    try { console.log("[festiv20] recaptcha iframes visibles:", visible.map(i => i.getAttribute("src"))); } catch {}
  };

  // ✅ Apply tout de suite + en boucle (reCAPTCHA remplace les iframes)
  apply();

  let ticks = 0;
  const loop = () => {
    apply();
    ticks++;
    if (ticks < 80) requestAnimationFrame(loop); // ~80 frames ≈ 1–2s selon machine
  };
  requestAnimationFrame(loop);

  // ✅ Et encore quelques coups “tardifs”
  setTimeout(apply, 200);
  setTimeout(apply, 600);
  setTimeout(apply, 1200);

  // ✅ Observe le DOM (classique) — le loop couvre déjà beaucoup, mais on garde
  if (!window.__FESTIV_RECAPTCHA_OBS2) {
    window.__FESTIV_RECAPTCHA_OBS2 = new MutationObserver(() => {
      apply();
      setTimeout(apply, 50);
      setTimeout(apply, 200);
    });
    window.__FESTIV_RECAPTCHA_OBS2.observe(document.documentElement, { childList: true, subtree: true });
  }
}





  
  // =========================================
  // runAll (appelé au load + à chaque rebuild DOM)
  // =========================================
  function runAll() {
    if (window.__FESTIV_RUNALL_LOCK) return;
    window.__FESTIV_RUNALL_LOCK = true;

    try {
      // ✅ re-appliquer le thème à chaque runAll (navigation interne / DOM rebuild)
      applySavedTheme();
      syncMeteoblueTheme();
setTimeout(syncMeteoblueTheme, 300);
      makeLogoClickable();
      formatDates();
      createFooterColumns();
      addCopyright();
      tweakCover();
      setupTableScrollUX();
      shortcodeRetour();
      bindNotionButtons();
      fixInternalAnchors();
      hideGenericCalloutIcons();
      setupFaqAnimation();
      localizeSearchUI();
      setupBackToTop();
      fixRecaptchaChallengePosition();


      // ✅ listener OS (protégé par flag)
      bindSystemThemeListener();

      // ✅ calendrier FR
      bindCalendarI18nHooks();
      translateNotionCalendar();

      // ✅ bouton toggle + icône + badge AUTO à jour
      initThemeToggle();

      // ✅ Fillout natif (auto-resize)
      shortcodeContactForm();
      shortcodeInscriptionForm();

     // ✅ Disqus (si H2 "💬 Commentaires")
document.documentElement.setAttribute("lang", "fr");
initDisqus();

      
    } finally {
      window.__FESTIV_RUNALL_LOCK = false;
    }
  }

  // Petits retours internes
  setTimeout(fixInternalAnchors, 500);
  setTimeout(fixInternalAnchors, 1500);

  onReady(() => {
    log("loaded ✅");

    // ✅ CookieHub → retenter Disqus après changement de consentement
    bindCookieHubForDisqus();

    // ✅ run initial
    runAll();

    // ✅ observer global : relance runAll si Simple.ink reconstruit le DOM,
    // mais IGNORE tout ce qui vient de Disqus (sinon boucle infinie).
    let t = null;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const target = m.target;
        if (target && target.closest && target.closest("#disqus_thread, .festiv-disqus-wrap")) {
          return;
        }
        for (const n of m.addedNodes || []) {
          if (n.nodeType === 1) {
            const el = n;
            if (el.id === "disqus_thread") return;
            if (el.closest && el.closest("#disqus_thread, .festiv-disqus-wrap")) return;
            if (el.querySelector?.('iframe[src*="disqus"]')) return;
          }
        }
      }

      clearTimeout(t);
      t = setTimeout(runAll, 80);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
