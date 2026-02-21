/* festiv20.js — version “full & robuste” (Simple.ink + CookieHub + Disqus)
   - Thème (auto OS + override) + bouton
   - Widget météo via shortcode (WeatherWidget.io)
   - Disqus : placeholder si pas de consentement + recheck si CookieHub pas prêt au refresh
   - Disqus : remount + watchdog si l’iframe n’apparaît pas après refresh
   - runAll + MutationObserver (ignore Disqus)
*/
(function () {
  const locale = "fr-FR";
  const DEBUG = true;

  // ====== DISQUS ======
const DISQUS_SHORTNAME = "festivounans";
const DISQUS_ANCHOR_TEXT = "[comment-form]";
const DISQUS_COOKIE_CATS_OK = ["preferences", "functional", "analytics", "statistics", "performance", "marketing"];

  function log(...args) {
    if (DEBUG) console.log("[festiv20]", ...args);
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function safeTry(fn) {
    try {
      return fn();
    } catch {
      return undefined;
    }
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
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function getEffectiveTheme() {
    return getSavedTheme() || getSystemTheme();
  }

  function applyTheme(theme) {
    try {
      const isDark = theme === "dark";

      // garde-fou
      if (
        window.__FESTIV_LAST_THEME === theme &&
        document.documentElement.classList.contains("festiv-theme-ready")
      ) {
        return;
      }
      window.__FESTIV_LAST_THEME = theme;

      document.documentElement.classList.toggle("dark-mode", isDark);
      document.documentElement.classList.add("festiv-theme-ready");

      const btn = document.getElementById("festiv-theme-toggle");
      if (btn) {
        btn.setAttribute("aria-pressed", isDark ? "true" : "false");
        btn.classList.toggle("is-dark", isDark);
      }
    } catch (e) {
      console.error("[festiv20] applyTheme error:", e);
    }
  }

  function applySavedTheme() {
    applyTheme(getEffectiveTheme());
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
          // (on ne reset pas Disqus ici)
        }
      };

      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {
      console.error("[festiv20] bindSystemThemeListener error:", e);
    }
  }

  // ===== INDICATEUR AUTO =====
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
      wrap.setAttribute("title", "Clic : changer le thème • Double-clic : Auto");

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

      // CLIC = toggle manuel
      wrap.addEventListener("click", (e) => {
        if (Date.now() < ignoreClickUntil) return;

        e.preventDefault();
        e.stopPropagation();

        const isDark = document.documentElement.classList.toggle("dark-mode");
        wrap.setAttribute("aria-pressed", isDark ? "true" : "false");
        wrap.classList.toggle("is-dark", isDark);

        try { localStorage.setItem("festiv-theme", isDark ? "dark" : "light"); } catch {}

        window.__FESTIV_LAST_THEME = isDark ? "dark" : "light";
        syncAutoIndicator();

        // Disqus : refresh volontaire
        refreshDisqusTheme();
        setTimeout(refreshDisqusTheme, 350);
        setTimeout(refreshDisqusTheme, 1200);
      });

      // DOUBLE-CLIC = retour AUTO
      wrap.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ignoreClickUntil = Date.now() + 350;

        try { localStorage.removeItem("festiv-theme"); } catch {}

        applySavedTheme();
        syncAutoIndicator();

        refreshDisqusTheme();
        setTimeout(refreshDisqusTheme, 350);
        setTimeout(refreshDisqusTheme, 1200);
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

// appliquer thème ASAP
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
  // 2) Dates FR
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
      .match(
        /\b(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})\b/i
      );

    if (fr) {
      const day = Number(fr[1]);
      const month = fr[2].toLowerCase();
      const year = Number(fr[3]);

      const months = {
        janvier: 0,
        février: 1,
        mars: 2,
        avril: 3,
        mai: 4,
        juin: 5,
        juillet: 6,
        août: 7,
        septembre: 8,
        octobre: 9,
        novembre: 10,
        décembre: 11,
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
      const els = document.querySelectorAll(
        [
          ".notion-property-date",
          ".notion-collection-card .notion-property-date",
          ".notion-collection-card .notion-property .notion-text",
          ".notion-collection .notion-table-cell .notion-property-date",
          ".notion-collection .notion-table-cell .notion-text",
          ".notion-callout-text .notion-text",
          ".notion-simple-table-cell",
        ].join(",")
      );

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
          /\b\d{1,2}\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4}\b/i.test(
            raw
          );

        if (!looksLikeDate) return;

        const d = parseDateFromText(raw);
        if (!d) return;

        const dateStr = d.toLocaleDateString(locale, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        const hasTime = /\b(\d{2}:\d{2})\b/.test(raw) || /\b(?:dès|à)\s*\d{1,2}h\d{2}\b/i.test(raw);

        const formatted = hasTime ? `⏰ ${dateStr} dès ${pad2(d.getHours())}h${pad2(d.getMinutes())}` : dateStr;

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
  // 2bis) Nettoyage Simple.ink: "06:00 (Europe/Paris)" sur les dates
  // =========================================
  function cleanupSimpleInkTZInDates() {
    try {
      const els = document.querySelectorAll(".notion-property-date");

      els.forEach((el) => {
        const txt = (el.textContent || "").replace(/\u00A0/g, " ").trim();
        if (!txt) return;

        // Cas typique Simple.ink : "06:00 (Europe/Paris)" en fin de texte
        // => on retire l'heure + timezone
        let next = txt
          .replace(/\s+\d{1,2}:\d{2}\s*\(\s*[A-Za-z_\/+-]+\s*\)\s*$/i, "")
          // au cas où il ne reste que "(Europe/Paris)" sans l'heure
          .replace(/\s*\(\s*[A-Za-z_\/+-]+\s*\)\s*$/i, "")
          .trim();

        if (next !== txt) el.textContent = next;
      });
    } catch (e) {
      console.error("[festiv20] cleanupSimpleInkTZInDates error:", e);
    }
  }


  // =========================================
  // 3) Footer colonnes + copyright
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
  // 5) Tables scroll UX
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

        const candidates = [table, table.querySelector(".notion-table-view"), table.querySelector(".notion-table-body")].filter(Boolean);
        const scroller = candidates.find((el) => el.scrollWidth > el.clientWidth + 2) || candidates[0];

        const update = () => {
          const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
          const EPS = 2;

          const canLeft = scroller.scrollLeft > EPS;
          const canRight = scroller.scrollLeft < maxScrollLeft - EPS;

          table.classList.toggle("festiv-can-scroll-left", canLeft);
          table.classList.toggle("festiv-can-scroll-right", canRight);

          if (maxScrollLeft <= EPS) table.classList.remove("festiv-can-scroll-left", "festiv-can-scroll-right");
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

  // =========================================
  // 6) Shortcode [retour]
  // =========================================
  function shortcodeRetour() {
    try {
      const pageBornAt = (window.__FESTIV_PAGE_BORN_AT ||= Date.now());
      const nodes = document.querySelectorAll(".notion-text, .notion-callout-text .notion-text, .notion-paragraph");

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

  // =========================================
  // 7) Notion buttons mapping
  // =========================================
  function bindNotionButtons() {
    try {
      if (window.__FESTIV_NOTION_BTNS_BOUND) return;
      window.__FESTIV_NOTION_BTNS_BOUND = true;

      const BUTTON_LINKS = {
        "👉 Inscription Exposants": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a",
        "👉 S’inscrire au Marché Nocturne": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a",
        "👉 Voir les prochains événements": "https://festiv-ounans.thesimple.ink/d0b436d5-a1e1-428d-8bd7-6845ab0654de",
        "🌶️ Participer au jeu du piment": "https://festiv-ounans.thesimple.ink/2fb6ae9a-98f2-8198-b110-c772434e56b8",
        "👉 Voir tous les événements": "https://festiv-ounans.thesimple.ink/d0b436d5-a1e1-428d-8bd7-6845ab0654de",
        "👉 S’inscrire comme exposant": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a",
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

      log("Notion buttons bound ✅");
    } catch (e) {
      console.error("[festiv20] bindNotionButtons error:", e);
    }
  }

  // =========================================
  // 8) Corrige les liens internes target=_blank
  // =========================================
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

        const isInternal = url.origin === window.location.origin || url.hostname.endsWith(".thesimple.ink");

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
      document.querySelectorAll('.notion-callout > svg.notion-page-icon[alt="Page"]').forEach((svg) => {
        const callout = svg.closest(".notion-callout");
        if (callout) callout.classList.add("festiv-callout-noicon");
        svg.remove();
      });
    } catch (e) {
      console.error("[festiv20] hideGenericCalloutIcons error:", e);
    }
  }

  // =========================================
  // FAQ accordion anim
  // =========================================
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

      log("FAQ anim+accordion ✅");
    } catch (e) {
      console.error("[festiv20] setupFaqAnimation error:", e);
    }
  }

  // =========================================
  // i18n Search
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
            if (n.nodeType === 3) n.remove(); // 3 = TEXT_NODE
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

  // =========================================
  // 9) Back-to-top
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

  // =========================================
  // 10) Calendrier Notion FR
  // =========================================
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
  // 11) Shortcode [contact-form] => Fillout natif (dynamic resize)
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
         setTimeout(kickFilloutWatchdog, 50);
         setTimeout(kickFilloutWatchdog, 600);
      }
    } catch (e) {
      console.error("[festiv20] shortcodeContactForm error:", e);
    }
  }

  // =========================================
  // 12) Shortcode [inscription-form] => Fillout natif (dynamic resize)
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
      setTimeout(kickFilloutWatchdog, 50);
      setTimeout(kickFilloutWatchdog, 600);
      }
    } catch (e) {
      console.error("[festiv20] shortcodeInscriptionForm error:", e);
    }
  }

  // =========================================
  // DISQUS — patch texte "18+"
  // =========================================
  function patchDisqusAgeGateFR() {
    try {
      const FROM = "Acknowledge I am 18 or older";
      const TO = "Je confirme avoir 18 ans ou plus";

      const walker = document.createTreeWalker(document.body, 4, null);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n && n.nodeValue && n.nodeValue.includes(FROM)) {
          n.nodeValue = n.nodeValue.replaceAll(FROM, TO);
        }
      }
    } catch {}
  }

  // =========================================
  // DISQUS — CookieHub consent (true/false/null)
  // null = CookieHub pas prêt
  // =========================================
  function getDisqusConsentStatus() {
    const CH = window.cookiehub;
    if (!CH) return null;

    // CookieHub pas prêt => on ne conclut rien
    if (typeof CH.isReady === "function" && !CH.isReady()) return null;

    // Si l'utilisateur n'a pas encore répondu, alors pas de consentement
    if (typeof CH.hasAnswered === "function" && !CH.hasAnswered()) return false;

    if (typeof CH.hasConsented !== "function") return null;

    // accepte si AU MOINS une catégorie est autorisée
    let sawAny = false;
    try {
      for (const c of DISQUS_COOKIE_CATS_OK) {
        const v = safeTry(() => CH.hasConsented(c));
        if (v === true) return true;
        if (v === false) sawAny = true;
      }
      return sawAny ? false : null;
    } catch {
      return null;
    }
  }

  function scheduleDisqusConsentRecheck() {
    if (window.__FESTIV_DISQUS_CONSENT_POLLING) return;
    window.__FESTIV_DISQUS_CONSENT_POLLING = true;

    let tries = 0;
    const MAX_TRIES = 140; // ~21s
    const DELAY = 150;

    const tick = () => {
      tries++;
      const consent = getDisqusConsentStatus(); // true/false/null

      if (consent === true) {
        window.__FESTIV_DISQUS_CONSENT_POLLING = false;
        try { initDisqus(true); } catch {}
        return;
      }

      if (tries >= MAX_TRIES) {
        window.__FESTIV_DISQUS_CONSENT_POLLING = false;
        return;
      }

      setTimeout(tick, DELAY);
    };

    setTimeout(tick, 50);
  }

 // =========================================
