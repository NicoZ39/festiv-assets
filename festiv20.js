/* festiv20.js — clean & robuste (Simple.ink + CookieHub + Disqus)
   - Thème (auto OS + override) + bouton
   - Meteoblue sync thème
   - Disqus : placeholder si pas de consentement + recheck si CookieHub pas prêt au refresh
   - Disqus : remount + watchdog si l’iframe n’apparaît pas après refresh
   - Dates FR + cleanup "06:00 (Europe/Paris)"
   - Footer colonnes + copyright
   - UX: tables scroll, retour shortcode, notion buttons, fix target=_blank
   - FAQ accordion, i18n search, back-to-top, calendrier FR
   - Stickers 🧷 (H4)
   - NAV actif via marqueurs {{nav:articles}} / {{nav:evenements}}
   - WeatherWidget via shortcode {{meteo_ounans}} (page où il est présent)
*/
(function () {
  "use strict";

  const locale = "fr-FR";
  const DEBUG = true;

  // ====== DISQUS ======
  const DISQUS_SHORTNAME = "festivounans";
  const DISQUS_MARKER_TEXT = "💬 Commentaires";
  const DISQUS_COOKIE_CATS_OK = ["preferences", "functional", "analytics", "statistics", "performance", "marketing"];

  // ====== SHORTCODES ======
  const SHORTCODES = {
    weather: "{{meteo_ounans}}",
    navRe: /\{\{\s*nav\s*:\s*(articles|evenements)\s*\}\}|\[\s*nav\s*:\s*(articles|evenements)\s*\]/gi,
  };

  // -----------------------------------------
  // utils
  // -----------------------------------------
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

  // -----------------------------------------
  // THEME (auto système + override manuel)
  // -----------------------------------------
  function getSavedTheme() {
    try {
      const v = localStorage.getItem("festiv-theme");
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

      if (window.__FESTIV_LAST_THEME === theme && document.documentElement.classList.contains("festiv-theme-ready")) {
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
          // (on ne reset pas Disqus ici)
        }
      };

      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (e) {
      console.error("[festiv20] bindSystemThemeListener error:", e);
    }
  }

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

          try {
            localStorage.setItem("festiv-theme", isDark ? "dark" : "light");
          } catch {}

          window.__FESTIV_LAST_THEME = isDark ? "dark" : "light";
          syncAutoIndicator();

          // Meteoblue
          syncMeteoblueTheme();
          setTimeout(syncMeteoblueTheme, 300);
          setTimeout(syncMeteoblueTheme, 1200);

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

          try {
            localStorage.removeItem("festiv-theme");
          } catch {}

          applySavedTheme();
          syncAutoIndicator();

          syncMeteoblueTheme();
          setTimeout(syncMeteoblueTheme, 300);
          setTimeout(syncMeteoblueTheme, 1200);

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

  // applique thème ASAP
  applySavedTheme();
  bindSystemThemeListener();

  // -----------------------------------------
  // 1) Logo cliquable
  // -----------------------------------------
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

  // -----------------------------------------
  // 2) Dates FR + cleanup TZ
  // -----------------------------------------
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

  function cleanupSimpleInkTZInDates() {
    try {
      const els = document.querySelectorAll(".notion-property-date");

      els.forEach((el) => {
        const txt = (el.textContent || "").replace(/\u00A0/g, " ").trim();
        if (!txt) return;

        const next = txt
          .replace(/\s+\d{1,2}:\d{2}\s*\(\s*[A-Za-z_\/+-]+\s*\)\s*$/i, "")
          .replace(/\s*\(\s*[A-Za-z_\/+-]+\s*\)\s*$/i, "")
          .trim();

        if (next !== txt) el.textContent = next;
      });
    } catch (e) {
      console.error("[festiv20] cleanupSimpleInkTZInDates error:", e);
    }
  }

  // -----------------------------------------
  // 3) Footer colonnes + copyright
  // -----------------------------------------
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
        </div>
      `;
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

  // -----------------------------------------
  // 4) Cover
  // -----------------------------------------
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

  // -----------------------------------------
  // 5) Tables scroll UX
  // -----------------------------------------
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

  // -----------------------------------------
  // 6) Shortcode [retour]
  // -----------------------------------------
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

  // -----------------------------------------
  // 7) Notion buttons mapping
  // -----------------------------------------
  function bindNotionButtons() {
    try {
      if (window.__FESTIV_NOTION_BTNS_BOUND) return;
      window.__FESTIV_NOTION_BTNS_BOUND = true;

      const BUTTON_LINKS = {
        "👉 Inscription Exposants": "https://festiv-ounans.thesimple.ink/1a46ae9a-98f2-80b4-8cfa-f0f3981dd64a",
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

  // -----------------------------------------
  // 8) Corrige les liens internes target=_blank
  // -----------------------------------------
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

  // -----------------------------------------
  // FAQ accordion anim
  // -----------------------------------------
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

  // -----------------------------------------
  // i18n Search
  // -----------------------------------------
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

  // -----------------------------------------
  // Back-to-top
  // -----------------------------------------
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

  // -----------------------------------------
  // Calendrier Notion FR
  // -----------------------------------------
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

  // -----------------------------------------
  // Fillout shortcodes
  // -----------------------------------------
  function ensureScriptOnce(src) {
    const already = [...document.scripts].some((s) => (s.src || "") === src);
    if (already) return true;
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    document.head.appendChild(s);
    return true;
  }

  function shortcodeFillout(shortcode, filloutId) {
    try {
      const nodes = document.querySelectorAll(".notion-text, .notion-callout-text .notion-text, .notion-paragraph");
      let found = false;

      nodes.forEach((node) => {
        if (!node || !node.dataset) return;
        const doneKey = "festivFilloutDone_" + shortcode;
        if (node.dataset[doneKey] === "1") return;

        const txt = (node.textContent || "").trim();
        if (!txt.includes(shortcode)) return;

        node.dataset[doneKey] = "1";
        found = true;

        const mount = document.createElement("div");
        mount.className = "festiv-fillout";
        mount.style.width = "100%";
        mount.style.minHeight = "520px";
        mount.setAttribute("data-fillout-id", filloutId);
        mount.setAttribute("data-fillout-embed-type", "standard");
        mount.setAttribute("data-fillout-inherit-parameters", "");
        mount.setAttribute("data-fillout-dynamic-resize", "");

        if (txt === shortcode) {
          node.textContent = "";
          node.appendChild(mount);
          return;
        }

        const parts = (node.textContent || "").split(shortcode);
        node.textContent = "";
        parts.forEach((part, i) => {
          if (part) node.appendChild(document.createTextNode(part));
          if (i < parts.length - 1) node.appendChild(mount.cloneNode(true));
        });
      });

      if (found) ensureScriptOnce("https://server.fillout.com/embed/v1/");
    } catch (e) {
      console.error("[festiv20] shortcodeFillout error:", e);
    }
  }

  function shortcodeContactForm() {
    shortcodeFillout("[contact-form]", "tZMYfrqCWAus");
  }

  function shortcodeInscriptionForm() {
    shortcodeFillout("[inscription-form]", "jYPEHAqG3Lus");
  }

  // -----------------------------------------
  // Meteoblue theme sync
  // -----------------------------------------
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
      try {
        url = new URL(current, window.location.href);
      } catch {
        return;
      }

      url.searchParams.set("layout", isDark ? "dark" : "bright");
      const next = url.toString();

      if (srcAttr !== null && srcAttr !== next) iframe.setAttribute("src", next);
      if (dataSrcAttr !== null && dataSrcAttr !== next) iframe.setAttribute("data-src", next);

      if (tries === 20) {
        setTimeout(() => syncMeteoblueTheme(3), 900);
        setTimeout(() => syncMeteoblueTheme(3), 2500);
      }
    } catch (e) {
      console.error("[festiv20] syncMeteoblueTheme error:", e);
    }
  }

  // -----------------------------------------
  // WeatherWidget.io via shortcode {{meteo_ounans}}
  // (ne fait RIEN si le shortcode n'existe pas sur la page)
  // -----------------------------------------
  function setupWeatherWidget() {
    try {
      const SHORTCODE = SHORTCODES.weather;

      const candidates = Array.from(
        document.querySelectorAll(
          ".notion-text, .notion-paragraph, .notion-callout, .notion-quote, [data-content-editable-leaf]"
        )
      );

      const host = candidates.find((el) => (el.textContent || "").includes(SHORTCODE));
      if (!host) return;

      // éviter ré-injection
      if (host.querySelector(".weatherwidget-io")) {
        host.innerHTML = host.innerHTML.replaceAll(SHORTCODE, "");
        return;
      }

      host.innerHTML = host.innerHTML.replaceAll(SHORTCODE, "");

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

      const SCRIPT_ID = "weatherwidget-io-js";
      if (!document.getElementById(SCRIPT_ID)) {
        const s = document.createElement("script");
        s.id = SCRIPT_ID;
        s.src = "https://weatherwidget.io/js/widget.min.js";
        document.head.appendChild(s);
      }

      if (window.__weatherwidget_init) window.__weatherwidget_init();
    } catch (e) {
      if (DEBUG) console.warn("[festiv20] WeatherWidget setup error:", e);
    }
  }

  // -----------------------------------------
  // Stickers 🧷 (H4)
  // -----------------------------------------
  function setupFestivGlobalStickers() {
    try {
      const TRIGGER = "🧷";
      const SELECTOR = "h4.notion-h.notion-h3 a.notion-h-title";
      const CLASS_STICKER = "festiv-sticker";
      const CLASS_INVIEW = "festiv-sticker--inview";

      const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const titles = Array.from(document.querySelectorAll(SELECTOR));
      if (!titles.length) return;

      const getRawTriggerText = (a) => {
        const t1 = (a.textContent || "").replace(/\s+/g, " ").trim();
        const t2 = (a.getAttribute("title") || "").replace(/\s+/g, " ").trim();
        return t1 || t2;
      };

      const hasTrigger = (a) => getRawTriggerText(a).startsWith(TRIGGER);

      const stripTriggerFromFirstTextNode = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        let node;
        while ((node = walker.nextNode())) {
          const t = node.nodeValue || "";
          if (!t) continue;

          const cleaned = t.replace(/\s+/g, " ");
          const trimmedStart = cleaned.trimStart();
          if (!trimmedStart.startsWith(TRIGGER)) continue;

          const idx = t.indexOf(TRIGGER);
          if (idx >= 0) {
            const before = t.slice(0, idx);
            let after = t.slice(idx + TRIGGER.length);
            after = after.replace(/^\s+/, "");
            node.nodeValue = before + after;
          }
          break;
        }
      };

      const stripTriggerFromTitleAttr = (a) => {
        const t = a.getAttribute("title");
        if (!t) return;
        const cleaned = t.replace(/\s+/g, " ").trimStart();
        if (!cleaned.startsWith(TRIGGER)) return;
        a.setAttribute("title", cleaned.replace(TRIGGER, "").trimStart());
      };

      const disableLink = (a) => {
        if (a.dataset.festivNoClick === "1") return;
        a.dataset.festivNoClick = "1";

        a.removeAttribute("href");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("role", "text");
        a.setAttribute("tabindex", "-1");

        a.addEventListener(
          "click",
          (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
          },
          true
        );

        a.addEventListener(
          "keydown",
          (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
            }
          },
          true
        );
      };

      const stickers = [];
      titles.forEach((a) => {
        if (!hasTrigger(a)) return;

        if (!a.classList.contains(CLASS_STICKER)) {
          a.classList.add(CLASS_STICKER);
          stripTriggerFromFirstTextNode(a);
          stripTriggerFromTitleAttr(a);
        }

        disableLink(a);
        stickers.push(a);
      });

      if (!stickers.length) return;

      if (reduceMotion) {
        stickers.forEach((a) => a.classList.add(CLASS_INVIEW));
        return;
      }

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target;
            if (entry.isIntersecting) el.classList.add(CLASS_INVIEW);
            else el.classList.remove(CLASS_INVIEW);
          });
        },
        { threshold: 0.35, rootMargin: "0px 0px -10% 0px" }
      );

      stickers.forEach((a) => io.observe(a));
    } catch (e) {
      if (DEBUG) console.warn("[festiv20] Stickers error:", e);
    }
  }

  // -----------------------------------------
  // NAV helpers (markers + cache) — GLOBAL
  // -----------------------------------------
  const FESTIV_NAV = {
    re: SHORTCODES.navRe,
    selector: ".notion-text, .notion-paragraph, .notion-callout-text .notion-text, .notion-quote, [data-content-editable-leaf]",

    cacheKey() {
      const p = (window.location.pathname || "/").toLowerCase();
      return "festiv-nav-section:" + p;
    },

    readCache() {
      try {
        return sessionStorage.getItem(this.cacheKey()) || null;
      } catch {
        try {
          return localStorage.getItem(this.cacheKey()) || null;
        } catch {
          return null;
        }
      }
    },

    writeCache(section) {
      try {
        sessionStorage.setItem(this.cacheKey(), section);
        return;
      } catch {}
      try {
        localStorage.setItem(this.cacheKey(), section);
      } catch {}
    },

    detectAndCleanupInElement(el) {
      const raw = el ? (el.textContent || "") : "";
      if (!raw) return null;

      // reset lastIndex (regex global)
      this.re.lastIndex = 0;

      let found = null;
      raw.replace(this.re, (_m, a1, a2) => {
        found = (a1 || a2 || "").toLowerCase();
        return _m;
      });

      if (!found) return null;

      try {
        this.re.lastIndex = 0;
        const cleaned = raw.replace(this.re, "").replace(/\s{2,}/g, " ").trim();
        el.textContent = cleaned;
      } catch {}

      return found;
    },
  };

  function festivDetectAndCleanupNavMarker() {
    try {
      const nodes = Array.from(document.querySelectorAll(FESTIV_NAV.selector));
      for (const el of nodes) {
        if (el.dataset && el.dataset.festivNavMarkerDone === "1") continue;

        const section = FESTIV_NAV.detectAndCleanupInElement(el);
        if (el.dataset) el.dataset.festivNavMarkerDone = "1";

        if (section) {
          FESTIV_NAV.writeCache(section);
          return section;
        }
      }
    } catch (e) {
      console.warn("[festiv20] festivDetectAndCleanupNavMarker error:", e);
    }
    return null;
  }

  function festivWriteCachedSection(section) {
    try {
      if (section === "articles" || section === "evenements") FESTIV_NAV.writeCache(section);
    } catch {}
  }

  function festivReadCachedSection() {
    try {
      const v = FESTIV_NAV.readCache();
      return v === "articles" || v === "evenements" ? v : null;
    } catch {
      return null;
    }
  }

  function festivCleanupNavMarkersEverywhere() {
    try {
      const nodes = Array.from(document.querySelectorAll(FESTIV_NAV.selector));
      nodes.forEach((el) => {
        const t = (el.textContent || "");
        if (!t) return;

        FESTIV_NAV.re.lastIndex = 0;
        if (!FESTIV_NAV.re.test(t)) return;

        FESTIV_NAV.re.lastIndex = 0;
        const cleaned = t.replace(FESTIV_NAV.re, "").replace(/\s{2,}/g, " ").trim();
        if (cleaned !== t) el.textContent = cleaned;
      });
    } catch (e) {
      console.warn("[festiv20] festivCleanupNavMarkersEverywhere error:", e);
    }
  }

  function festivApplyActiveHeaderLink() {
    try {
      const links = Array.from(document.querySelectorAll(".custom-header__links__link"));
      if (!links.length) return;

      const normalizePath = (href) => {
        try {
          const u = new URL(href, window.location.origin);
          return (u.pathname || "/").toLowerCase().replace(/\/+$/, "") || "/";
        } catch {
          return "";
        }
      };

      const byLabel = (label) => links.find((a) => (a.textContent || "").trim().toLowerCase() === label);

      const linkArticles =
        byLabel("articles") || links.find((a) => normalizePath(a.getAttribute("href") || "").includes("/blog-"));
      const linkEvents =
        byLabel("événements") ||
        byLabel("evenements") ||
        links.find((a) => normalizePath(a.getAttribute("href") || "").includes("/nos-evenements-"));

      const setActive = (a) => {
        links.forEach((x) => x.classList.remove("is-active"));
        if (a) a.classList.add("is-active");
      };

      // A) marqueur page
      const markerSection = festivDetectAndCleanupNavMarker();
      if (markerSection === "articles") {
        setActive(linkArticles);
        return;
      }
      if (markerSection === "evenements") {
        setActive(linkEvents);
        return;
      }

      // B) listing
      const curPath = (window.location.pathname || "/").toLowerCase();
      if (curPath.includes("/blog-")) {
        festivWriteCachedSection("articles");
        setActive(linkArticles);
        return;
      }
      if (curPath.includes("/nos-evenements-")) {
        festivWriteCachedSection("evenements");
        setActive(linkEvents);
        return;
      }

      // C) cache par page
      const cached = festivReadCachedSection();
      if (cached === "articles") {
        setActive(linkArticles);
        return;
      }
      if (cached === "evenements") {
        setActive(linkEvents);
        return;
      }

      // D) exact pathname
      const curNorm = curPath.replace(/\/+$/, "") || "/";
      const exact = links.find((a) => normalizePath(a.getAttribute("href") || "") === curNorm);
      if (exact) {
        setActive(exact);
        return;
      }

      // E) contient
      const contains = links.find((a) => {
        const p = normalizePath(a.getAttribute("href") || "");
        return p && p !== "/" && curNorm.includes(p);
      });
      if (contains) setActive(contains);
    } catch (e) {
      console.warn("[festiv20] festivApplyActiveHeaderLink error:", e);
    }
  }

  function festivRunNav() {
    festivApplyActiveHeaderLink();
    festivCleanupNavMarkersEverywhere();
  }

  // -----------------------------------------
  // DISQUS
  // -----------------------------------------
  function injectDisqusGuestTip() {
    try {
      const marker = findDisqusMarker();
      if (!marker) return;

      if (marker.dataset.festivDisqusGuestTipDone === "1") return;
      marker.dataset.festivDisqusGuestTipDone = "1";

      if (!document.getElementById("festiv-disqus-guest-tip-style")) {
        const style = document.createElement("style");
        style.id = "festiv-disqus-guest-tip-style";
        style.textContent = `
          .festiv-disqus-guest-tip{
            width: min(980px, calc(100% - 24px));
            margin: 10px 0 14px 0;
            padding: 12px 14px;
            border-radius: 12px;
            line-height: 1.4;
            font-size: 14px;
            background: rgba(255,255,255,0.85);
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 6px 20px rgba(0,0,0,0.08);
            backdrop-filter: blur(8px);
          }
          .dark-mode .festiv-disqus-guest-tip{
            background: rgba(15,15,15,0.72);
            border: 1px solid rgba(255,255,255,0.12);
            box-shadow: 0 10px 26px rgba(0,0,0,0.35);
          }
          .festiv-disqus-guest-tip b{font-weight:700;}
        `;
        document.head.appendChild(style);
      }

      const box = document.createElement("div");
      box.className = "festiv-disqus-guest-tip";
      box.innerHTML = `
        <b>Commenter sans créer de compte ?</b>
        Cliquez dans le champ « Nom », puis cochez l’option « Je préfère poster en tant qu’invité ».
        Vous pourrez ainsi publier votre commentaire sans vous connecter ni créer de compte.
      `;
      marker.insertAdjacentElement("afterend", box);
    } catch (e) {
      console.error("[festiv20] injectDisqusGuestTip error:", e);
    }
  }

  function patchDisqusAgeGateFR() {
    try {
      const FROM = "Acknowledge I am 18 or older";
      const TO = "Je confirme avoir 18 ans ou plus";
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n && n.nodeValue && n.nodeValue.includes(FROM)) {
          n.nodeValue = n.nodeValue.replaceAll(FROM, TO);
        }
      }
    } catch {}
  }

  function getDisqusConsentStatus() {
    const CH = window.cookiehub;
    if (!CH) return null;

    if (typeof CH.isReady === "function" && !CH.isReady()) return null;
    if (typeof CH.hasAnswered === "function" && !CH.hasAnswered()) return false;

    if (typeof CH.hasConsented !== "function") return null;

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
    const MAX_TRIES = 140;
    const DELAY = 150;

    const tick = () => {
      tries++;
      const consent = getDisqusConsentStatus();

      if (consent === true) {
        window.__FESTIV_DISQUS_CONSENT_POLLING = false;
        safeTry(() => initDisqus(true));
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

  function findDisqusMarker() {
    return [...document.querySelectorAll("h1,h2,h3")].find((h) => (h.textContent || "").trim() === DISQUS_MARKER_TEXT) || null;
  }

  function disqusHasIframe() {
    return !!document.querySelector('#disqus_thread iframe[src*="disqus"]');
  }

  function ensureDisqusWrapAfter(marker) {
    let wrap = document.querySelector(".festiv-disqus-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "festiv-disqus-wrap";
      marker.insertAdjacentElement("afterend", wrap);
    }
    return wrap;
  }

  function showDisqusConsentPlaceholder(marker) {
    const wrap = ensureDisqusWrapAfter(marker);
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

  function ensureDisqusThread(marker) {
    const wrap = ensureDisqusWrapAfter(marker);
    wrap.querySelector(".festiv-disqus-consent")?.remove();

    let thread = document.getElementById("disqus_thread");
    if (!thread) {
      thread = document.createElement("div");
      thread.id = "disqus_thread";
      wrap.appendChild(thread);
    }
    return thread;
  }

  function remountDisqusThread(marker) {
    const wrap = document.querySelector(".festiv-disqus-wrap") || ensureDisqusWrapAfter(marker);
    document.getElementById("disqus_thread")?.remove();

    const thread = document.createElement("div");
    thread.id = "disqus_thread";
    wrap.appendChild(thread);
  }

  function initDisqus(force = false) {
    try {
      document.documentElement.setAttribute("lang", "fr");

      const marker = findDisqusMarker();
      if (!marker) return;

      const consentStatus = getDisqusConsentStatus();
      const consentOk = consentStatus === true;

      if (!consentOk) {
        showDisqusConsentPlaceholder(marker);
        scheduleDisqusConsentRecheck();
        return;
      }

      ensureDisqusThread(marker);

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

      if (window.DISQUS && typeof window.DISQUS.reset === "function") {
        try {
          const ae = document.activeElement;
          if (ae && ae.tagName === "IFRAME" && !force) return;
        } catch {}

        window.__FESTIV_DISQUS_KEY = pageKey;
        window.__FESTIV_DISQUS_READY = true;

        if (!hasIframe) remountDisqusThread(marker);

        window.DISQUS.reset({ reload: true, config: disqusConfig });
        setTimeout(patchDisqusAgeGateFR, 300);
        setTimeout(patchDisqusAgeGateFR, 900);

        setTimeout(() => {
          if (!disqusHasIframe()) {
            remountDisqusThread(marker);
            safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
          }
        }, 1200);

        return;
      }

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

          const marker = findDisqusMarker();
          if (marker && !disqusHasIframe()) remountDisqusThread(marker);

          window.__FESTIV_DISQUS_KEY = pageId + "||" + pageUrl;
          window.__FESTIV_DISQUS_READY = true;

          window.DISQUS.reset({ reload: true, config: disqusConfig });
          setTimeout(patchDisqusAgeGateFR, 400);
          setTimeout(patchDisqusAgeGateFR, 1100);

          setTimeout(() => {
            if (marker && !disqusHasIframe()) {
              remountDisqusThread(marker);
              safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
            }
          }, 1200);
        } catch {}
      }, 120);
    } catch (e) {
      console.error("[festiv20] refreshDisqusTheme error:", e);
    }
  }

  window.__festivInitDisqus = initDisqus;

  function bindCookieHubForDisqus() {
    try {
      if (window.__FESTIV_COOKIEHUB_DISQUS_BOUND) return;
      window.__FESTIV_COOKIEHUB_DISQUS_BOUND = true;

      const hard = () => {
        setTimeout(() => safeTry(() => initDisqus(true)), 50);
        setTimeout(() => safeTry(() => initDisqus(true)), 250);
        setTimeout(() => safeTry(() => initDisqus(true)), 900);
      };

      const CH = window.cookiehub;
      if (CH && typeof CH.on === "function") {
        CH.on("onAllow", hard);
        CH.on("onStatusChange", hard);
        CH.on("onRevoke", hard);
      } else {
        let n = 0;
        const poke = () => {
          n++;
          safeTry(() => initDisqus(false));
          if (n < 12) setTimeout(poke, 250);
        };
        setTimeout(poke, 200);
      }
    } catch (e) {
      console.error("[festiv20] bindCookieHubForDisqus error:", e);
    }
  }

  // -----------------------------------------
  // runAll
  // -----------------------------------------
  function runAll() {
    if (window.__FESTIV_RUNALL_LOCK) return;
    window.__FESTIV_RUNALL_LOCK = true;

    try {
      applySavedTheme();

      syncMeteoblueTheme();
      setTimeout(syncMeteoblueTheme, 300);

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

      bindSystemThemeListener();
      bindCalendarI18nHooks();
      translateNotionCalendar();
      setupFestivGlobalStickers();

      // NAV
      festivRunNav();
      setTimeout(festivRunNav, 250);
      setTimeout(festivRunNav, 1000);
      setTimeout(festivRunNav, 2500);

      initThemeToggle();

      shortcodeContactForm();
      shortcodeInscriptionForm();

      // WeatherWidget : ne fait rien si pas de shortcode sur la page
      setupWeatherWidget();

      injectDisqusGuestTip();
      initDisqus(false);
    } finally {
      window.__FESTIV_RUNALL_LOCK = false;
    }
  }

  // -----------------------------------------
  // Observer : relance runAll si Simple.ink reconstruit le DOM (ignore Disqus)
  // -----------------------------------------
  function isDisqusRelatedNode(node) {
    if (!node || node.nodeType !== 1) return false;
    const el = node;

    if (el.closest?.("#disqus_thread, .festiv-disqus-wrap")) return true;
    if (el.matches?.('iframe[src*="disqus"], iframe[src*="disqus.com"]')) return true;
    if (el.matches?.('iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"], iframe[src*="recaptcha.net"]')) return true;

    if (el.id && el.id.startsWith("dsq-")) return true;
    if ((el.className || "").toString().toLowerCase().includes("disqus")) return true;

    if (el.querySelector?.('iframe[src*="disqus"], iframe[src*="recaptcha"]')) return true;

    return false;
  }

  // -----------------------------------------
  // Exports (tu as dit que tu "as besoin de ces fonctions")
  // -> accès via window.__festiv.*
  // -----------------------------------------
  function exportAPI() {
    window.__festiv = window.__festiv || {};

    // Accueil uniquement (mais safe partout)
    window.__festiv.setupWeatherWidget = setupWeatherWidget;

    // NAV helpers
    window.__festiv.festivDetectAndCleanupNavMarker = festivDetectAndCleanupNavMarker;
    window.__festiv.festivWriteCachedSection = festivWriteCachedSection;
    window.__festiv.festivReadCachedSection = festivReadCachedSection;
    window.__festiv.festivCleanupNavMarkersEverywhere = festivCleanupNavMarkersEverywhere;
    window.__festiv.festivApplyActiveHeaderLink = festivApplyActiveHeaderLink;
    window.__festiv.festivRunNav = festivRunNav;

    // (optionnel) runner
    window.__festiv.runAll = runAll;
  }

  // -----------------------------------------
  // Boot
  // -----------------------------------------
  onReady(() => {
    log("loaded ✅");

    exportAPI();

    // Au refresh : CookieHub peut mettre un peu de temps
    setTimeout(() => safeTry(() => initDisqus(false)), 400);
    setTimeout(() => safeTry(() => initDisqus(false)), 1200);
    setTimeout(() => safeTry(() => initDisqus(false)), 2500);

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
      t = setTimeout(runAll, 80);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
