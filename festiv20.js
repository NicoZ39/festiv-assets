/* festiv20.js — “clean & robuste” (Simple.ink + CookieHub + Disqus)
   ✅ Thème (auto OS + override) + switch
   ✅ Meteoblue sync thème
   ✅ Disqus : attend CookieHub (ready + answered), placeholder si refus
   ✅ Disqus : “remount + watchdog” si iframe disparait après refresh
   ✅ runAll + MutationObserver (ignore Disqus)
*/
(function () {
  const DEBUG = true;
  const LOCALE = "fr-FR";

  // ====== DISQUS ======
  const DISQUS_SHORTNAME = "festivounans"; // <- ton shortname
  const DISQUS_MARKER_TEXT = "💬 Commentaires";

  // CookieHub : catégories qui autorisent Disqus (accepte si AU MOINS UNE est true)
  const DISQUS_COOKIE_CATS_OK = ["preferences", "functional", "analytics", "statistics", "performance", "marketing"];

  // =========================
  // Utils
  // =========================
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

  // =========================
  // THEME (auto système + override manuel)
  // =========================
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
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark-mode", isDark);
    document.documentElement.classList.add("festiv-theme-ready");

    const btn = document.getElementById("festiv-theme-toggle");
    if (btn) {
      btn.setAttribute("aria-pressed", isDark ? "true" : "false");
      btn.classList.toggle("is-dark", isDark);
    }
  }

  function applySavedTheme() {
    const theme = getEffectiveTheme();
    if (window.__FESTIV_LAST_THEME === theme && document.documentElement.classList.contains("festiv-theme-ready")) return;
    window.__FESTIV_LAST_THEME = theme;
    applyTheme(theme);
  }

  function isAutoMode() {
    return !getSavedTheme();
  }

  function syncAutoIndicator() {
    const wrap = document.getElementById("festiv-theme-toggle");
    if (!wrap) return;

    const auto = isAutoMode();
    wrap.classList.toggle("is-auto", auto);
    wrap.setAttribute("title", auto ? "Auto : suit le thème de ton appareil" : "Thème forcé • Double-clic : revenir en Auto");
  }

  function bindSystemThemeListener() {
    if (window.__FESTIV_SYS_THEME_BOUND) return;
    window.__FESTIV_SYS_THEME_BOUND = true;

    safeTry(() => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        if (!getSavedTheme()) {
          applySavedTheme();
          syncAutoIndicator();
          syncMeteoblueTheme();
          // pas de reset Disqus juste pour le thème auto
        }
      };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    });
  }

  // =========================
  // THEME TOGGLE (switch)
  // =========================
  let ignoreClickUntil = 0;

  function initThemeToggle() {
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

      wrap.addEventListener("click", (e) => {
        if (Date.now() < ignoreClickUntil) return;
        e.preventDefault();
        e.stopPropagation();

        const isDark = document.documentElement.classList.toggle("dark-mode");
        wrap.setAttribute("aria-pressed", isDark ? "true" : "false");
        wrap.classList.toggle("is-dark", isDark);

        safeTry(() => localStorage.setItem("festiv-theme", isDark ? "dark" : "light"));
        window.__FESTIV_LAST_THEME = isDark ? "dark" : "light";
        syncAutoIndicator();

        syncMeteoblueTheme();
        setTimeout(syncMeteoblueTheme, 300);
        setTimeout(syncMeteoblueTheme, 1200);

        // refresh Disqus volontaire (thème)
        refreshDisqusTheme();
        setTimeout(refreshDisqusTheme, 350);
        setTimeout(refreshDisqusTheme, 1200);
      });

      wrap.addEventListener("dblclick", (e) => {
        e.preventDefault();
        e.stopPropagation();
        ignoreClickUntil = Date.now() + 350;

        safeTry(() => localStorage.removeItem("festiv-theme"));
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
  }

  // =========================
  // Meteoblue theme sync
  // =========================
  function syncMeteoblueTheme(tries = 20) {
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
  }

  // =========================
  // DISQUS — texte "18+"
  // =========================
  function patchDisqusAgeGateFR() {
    const FROM = "Acknowledge I am 18 or older";
    const TO = "Je confirme avoir 18 ans ou plus";

    safeTry(() => {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      while (walker.nextNode()) {
        const n = walker.currentNode;
        if (n && n.nodeValue && n.nodeValue.includes(FROM)) {
          n.nodeValue = n.nodeValue.replaceAll(FROM, TO);
        }
      }
    });
  }

  // =========================
  // DISQUS — CookieHub consent (true/false/null)
  // null = CookieHub pas prêt
  // =========================
  function getDisqusConsentStatus() {
    const CH = window.cookiehub;
    if (!CH) return null;

    // si CookieHub expose isReady / hasAnswered, on s’y fie
    if (typeof CH.isReady === "function" && !CH.isReady()) return null;
    if (typeof CH.hasAnswered === "function" && !CH.hasAnswered()) return false;

    if (typeof CH.hasConsented !== "function") return null;

    // accepte si au moins une catégorie autorise
    let sawAny = false;
    for (const c of DISQUS_COOKIE_CATS_OK) {
      const v = safeTry(() => CH.hasConsented(c));
      if (v === true) return true;
      if (v === false) sawAny = true;
    }

    // si on n’a vu aucune réponse exploitable, CookieHub est peut-être pas prêt
    return sawAny ? false : null;
  }

  function scheduleDisqusConsentRecheck() {
    if (window.__FESTIV_DISQUS_CONSENT_POLLING) return;
    window.__FESTIV_DISQUS_CONSENT_POLLING = true;

    let tries = 0;
    const MAX_TRIES = 140; // ~21s
    const DELAY = 150;

    const tick = () => {
      tries++;
      const consent = getDisqusConsentStatus();

      if (consent === true) {
        window.__FESTIV_DISQUS_CONSENT_POLLING = false;
        initDisqus(true);
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

  // =========================
  // DISQUS — helpers anti “iframe disparue”
  // =========================
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

    // si déjà là, ne pas dupliquer
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
      safeTry(() => {
        if (window.cookiehub?.openSettings) window.cookiehub.openSettings();
        else if (window.cookiehub?.openDialog) window.cookiehub.openDialog();
      });
    });
  }

  function ensureDisqusThread(marker) {
    const wrap = ensureDisqusWrapAfter(marker);

    // retire placeholder si existant
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
    const old = document.getElementById("disqus_thread");
    if (old) old.remove();

    const thread = document.createElement("div");
    thread.id = "disqus_thread";
    wrap.appendChild(thread);
  }

  // =========================
  // DISQUS — init (idempotent)
  // =========================
  function initDisqus(force = false) {
    document.documentElement.setAttribute("lang", "fr");

    const marker = findDisqusMarker();
    if (!marker) return;

    // consent
    const consent = getDisqusConsentStatus(); // true/false/null
    if (consent !== true) {
      showDisqusConsentPlaceholder(marker);
      // si CookieHub pas prêt : on repoll
      scheduleDisqusConsentRecheck();
      return;
    }

    // consent OK => thread
    ensureDisqusThread(marker);

    const pageUrl = window.location.href.split("#")[0];
    const pageId = window.location.pathname;
    const pageKey = pageId + "||" + pageUrl;

    const hasIframe = disqusHasIframe();

    // si déjà sur la même page ET iframe présente => rien
    if (!force && window.__FESTIV_DISQUS_KEY === pageKey && window.__FESTIV_DISQUS_READY && hasIframe) return;

    const disqusConfig = function () {
      this.page.url = pageUrl;
      this.page.identifier = pageId;
      this.language = "fr";
    };

    // si Disqus déjà chargé => reset (avec remount si iframe absente)
    if (window.DISQUS && typeof window.DISQUS.reset === "function") {
      // évite de reset si l’utilisateur est dans une iframe (anti “je tape et ça reset”)
      const ae = safeTry(() => document.activeElement);
      if (ae && ae.tagName === "IFRAME" && !force) return;

      window.__FESTIV_DISQUS_KEY = pageKey;
      window.__FESTIV_DISQUS_READY = true;

      if (!hasIframe) remountDisqusThread(marker);

      window.DISQUS.reset({ reload: true, config: disqusConfig });
      setTimeout(patchDisqusAgeGateFR, 300);
      setTimeout(patchDisqusAgeGateFR, 900);

      // watchdog : si toujours pas d’iframe, remount + reset une fois
      setTimeout(() => {
        if (!disqusHasIframe()) {
          remountDisqusThread(marker);
          safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
        }
      }, 1200);

      return;
    }

    // premier chargement
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
  }

  function refreshDisqusTheme() {
    if (!document.getElementById("disqus_thread")) return;
    if (!window.DISQUS || typeof window.DISQUS.reset !== "function") return;

    if (window.__FESTIV_DISQUS_REFRESH_T) clearTimeout(window.__FESTIV_DISQUS_REFRESH_T);

    window.__FESTIV_DISQUS_REFRESH_T = setTimeout(() => {
      const pageUrl = window.location.href.split("#")[0];
      const pageId = window.location.pathname;
      const marker = findDisqusMarker();

      const disqusConfig = function () {
        this.page.url = pageUrl;
        this.page.identifier = pageId;
        this.language = "fr";
      };

      if (!disqusHasIframe() && marker) remountDisqusThread(marker);

      window.__FESTIV_DISQUS_KEY = pageId + "||" + pageUrl;
      window.__FESTIV_DISQUS_READY = true;

      safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
      setTimeout(patchDisqusAgeGateFR, 400);
      setTimeout(patchDisqusAgeGateFR, 1100);

      // mini watchdog
      setTimeout(() => {
        if (!disqusHasIframe() && marker) {
          remountDisqusThread(marker);
          safeTry(() => window.DISQUS.reset({ reload: true, config: disqusConfig }));
        }
      }, 1200);
    }, 120);
  }

  // =========================
  // CookieHub -> retenter Disqus sur changements
  // =========================
  function bindCookieHubForDisqus() {
    if (window.__FESTIV_COOKIEHUB_DISQUS_BOUND) return;
    window.__FESTIV_COOKIEHUB_DISQUS_BOUND = true;

    const hard = () => {
      setTimeout(() => initDisqus(true), 50);
      setTimeout(() => initDisqus(true), 250);
      setTimeout(() => initDisqus(true), 900);
    };

    const CH = window.cookiehub;
    if (CH && typeof CH.on === "function") {
      CH.on("onAllow", hard);
      CH.on("onStatusChange", hard);
      CH.on("onRevoke", hard);
    } else {
      // fallback : quelques “pokes”
      let n = 0;
      const poke = () => {
        n++;
        initDisqus(false);
        if (n < 12) setTimeout(poke, 250);
      };
      setTimeout(poke, 200);
    }
  }

  // =========================
  // (Tes fonctions existantes) — je les laisse telles quelles
  // =========================
  function makeLogoClickable() {
    safeTry(() => {
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
    });
  }

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
        juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11,
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
    safeTry(() => {
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

        const dateStr = d.toLocaleDateString(LOCALE, {
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
    });
  }

  // ===== Tu as beaucoup d’autres fonctions (footer, FAQ, etc.)
  // ===== Je les laisse “as-is” : colle tes fonctions actuelles ici si besoin.
  // ===== (Pour éviter de te refaire 500 lignes, je garde l’essentiel Disqus/Theme.)
  //
  // IMPORTANT : garde TES fonctions existantes et appelle-les dans runAll() comme avant.

  // =========================
  // runAll (load + rebuild DOM)
  // =========================
  function runAll() {
    if (window.__FESTIV_RUNALL_LOCK) return;
    window.__FESTIV_RUNALL_LOCK = true;

    try {
      applySavedTheme();
      syncMeteoblueTheme();
      setTimeout(syncMeteoblueTheme, 300);

      makeLogoClickable();
      formatDates();

      initThemeToggle();

      // Disqus
      initDisqus(false);
    } finally {
      window.__FESTIV_RUNALL_LOCK = false;
    }
  }

  // =========================
  // Observer : relance runAll si Simple.ink reconstruit le DOM (ignore Disqus)
  // =========================
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

  // =========================
  // Boot
  // =========================
  // Appliquer thème ASAP
  applySavedTheme();
  bindSystemThemeListener();

  onReady(() => {
    log("loaded ✅");

    // CookieHub hooks
    bindCookieHubForDisqus();

    // Au refresh : CookieHub peut être prêt un peu après
    setTimeout(() => initDisqus(false), 400);
    setTimeout(() => initDisqus(false), 1200);
    setTimeout(() => initDisqus(false), 2500);

    runAll();

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