// DISQUS — Anchor-based mount: [comment-form]
// =========================================

function normalizeMarkerText(s) {
  return (s || "")
    .replace(/\u00A0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
}

function findDisqusAnchor() {
  try {
    const WANT = normalizeMarkerText(DISQUS_ANCHOR_TEXT);

    // fast pass
    const quick = document.querySelectorAll(
      ".notion-text, .notion-paragraph, .notion-callout-text, [data-content-editable-leaf]"
    );
    for (const el of quick) {
      if (normalizeMarkerText(el.textContent) === WANT) return el;
    }

    // robust pass
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (normalizeMarkerText(n.nodeValue) !== WANT) continue;

      const host =
        n.parentElement?.closest?.(
          ".notion-text, .notion-paragraph, .notion-callout, .notion-callout-text, [data-content-editable-leaf]"
        ) || n.parentElement;

      if (host) return host;
    }
  } catch (e) {
    console.warn("[festiv20] findDisqusAnchor error:", e);
  }
  return null;
}

function ensureDisqusWrapAtAnchor() {
  // 1) si le wrap existe déjà, on le garde
  let wrap = document.querySelector(".festiv-disqus-wrap");
  if (wrap) return wrap;

  // 2) sinon, on cherche l'ancre
  const anchor = findDisqusAnchor();
  if (!anchor) return null;

  // 3) IMPORTANT : on ne replaceWith() PAS
  //    -> on convertit le bloc en wrap
  anchor.classList.add("festiv-disqus-wrap");
  anchor.dataset.festivDisqusMount = "1";

  // enlève le shortcode tout de suite (plus de flash)
  anchor.textContent = "";

  return anchor;
}

