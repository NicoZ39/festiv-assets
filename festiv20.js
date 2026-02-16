(function () {
  const locale = "fr-FR";
  const DEBUG = true;

  // =========================================
  // Utils
  // =========================================
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
    return getSavedTheme() || getSystemTheme();
  }

  function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.add("festiv-theme-ready");

    const wrap = document.getElementById("festiv-theme-toggle");
    if (wrap) {
      wrap.setAttribute("aria-pressed", isDark ? "true" : "false");
      wrap.classList.toggle("is-dark", isDark);
    }
  }

  function applySavedTheme() {
    try {
      applyTheme(getEffectiveTheme());
    } catch (e) {
      console.error("[festiv20] applySavedTheme error:", e);
    }
  }

  function isAutoMode() {
    return !getSavedTheme();
  }

  function syncAutoIndicator() {
    try {
      const wrap = document.getElementById("festiv-theme-toggle");
      if (!wrap) return;

      const auto = isAutoMode();
      wrap.classList.toggle("is-auto", auto);
      wrap.setAttribute(
        "title",
        auto ? "Auto : suit le thème de ton appareil" : "Thème forcé • Double-clic : revenir en Auto"
      );
    } catch {}
  }

  function bindSystemThemeListener() {
    try {
      if (window.__FESTIV_SYS_THEME_BOUND) return;
      window.__FESTIV_SYS_THEME_BOUND = true;

      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        if (!getSavedTheme()) {
          applySavedTheme();
          syncAutoIndicator();
          syncMeteoblueTheme();
          refreshDisqus(); // si Disqus est là
        }
      };

      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {
      console.error("[festiv20] bindSystemThemeListener error:", e);
    }
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
          syncMeteoblueTheme();
          setTimeout(syncMeteoblueTheme, 300);
          setTimeout(syncMeteoblueTheme, 1200);

          refreshDisqus();
          setTimeout(refreshDisqus, 400);
          setTimeout(refreshDisqus, 1200);
        });

        // DOUBLE-CLIC = retour AUTO
        wrap.addEventListener("dblclick", (e) => {
          e.preventDefault();
          e.stopPropagation();

          ignoreClickUntil = Date.now() + 350;

          try { localStorage.removeItem("festiv-theme"); } catch {}
          applySavedTheme();
          syncAutoIndicator();

          syncMeteoblueTheme();
          refreshDisqus();
          setTimeout(refreshDisqus, 400);
          setTimeout(refreshDisqus, 1200);
        });

        document.body.appendChild(wrap);
      }

      const isDarkNow = document.documentElement.classList.contains("dark-mode");
      wrap.setAttribute("aria-pressed", isDarkNow ? "true" : "false");
      wrap.classList.toggle("is-dark", isDarkNow);

      syncAutoIndicator();
    } catch (e) {
      console.error("[festiv20] initThemeToggle error:", e);
    }
  }

  // Appliquer le thème le plus tôt possible
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

  // =========================================
  // 2) Dates FR (callouts, tableaux, textes)
  // =========================================
  function parseDateFromText(text) {
    const t = (text || "").trim();

    const iso = t.match(/\b(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?\b/);
    if (iso) {
      const d = new Date(iso[0].replace(" ", "T"));
      if (!isNaN(d)) return d;
    }

    const slash = t.match(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/);
    if (slash) {
      const year = Number(slash[1]);
      const month = Number(slash[2]) - 1;
      const day = Number(slash[3]);
      const d = new Date(year, month, day);
      if (!isNaN(d)) return d;
    }

    const en = t.match(/\b([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})(?:\s+(\d{2}:\d{2}))?\b/);
    if (en) {
      const d = new Date(en[0]);
      if (!isNaN(d)) return d;
    }

    const en2 = t.match(/\b([A-Za-z]{3,9}\s+\d{1,2}\s+\d{4})(?:\s+(\d{2}:\d{2}))?\b/);
    if (en2) {
      const d = new Date(en2[1] + (en2[2] ? " " + en2[2] : ""));
      if (!isNaN(d)) return d;
    }

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

  // =========================================
  // 3) Footer
  // =========================================
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

  // =========================================
  // 4) Cover
  // =========================================
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

  // =========================================
  // 5) Hint scroll tables
  // =========================================
  function setupTableScrollUX() {
    try {
      const tables = document.querySelectorAll(".notion-collection .notion-table");
      if (!tables.length) return;

      tables.forEach((table) => {
        if (table.dataset.festivUxBound === "1") return;
        table.dataset.festivUxBound = "1";

        if (!table.previousElementSibling || !table.previousElementSibling.classList.contains("festiv-table-hint")) {
          const hint = document.createElement("div");
          hint.className = "festiv-table-hint";
          hint.textContent = "👉 Faites glisser le tableau horizontalement";
          table.parentNode.insertBefore(hint, table);
        }
      });
    } catch (e) {
      console.error("[festiv20] setupTableScrollUX error:", e);
    }
  }

  // =========================================
  // 6) Shortcode [retour]
  // =========================================
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

        const parts = (node.textContent || "").split("[retour]");
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

  // =========================================
  // 7) Mapping boutons Notion -> URLs
  // =========================================
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

      document.addEventListener("click", (e) => {
        const btn = e.target.closest?.("button.notion-button");
        if (!btn) return;

        const label = (btn.textContent || "").trim();
        const url = BUTTON_LINKS[label];
        if (!url) return;

        e.preventDefault();
        e.stopPropagation();
        window.location.assign(url);
      }, true);

      if (DEBUG) console.log("[festiv20] Notion buttons bound ✅");
    } catch (e) {
      console.error("[festiv20] bindNotionButtons error:", e);
    }
  }

  // =========================================
  // 8) Fix anchors target _blank internes
  // =========================================
  function fixInternalAnchors() {
    try {
      const anchors = document.querySelectorAll("a[href]");
      anchors.forEach((a) => {
        const href = (a.getAttribute("href") || "").trim();
        if (!href) return;
        if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;

        let url;
        try { url = new URL(href, window.location.href); } catch { return; }

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

  // =========================================
  // 9) Callout icon “Page” → hide
  // =========================================
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

  // =========================================
  // 10) FAQ accordion anim
  // =========================================
  function setupFaqAnimation() {
    try {
      if (window.__FESTIV_FAQ_ANIM_BOUND) return;
      window.__FESTIV_FAQ_ANIM_BOUND = true;

      const TOP_SPACE = 14;

      const closeWithAnim = (details) => {
        const content = details.querySelector(":scope > div");
        if (!content) { details.removeAttribute("open"); return; }
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
        content.getBoundingClientRect();

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

      document.addEventListener("click", (e) => {
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
      }, true);

      if (DEBUG) console.log("[festiv20] FAQ anim+accordion ✅");
    } catch (e) {
      console.error("[festiv20] setupFaqAnimation error:", e);
    }
  }

  // =========================================
  // 11) i18n Search simple.ink -> FR
  // =========================================
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

        document.addEventListener("click", (e) => {
          const btn = e.target.closest?.(".notion-search-button");
          if (!btn) return;
          setTimeout(translateModal, 0);
          setTimeout(translateModal, 50);
          setTimeout(translateModal, 200);
        }, true);

        document.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
            setTimeout(translateModal, 0);
            setTimeout(translateModal, 50);
            setTimeout(translateModal, 200);
          }
        }, false);
      }
    } catch (e) {
      console.error("[festiv20] localizeSearchUI error:", e);
    }
  }

  // =========================================
  // 12) Back-to-top
  // =========================================
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

      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.scrollTo({ top: 0, left: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
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

  // =========================================
  // 13) Calendrier Notion FR
  // =========================================
  function translateNotionCalendar() {
    try {
      const monthMap = {
        January: "Janvier", February: "Février", March: "Mars", April: "Avril",
        May: "Mai", June: "Juin", July: "Juillet", August: "Août",
        September: "Septembre", October: "Octobre", November: "Novembre", December: "Décembre",
      };

      const dayMap = { Mon: "Lun", Tue: "Mar", Wed: "Mer", Thur: "Jeu", Thu: "Jeu", Fri: "Ven", Sat: "Sam", Sun: "Dim" };

      const headerTitle = document.querySelector(".notion-calendar-header-title");
      if (headerTitle) {
        const parts = headerTitle.textContent.trim().split(/\s+/);
        if (parts.length >= 2 && monthMap[parts[0]]) {
          headerTitle.textContent = monthMap[parts[0]] + " " + parts.slice(1).join(" ");
        }
      }

      document.querySelectorAll(".notion-calendar-body-title span").forEach((el) => {
        const k = el.textContent.trim();
        if (dayMap[k]) el.textContent = dayMap[k];
      });

      document.querySelectorAll(".notion-calendar-header-controls span").forEach((el) => {
        if (el.textContent.trim() === "Today") el.textContent = "Aujourd’hui";
      });
    } catch (e) {
      console.error("[festiv20] translateNotionCalendar error:", e);
    }
  }

  function bindCalendarI18nHooks() {
    try {
      if (window.__FESTIV_CAL_I18N_BOUND) return;
      window.__FESTIV_CAL_I18N_BOUND = true;

      document.addEventListener("click", () => {
        setTimeout(translateNotionCalendar, 0);
        setTimeout(translateNotionCalendar, 80);
        setTimeout(translateNotionCalendar, 200);
      }, true);
    } catch (e) {
      console.error("[festiv20] bindCalendarI18nHooks error:", e);
    }
  }

  // =========================================
  // 14) Fillout shortcodes
  // =========================================
  function ensureFilloutScriptOnce() {
    const SRC = "https://server.fillout.com/embed/v1/";
    const already = [...document.scripts].some((s) => (s.src || "") === SRC);
    if (!already) {
      const s = document.createElement("script");
      s.src = SRC;
      s.async = true;
      document.head.appendChild(s);
    }
  }

  function shortcodeFillout(tag, formId, minHeight = 520) {
    const nodes = document.querySelectorAll(".notion-text, .notion-callout-text .notion-text, .notion-paragraph");
    let found = false;

    nodes.forEach((node) => {
      const key = `festivFilloutDone_${tag}`;
      if (node.dataset[key] === "1") return;

      const txt = (node.textContent || "").trim();
      if (!txt.includes(tag)) return;

      node.dataset[key] = "1";
      found = true;

      const mount = document.createElement("div");
      mount.className = "festiv-fillout";
      mount.style.width = "100%";
      mount.style.minHeight = String(minHeight) + "px";
      mount.setAttribute("data-fillout-id", formId);
      mount.setAttribute("data-fillout-embed-type", "standard");
      mount.setAttribute("data-fillout-inherit-parameters", "");
      mount.setAttribute("data-fillout-dynamic-resize", "");

      if (txt === tag) {
        node.textContent = "";
        node.appendChild(mount);
        return;
      }

      const parts = (node.textContent || "").split(tag);
      node.textContent = "";
      parts.forEach((part, i) => {
        if (part) node.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) node.appendChild(mount.cloneNode(true));
      });
    });

    if (found) ensureFilloutScriptOnce();
  }

  function shortcodeContactForm() {
    shortcodeFillout("[contact-form]", "tZMYfrqCWAus", 520);
  }

  function shortcodeInscriptionForm() {
    shortcodeFillout("[inscription-form]", "jYPEHAqG3Lus", 520);
  }

  // =========================================
  // 15) Meteoblue theme sync
  // =========================================
  function syncMeteoblueTheme(tries = 20) {
    try {
      const isDark = document.documentElement.classList.contains("dark-mode");

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
      try { url = new URL(current, window.location.href); } catch { return; }

      url.searchParams.set("layout", isDark ? "dark" : "bright");
      const next = url.toString();

      if (srcAttr !== null && srcAttr !== next) iframe.setAttribute("src", next);
      if (dataSrcAttr !== null && dataSrcAttr !== next) iframe.setAttribute("data-src", next);
    } catch (e) {
      console.error("[festiv20] syncMeteoblueTheme error:", e);
    }
  }

  // =========================================
  // 16) DISQUS + CookieHub (SPA friendly)
  // =========================================
  function findDisqusMarker() {
    const hs = document.querySelectorAll("h1,h2,h3");
    for (const h of hs) {
      if ((h.textContent || "").trim() === "💬 Commentaires") return h;
    }
    return null;
  }

  function cookieConsentOk() {
    // ⚠️ adapte la catégorie si besoin: "analytics" au lieu de "marketing"
    const CH = window.cookiehub;
    if (!CH || typeof CH.hasConsented !== "function") return true;
    return CH.hasConsented("marketing");
  }

  function ensureDisqusPlaceholder(marker) {
    const existingWrap = document.querySelector(".festiv-disqus-wrap");
    if (existingWrap) return existingWrap;

    const wrap = document.createElement("div");
    wrap.className = "festiv-disqus-wrap";
    wrap.innerHTML = `
      <div class="festiv-disqus-consent">
        <p style="margin:0 0 10px 0;">
          Pour afficher les commentaires (Disqus), merci d’accepter les cookies correspondants.
        </p>
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

    return wrap;
  }

  // Best effort: ne marche QUE si le texte est dans le DOM accessible (pas dans un iframe)
  function patchDisqusAgeGateFR() {
    try {
      const root = document.querySelector("#disqus_thread");
      if (!root) return;

      let changed = 0;
      root.querySelectorAll("label, span, div, p, button").forEach((el) => {
        const t = (el.textContent || "").trim();
        if (/18\s+or\s+older/i.test(t)) {
          el.textContent = t
            .replace(/Acknowledge\s+/i, "")
            .replace(/I am 18 or older/i, "J’ai 18 ans ou plus");
          changed++;
        }
      });

      if (DEBUG) console.log("[festiv20] Disqus age gate patch changed:", changed);
    } catch {}
  }

  function disqusConfigFn() {
    this.page.url = window.location.href.split("#")[0];
    this.page.identifier = window.location.pathname;
    this.language = "fr";
  }

  function initDisqus() {
    try {
      document.documentElement.setAttribute("lang", "fr");

      const marker = findDisqusMarker();
      if (!marker) return;

      // Consent CMP
      if (!cookieConsentOk()) {
        ensureDisqusPlaceholder(marker);
        return;
      }

      // Consent OK => retire le placeholder si présent
      document.querySelector(".festiv-disqus-consent")?.remove();

      // Conteneur
      let wrap = document.querySelector(".festiv-disqus-wrap");
      if (!wrap) {
        wrap = document.createElement("div");
        wrap.className = "festiv-disqus-wrap";
        marker.insertAdjacentElement("afterend", wrap);
      }

      if (!document.getElementById("disqus_thread")) {
        const thread = document.createElement("div");
        thread.id = "disqus_thread";
        wrap.appendChild(thread);
      }

      // Déjà chargé => reset SPA
      if (window.DISQUS && typeof window.DISQUS.reset === "function") {
        window.DISQUS.reset({ reload: true, config: disqusConfigFn });
        setTimeout(patchDisqusAgeGateFR, 400);
        setTimeout(patchDisqusAgeGateFR, 1200);
        setTimeout(patchDisqusAgeGateFR, 2500);
        return;
      }

      // Premier chargement
      window.disqus_config = disqusConfigFn;

      const shortname = "festivounans"; // ✅ ton shortname
      const already = [...document.scripts].some((s) =>
        (s.src || "").includes(`${shortname}.disqus.com/embed.js`)
      );

      if (!already) {
        const s = document.createElement("script");
        s.src = `https://${shortname}.disqus.com/embed.js`;
        s.setAttribute("data-timestamp", String(+new Date()));
        (document.head || document.body).appendChild(s);
      }

      setTimeout(patchDisqusAgeGateFR, 700);
      setTimeout(patchDisqusAgeGateFR, 1500);
      setTimeout(patchDisqusAgeGateFR, 3000);
    } catch (e) {
      console.error("[festiv20] initDisqus error:", e);
    }
  }

  function refreshDisqus() {
    try {
      if (!document.getElementById("disqus_thread")) return;
      if (window.DISQUS && typeof window.DISQUS.reset === "function") {
        window.DISQUS.reset({ reload: true, config: disqusConfigFn });
        setTimeout(patchDisqusAgeGateFR, 500);
        setTimeout(patchDisqusAgeGateFR, 1600);
      }
    } catch (e) {
      console.error("[festiv20] refreshDisqus error:", e);
    }
  }

  // Exposé pour les callbacks CookieHub dans Simple.ink
  window.__festivInitDisqus = initDisqus;

  function bindCookieHubForDisqus() {
    try {
      if (window.__FESTIV_COOKIEHUB_DISQUS_BOUND) return;
      window.__FESTIV_COOKIEHUB_DISQUS_BOUND = true;

      const rerun = () => {
        setTimeout(() => { try { initDisqus(); } catch {} }, 80);
        setTimeout(() => { try { initDisqus(); } catch {} }, 350);
        setTimeout(() => { try { initDisqus(); } catch {} }, 900);
      };

      // Focus: super fiable après fermeture du panneau cookies
      window.addEventListener("focus", rerun);

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

  // =========================================
  // runAll
  // =========================================
  function runAll() {
    if (window.__FESTIV_RUNALL_LOCK) return;
    window.__FESTIV_RUNALL_LOCK = true;

    try {
      document.documentElement.setAttribute("lang", "fr");

      applySavedTheme();

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

      bindSystemThemeListener();

      bindCalendarI18nHooks();
      translateNotionCalendar();

      initThemeToggle();

      shortcodeContactForm();
      shortcodeInscriptionForm();

      syncMeteoblueTheme();
      setTimeout(syncMeteoblueTheme, 300);

      initDisqus();
    } finally {
      window.__FESTIV_RUNALL_LOCK = false;
    }
  }

  // =========================================
  // Boot + Observer (ignore Disqus changes)
  // =========================================
  setTimeout(fixInternalAnchors, 500);
  setTimeout(fixInternalAnchors, 1500);

  onReady(() => {
    log("loaded ✅");

    bindCookieHubForDisqus();
    runAll();

    let t = null;
    const observer = new MutationObserver((mutations) => {
      // Ignore mutations provenant de Disqus (évite boucle infinie)
      for (const m of mutations) {
        const target = m.target;
        if (target && target.closest && target.closest("#disqus_thread, .festiv-disqus-wrap")) return;

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