function showDisqusConsentPlaceholder() {
  const wrap = ensureDisqusWrapAtAnchor();
  if (!wrap) return;

  // évite doublon
  if (wrap.querySelector(".festiv-disqus-consent")) return;

  wrap.innerHTML = `
    <div class="festiv-disqus-consent">
      <p style="margin:0 0 10px 0;">Pour afficher les commentaires (Disqus), merci d’accepter les cookies correspondants.</p>
      <button type="button" class="festiv-disqus-consent-btn">⚙️ Gérer mes cookies</button>
    </div>
  `;

  wrap.querySelector(".festiv-disqus-consent-btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (window.cookiehub?.openSettings) window.cookiehub.openSettings();
      else if (window.cookiehub?.openDialog) window.cookiehub.openDialog();
    } catch {}
  });
}

function ensureDisqusThread() {
  const wrap = ensureDisqusWrapAtAnchor();
  if (!wrap) return null;

  wrap.querySelector(".festiv-disqus-consent")?.remove();

  let thread = document.getElementById("disqus_thread");
  if (!thread) {
    thread = document.createElement("div");
    thread.id = "disqus_thread";
    wrap.appendChild(thread);
  }
  return thread;
}

function remountDisqusThread() {
  const wrap = ensureDisqusWrapAtAnchor();
  if (!wrap) return;

  const old = document.getElementById("disqus_thread");
  if (old) old.remove();

  const thread = document.createElement("div");
  thread.id = "disqus_thread";
  wrap.appendChild(thread);
}

function disqusHasIframe() {
  return !!document.querySelector('#disqus_thread iframe[src*="disqus"]');
}

// =========================================
// DISQUS — init idempotent
// =========================================
function initDisqus(force = false) {
  try {
    document.documentElement.setAttribute("lang", "fr");

    // ✅ Point de montage : wrap déjà créé (placeholder) OU ancre à remplacer
    const mount = document.querySelector(".festiv-disqus-wrap") || ensureDisqusWrapAtAnchor();
    if (!mount) return;

    // consent
    const consentStatus = getDisqusConsentStatus(); // true/false/null
    const consentOk = consentStatus === true;

    if (!consentOk) {
      showDisqusConsentPlaceholder();
      scheduleDisqusConsentRecheck();
      return;
    }

    ensureDisqusThread();

    const pageUrl = window.location.href.split("#")[0];
    const pageId = window.location.pathname;
    const pageKey = pageId + "||" + pageUrl;

    const hasIframe = disqusHasIframe();

    if (!force && window.__FESTIV_DISQUS_KEY === pageKey && window.__FESTIV_DISQUS_READY && hasIframe) return;

    const disqusConfig = function () {
      this.page.url = pageUrl;
      this.page.identifier = pageId;
      this.language = "fr";
    };

    // already loaded
    if (window.DISQUS && typeof window.DISQUS.reset === "function") {
      try {
        const ae = document.activeElement;
        if (ae && ae.tagName === "IFRAME" && !force) return;
      } catch {}

      window.__FESTIV_DISQUS_KEY = pageKey;
      window.__FESTIV_DISQUS_READY = true;

      if (!hasIframe) remountDisqusThread();

      window.DISQUS.reset({ reload: true, config: disqusConfig });
      setTimeout(patchDisqusAgeGateFR, 300);
      setTimeout(patchDisqusAgeGateFR, 900);

      setTimeout(() => {
        if (!disqusHasIframe()) {
          remountDisqusThread();
          safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
        }
      }, 1200);

      return;
    }

    // first load
    window.disqus_config = disqusConfig;

    const embedSrc = `https://${DISQUS_SHORTNAME}.disqus.com/embed.js`;
    const already = [...document.scripts].some((s) => (s.src || "").includes(`${DISQUS_SHORTNAME}.disqus.com/embed.js`));
    if (!already) {
      const s = document.createElement("script");
      s.src = embedSrc;
      s.async = true;
      s.setAttribute("data-timestamp", String(+new Date()));
      (document.head || document.body).appendChild(s);
    }

    window.__FESTIV_DISQUS_KEY = pageKey;
    window.__FESTIV_DISQUS_READY = true;

    setTimeout(patchDisqusAgeGateFR, 600);
    setTimeout(patchDisqusAgeGateFR, 1400);
  } catch (e) {
    console.error("[festiv20] initDisqus error:", e);
  }
}

// refresh volontaire (toggle thème)
function refreshDisqusTheme() {
  try {
    if (!document.getElementById("disqus_thread")) return;
    if (!window.DISQUS || typeof window.DISQUS.reset !== "function") return;

    if (window.__FESTIV_DISQUS_REFRESH_T) clearTimeout(window.__FESTIV_DISQUS_REFRESH_T);

    window.__FESTIV_DISQUS_REFRESH_T = setTimeout(() => {
      try {
        const pageUrl = window.location.href.split("#")[0];
        const pageId = window.location.pathname;

        const disqusConfig = function () {
          this.page.url = pageUrl;
          this.page.identifier = pageId;
          this.language = "fr";
        };

        if (!disqusHasIframe()) remountDisqusThread();

        window.__FESTIV_DISQUS_KEY = pageId + "||" + pageUrl;
        window.__FESTIV_DISQUS_READY = true;

        window.DISQUS.reset({ reload: true, config: disqusConfig });
        setTimeout(patchDisqusAgeGateFR, 400);
        setTimeout(patchDisqusAgeGateFR, 1100);

        setTimeout(() => {
          if (!disqusHasIframe()) {
            remountDisqusThread();
            safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
          }
        }, 1200);
      } catch {}
    }, 120);
  } catch (e) {
    console.error("[festiv20] refreshDisqusTheme error:", e);
  }
}

// expose
window.__festivInitDisqus = initDisqus;

  // =========================================
  // CookieHub -> retenter Disqus sur changements
  // =========================================
  function bindCookieHubForDisqus() {
    try {
      if (window.__FESTIV_COOKIEHUB_DISQUS_BOUND) return;
      window.__FESTIV_COOKIEHUB_DISQUS_BOUND = true;

      const hard = () => {
        setTimeout(() => { try { initDisqus(true); } catch {} }, 50);
        setTimeout(() => { try { initDisqus(true); } catch {} }, 250);
        setTimeout(() => { try { initDisqus(true); } catch {} }, 900);
      };

      const CH = window.cookiehub;
      if (CH && typeof CH.on === "function") {
        CH.on("onAllow", hard);
        CH.on("onStatusChange", hard);
        CH.on("onRevoke", hard);
      } else {
        // fallback : quelques tentatives douces
        let n = 0;
        const poke = () => {
          n++;
          try { initDisqus(false); } catch {}
          if (n < 12) setTimeout(poke, 250);
        };
        setTimeout(poke, 200);
      }
    } catch (e) {
      console.error("[festiv20] bindCookieHubForDisqus error:", e);
    }
  }


// =========================================
// WeatherWidget.io via shortcode Notion
// Shortcode à mettre dans Notion : {{meteo_ounans}}
// =========================================
function setupWeatherWidget() {
  try {
    const SHORTCODE = "{{meteo_ounans}}";

    const candidates = Array.from(
      document.querySelectorAll(
        ".notion-text, .notion-paragraph, .notion-callout, .notion-quote, [data-content-editable-leaf]"
      )
    );

    const host = candidates.find((el) => (el.textContent || "").includes(SHORTCODE));
    if (!host) return;

    const stripShortcode = () => {
      const walker = document.createTreeWalker(host, 4, null); // 4 = SHOW_TEXT
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n?.nodeValue && n.nodeValue.includes(SHORTCODE)) {
          n.nodeValue = n.nodeValue.replaceAll(SHORTCODE, "").replace(/\s{2,}/g, " ");
        }
      }
    };

    // Éviter double injection
    if (host.querySelector(".weatherwidget-io")) {
      stripShortcode();
      return;
    }

    // Retirer le shortcode avant injection
    stripShortcode();

    const a = document.createElement("a");
    a.className = "weatherwidget-io";
    a.href = "https://forecast7.com/fr/46d995d67/ounans/";
    a.setAttribute("data-label_1", "OUNANS");
    a.setAttribute("data-label_2", "Météo");
    a.setAttribute("data-font", "Roboto");
    a.setAttribute("data-icons", "Climacons Animated");
    a.setAttribute("data-mode", "Current");
    a.setAttribute("data-days", "3");
    a.setAttribute("data-theme", "weather_one");
    a.textContent = "OUNANS Météo";

    host.appendChild(a);

    // Charger le script une seule fois
    const SCRIPT_ID = "weatherwidget-io-js";
    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://weatherwidget.io/js/widget.min.js";
      s.async = true;
      document.head.appendChild(s);
    }

    // Refresh (si script déjà présent)
    try { window.__weatherwidget_init?.(); } catch {}

    // ...et retente après (si script vient juste d'arriver)
    setTimeout(() => {
      try { window.__weatherwidget_init?.(); } catch {}
    }, 50);

  } catch (e) {
    if (DEBUG) console.warn("[festiv20] WeatherWidget setup error:", e);
  }
}
// =========================================
// STICKERS (🧷) — AU SCROLL (pas hover) + no click
// Détection robuste : 🧷 dans le TEXTE ou dans l'attribut title
// =========================================
function setupGlobalStickers() {
  try {
    const TRIGGER = "🧷";

    const titles = document.querySelectorAll(
      'h1.notion-h a.notion-h-title, h2.notion-h a.notion-h-title, h3.notion-h a.notion-h-title, h4.notion-h a.notion-h-title'
    );

    const stickers = [];

    titles.forEach((a) => {
      const rawText = (a.textContent || "").trim();
      const rawTitle = (a.getAttribute("title") || "").trim();

      const isSticker = rawText.startsWith(TRIGGER) || rawTitle.startsWith(TRIGGER);
      if (!isSticker) return;

      // 1) classes (idempotent)
      a.classList.add("festiv-sticker", "festiv-sticker--ready");
      stickers.push(a);

      // 2) Retire TRIGGER du texte SI présent (dans le 1er text node)
      if (rawText.startsWith(TRIGGER)) {
        const walker = document.createTreeWalker(a, 4, null); // SHOW_TEXT
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const t = node?.nodeValue || "";
          const trimmed = t.replace(/\s+/g, " ").trimStart();
          if (!trimmed.startsWith(TRIGGER)) continue;

          const idx = t.indexOf(TRIGGER);
          if (idx >= 0) {
            const before = t.slice(0, idx);
            let after = t.slice(idx + TRIGGER.length);
            after = after.replace(/^\s+/, "");
            node.nodeValue = before + after;
          }
          break;
        }
      }

      // 3) Retire TRIGGER du title (sinon le CSS [title^="🧷"] peut recacher)
      if (rawTitle.startsWith(TRIGGER)) {
        a.setAttribute("title", rawTitle.replace(TRIGGER, "").trim());
      }

      // 4) Désactive le clic (capture)
      if (a.dataset.festivStickerNoClick !== "1") {
        a.dataset.festivStickerNoClick = "1";
        a.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          },
          true
        );
        a.setAttribute("tabindex", "-1");
        a.style.cursor = "default";
      }
    });

    if (!stickers.length) return;

    const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      stickers.forEach((a) => a.classList.add("festiv-sticker--inview"));
      return;
    }

    const hasScrolled = () =>
      (window.scrollY || document.documentElement.scrollTop || 0) > 0;

    if (!window.__FESTIV_STICKER_IO) {
      window.__FESTIV_STICKER_IO = new IntersectionObserver(
        (entries, io) => {
          if (!hasScrolled()) return; // attend le scroll utilisateur
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("festiv-sticker--inview");
            io.unobserve(entry.target);
          });
        },
        { root: null, rootMargin: "0px 0px -18% 0px", threshold: 0.25 }
      );
    }

    const io = window.__FESTIV_STICKER_IO;

    stickers.forEach((a) => {
      if (a.classList.contains("festiv-sticker--inview")) return;
      io.observe(a);
    });

    // poke au 1er scroll (pour déclencher même si déjà visible)
    if (!window.__FESTIV_STICKER_SCROLL_ARMED) {
      window.__FESTIV_STICKER_SCROLL_ARMED = true;
      window.addEventListener(
        "scroll",
        () => {
          stickers.forEach((a) => {
            if (a.classList.contains("festiv-sticker--inview")) return;
            try { io.unobserve(a); io.observe(a); } catch {}
          });
        },
        { passive: true, once: true }
      );
    }
  } catch {
    // silencieux
  }
}




// =========================================================
// NAV ACTIVE (rouge piment) + marqueurs Notion
// - Met en actif "Articles" ou "Événements"
// - Supporte les pages enfants via marqueurs : [nav:articles] / [nav:evenements]
// - Nettoie le texte pour ne jamais afficher les marqueurs
// - Evite le bug "reste bloqué sur événements" : cache PAR PAGE (pathname)
// =========================================================

// --- util: key cache par page ---
function festivNavCacheKey() {
  const path = (window.location.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
  return "festiv-nav:" + path;
}

function festivReadCachedSection() {
  try {
    const v = sessionStorage.getItem(festivNavCacheKey());
    if (v === "articles" || v === "evenements") return v;
  } catch {}
  return null;
}

function festivWriteCachedSection(section) {
  try {
    sessionStorage.setItem(festivNavCacheKey(), section);
  } catch {}
}

// --- 1) detecte un marqueur [nav:...] sur la page + le supprime ---
function festivDetectAndCleanupNavMarker() {
  try {
    const candidates = Array.from(
      document.querySelectorAll(
        ".notion-text, .notion-paragraph, .notion-callout-text, [data-content-editable-leaf]"
      )
    );

    for (const el of candidates) {
      const t = (el.textContent || "");
      const m = t.match(/\[nav:(articles|evenements)\]/i);
      if (!m) continue;

      const section = m[1].toLowerCase(); // "articles" | "evenements"
      festivWriteCachedSection(section);

      const reTest = /\[nav:(articles|evenements)\]/i;
      const reReplace = /\s*\[nav:(articles|evenements)\]\s*/gi;
      const walker = document.createTreeWalker(el, 4, null); // 4 = SHOW_TEXT
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (!n?.nodeValue) continue;
        if (!reTest.test(n.nodeValue)) continue;
        n.nodeValue = n.nodeValue.replace(reReplace, " ").replace(/\s{2,}/g, " ");
      }

      return section;
    }
  } catch {}
  return null;
}

// --- 2) nettoyage global de sécurité (si Simple.ink réinjecte le texte plus tard) ---
function festivCleanupNavMarkersEverywhere() {
  try {
    const reTest = /\[nav:(articles|evenements)\]/i;
    const reReplace = /\s*\[nav:(articles|evenements)\]\s*/gi;
    const walker = document.createTreeWalker(document.body, 4, null); // 4 = SHOW_TEXT
    while (walker.nextNode()) {
      const n = walker.currentNode;
      if (!n?.nodeValue) continue;
      if (!reTest.test(n.nodeValue)) continue;
      n.nodeValue = n.nodeValue.replace(reReplace, " ").replace(/\s{2,}/g, " ");
    }
  } catch {}
}

// --- 3) applique le bouton actif dans le header ---
function festivApplyActiveHeaderLink() {
  try {
    const links = Array.from(document.querySelectorAll(".custom-header__links__link"));
    if (!links.length) return;

    // helpers
    const normalizePath = (href) => {
      try {
        const u = new URL(href, window.location.origin);
        return (u.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
      } catch {
        return "";
      }
    };

    const byLabel = (label) =>
      links.find((a) => (a.textContent || "").trim().toLowerCase() === label);

    // IMPORTANT : on s’appuie d’abord sur le libellé (le plus stable)
    const linkArticles = byLabel("articles") || links.find((a) => normalizePath(a.getAttribute("href") || "").includes("/blog-"));
    const linkEvents   = byLabel("événements") || byLabel("evenements") || links.find((a) => normalizePath(a.getAttribute("href") || "").includes("/nos-evenements-"));

    const setActive = (a) => {
      links.forEach((x) => x.classList.remove("is-active"));
      if (a) a.classList.add("is-active");
    };

    // A) PRIORITÉ 1 : marqueur présent sur la page (pages enfants)
    const markerSection = festivDetectAndCleanupNavMarker();
    if (markerSection === "articles") { setActive(linkArticles); return; }
    if (markerSection === "evenements") { setActive(linkEvents); return; }

    // B) PRIORITÉ 2 : pages “listing” reconnaissables
    const curPath = (window.location.pathname || "/").toLowerCase();
    if (curPath.includes("/blog-")) { festivWriteCachedSection("articles"); setActive(linkArticles); return; }
    if (curPath.includes("/nos-evenements-")) { festivWriteCachedSection("evenements"); setActive(linkEvents); return; }

    // C) PRIORITÉ 3 : cache PAR PAGE (évite le bug “reste bloqué sur événements”)
    const cached = festivReadCachedSection();
    if (cached === "articles") { setActive(linkArticles); return; }
    if (cached === "evenements") { setActive(linkEvents); return; }

    // D) fallback : match exact sur pathname (pages statiques)
    const curNorm = curPath.replace(/\/+$/, "") || "/";
    const exact = links.find((a) => normalizePath(a.getAttribute("href") || "") === curNorm);
    if (exact) { setActive(exact); return; }

    // E) fallback : contient (rare)
    const contains = links.find((a) => {
      const p = normalizePath(a.getAttribute("href") || "");
      return p && p !== "/" && curNorm.includes(p);
    });
    if (contains) { setActive(contains); return; }

  } catch (e) {
    console.warn("[festiv20] festivApplyActiveHeaderLink error:", e);
  }
}

// --- 4) runner NAV (appelé souvent, safe) ---
function festivRunNav() {
  // 1) applique l’actif
  festivApplyActiveHeaderLink();

  // 2) nettoie (au cas où Simple réinjecte)
  festivCleanupNavMarkersEverywhere();
}


// =========================================
// FILLOUT — watchdog anti "formulaire absent"
// - Fillout init peut rater quand Simple.ink reconstruit le DOM
// - On poke en rechargeant le script (cache-bust) si aucune iframe n’apparaît
// - Fallback final: iframe directe
// =========================================
const FILLOUT_SCRIPT_BASE = "https://server.fillout.com/embed/v1/";

function ensureFilloutScript() {
  try {
    const already = [...document.scripts].some((s) => (s.src || "").startsWith(FILLOUT_SCRIPT_BASE));
    if (already) return;
    const s = document.createElement("script");
    s.src = FILLOUT_SCRIPT_BASE;
    s.async = true;
    document.head.appendChild(s);
  } catch {}
}

// “poke” = recharge le script avec un param pour forcer l’exécution à nouveau
function pokeFilloutScript() {
  try {
    const s = document.createElement("script");
    s.src = FILLOUT_SCRIPT_BASE + "?v=" + Date.now();
    s.async = true;
    document.head.appendChild(s);
  } catch {}
}

function filloutHasIframeInside(host) {
  try {
    return !!host.querySelector('iframe[src*="fillout.com"], iframe[src*="embed.fillout.com"], iframe[src*="server.fillout.com"]');
  } catch {
    return false;
  }
}

// fallback ultime (si Fillout init ne prend jamais)
function mountFilloutIframeFallback(host) {
  try {
    const id = host.getAttribute("data-fillout-id");
    if (!id) return;

    // évite double fallback
    if (host.dataset.festivFilloutFallback === "1") return;
    host.dataset.festivFilloutFallback = "1";

    const parent = encodeURIComponent(window.location.href.split("#")[0]);
    const src =
      `https://embed.fillout.com/t/${encodeURIComponent(id)}` +
      `?fillout-embed-type=standard` +
      `&fillout-embed-parent-page=${parent}` +
      `&fillout-embed-dynamic-resize=true`;

    host.innerHTML = "";
    host.style.position = "relative";
    host.style.width = "100%";
    host.style.minHeight = host.style.minHeight || "520px";

    const iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = id;
    iframe.style.border = "0";
    iframe.style.width = "100%";
    iframe.style.minHeight = host.style.minHeight || "520px";
    iframe.allow = "microphone; camera; geolocation";

    host.appendChild(iframe);
  } catch {}
}

function kickFilloutWatchdog() {
  try {
    // évite de lancer 15 watchdogs en parallèle
    if (window.__FESTIV_FILLOUT_WATCHDOG_T) clearTimeout(window.__FESTIV_FILLOUT_WATCHDOG_T);

    const hosts = Array.from(document.querySelectorAll(".festiv-fillout[data-fillout-id]"));
    if (!hosts.length) return;

    ensureFilloutScript();

    const schedule = [150, 600, 1400, 2600, 4200, 6500]; // timings “humains”
    let step = 0;

    const tick = () => {
      step++;

      let missing = 0;
      for (const host of hosts) {
        // si déjà OK, rien
        if (filloutHasIframeInside(host)) {
          host.dataset.festivFilloutOk = "1";
          continue;
        }
        missing++;

        // poke 1 ou 2 fois max
        const pokes = Number(host.dataset.festivFilloutPokes || "0");
        if (pokes < 2) {
          host.dataset.festivFilloutPokes = String(pokes + 1);
          pokeFilloutScript();
          continue;
        }

        // dernier recours si toujours rien après plusieurs passes
        if (step >= 5) mountFilloutIframeFallback(host);
      }

      if (missing <= 0) return; // tout est bon
      if (step >= schedule.length) return;

      window.__FESTIV_FILLOUT_WATCHDOG_T = setTimeout(tick, schedule[step]);
    };

    window.__FESTIV_FILLOUT_WATCHDOG_T = setTimeout(tick, schedule[0]);
  } catch {}
}

   
  // =========================================
  // runAll (load + rebuild DOM)
  // =========================================
  function runAll() {
  if (window.__FESTIV_RUNALL_LOCK) return;
  window.__FESTIV_RUNALL_LOCK = true;

  try {
    applySavedTheme();

    makeLogoClickable();
    formatDates();
    cleanupSimpleInkTZInDates();

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

    bindCalendarI18nHooks();
    translateNotionCalendar();
    setupGlobalStickers();

    // ✅ NAV (remplace setActiveHeaderLink + cleanupNavMarkers)
    festivRunNav();
    setTimeout(festivRunNav, 250);
    setTimeout(festivRunNav, 1000);
    setTimeout(festivRunNav, 2500);

    initThemeToggle();

    shortcodeContactForm();
    shortcodeInscriptionForm();
    kickFilloutWatchdog();
    setTimeout(kickFilloutWatchdog, 800);
    setTimeout(kickFilloutWatchdog, 2500);
    setupWeatherWidget();

    initDisqus(false);
  } finally {
    window.__FESTIV_RUNALL_LOCK = false;
  }
}


  // =========================================
  // Observer : relance runAll si Simple.ink reconstruit le DOM
  // (ignore Disqus)
  // =========================================
  function isDisqusRelatedNode(node) {
  if (!node || node.nodeType !== 1) return false;
  const el = node;

  // Disqus
  if (el.closest?.("#disqus_thread, .festiv-disqus-wrap")) return true;
  if (el.matches?.('iframe[src*="disqus"], iframe[src*="disqus.com"]')) return true;

  // Recaptcha (Disqus)
  if (el.matches?.('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha.net"]')) return true;

  // ✅ Fillout (évite de relancer runAll pendant l'init)
  if (el.closest?.(".festiv-fillout")) return true;
  if (el.matches?.('iframe[src*="fillout"], iframe[src*="server.fillout.com"]')) return true;
  if (el.querySelector?.('iframe[src*="fillout"], iframe[src*="server.fillout.com"]')) return true;

  // ✅ WeatherWidget.io (pareil)
  if (el.closest?.(".weatherwidget-io")) return true;
  if (el.matches?.('iframe[src*="weatherwidget"], iframe[src*="weatherwidget.io"]')) return true;
  if (el.querySelector?.('iframe[src*="weatherwidget"], iframe[src*="weatherwidget.io"]')) return true;

  // heuristiques
  if (el.id && el.id.startsWith("dsq-")) return true;
  if ((el.className || "").toString().toLowerCase().includes("disqus")) return true;

  if (el.querySelector?.('iframe[src*="disqus"], iframe[src*="recaptcha"]')) return true;

  return false;
}

  // =========================================
  // Boot
  // =========================================
  onReady(() => {
    log("loaded ✅");

    // Au refresh : CookieHub peut mettre un peu de temps à exposer hasConsented()
    // -> on retente Disqus doucement
    setTimeout(() => { try { initDisqus(false); } catch {} }, 400);
    setTimeout(() => { try { initDisqus(false); } catch {} }, 1200);
    setTimeout(() => { try { initDisqus(false); } catch {} }, 2500);

    // petits retours internes
    setTimeout(fixInternalAnchors, 500);
    setTimeout(fixInternalAnchors, 1500);

    bindCookieHubForDisqus();
    runAll();
    setTimeout(cleanupSimpleInkTZInDates, 120);
    setTimeout(cleanupSimpleInkTZInDates, 600);
    setTimeout(cleanupSimpleInkTZInDates, 1500);

    let t = null;
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (isDisqusRelatedNode(m.target)) return;
        for (const n of m.addedNodes || []) {
          if (isDisqusRelatedNode(n)) return;
        }
      }

      clearTimeout(t);
      t = setTimeout(runAll, 180);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
