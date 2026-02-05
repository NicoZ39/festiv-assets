(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  const locale = "fr-FR";

  // --- Utils ---
  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function safeQueryAll(selector) {
    try {
      return Array.from(document.querySelectorAll(selector));
    } catch {
      return [];
    }
  }

  // --- 1) Logo cliquable ---
  function makeLogoClickable() {
    const logoDiv = document.querySelector(".styles_logo__JgM3o");
    if (!logoDiv) return;

    // déjà fait ?
    if (logoDiv.querySelector("a")) return;

    const img = logoDiv.querySelector("img");
    if (!img) return;

    const link = document.createElement("a");
    link.href = "/";
    link.appendChild(img.cloneNode(true));

    logoDiv.innerHTML = "";
    logoDiv.appendChild(link);
    logoDiv.style.marginBottom = "20px";
  }

  // --- 2) Format dates FR ---
  // Gère :
  // - "May 14, 2026 06:00" / "May 14, 2026"
  // - "⏰ jeudi 14 mai 2026 dès 06h00"
  // - "jeudi 14 mai 2026 dès 06h00"
  // - "14 mai 2026" etc.
  function formatDates() {
    const nodes = safeQueryAll(".notion-property-date, .notion-callout-text .notion-text");
    nodes.forEach((el) => {
      const raw = (el.textContent || "").trim();
      if (!raw) return;

      // Évite de reformater en boucle si déjà au bon format "⏰ <weekday> <date> dès <hh>h<mm>"
      // On laisse quand même passer si c'est une date simple.
      // (Si tu veux forcer le reformat, supprime ce guard)
      if (/^⏰\s+\p{L}+/u.test(raw) && /dès\s+\d{2}h\d{2}/.test(raw)) return;

      // 1) Détection format anglais type "May 14, 2026 06:00" / "May 14, 2026"
      const enMatch = raw.match(/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})(?:\s+(\d{2}:\d{2}))?/);
      if (enMatch) {
        const d = new Date(enMatch[0]); // inclut l'heure si présente
        if (!isNaN(d)) {
          const dateStr = d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
          const weekday = d.toLocaleDateString(locale, { weekday: "long" });

          if (enMatch[2]) {
            const hh = pad2(d.getHours());
            const mm = pad2(d.getMinutes());
            el.textContent = `⏰ ${weekday} ${dateStr} dès ${hh}h${mm}`;
          } else {
            el.textContent = dateStr;
          }
          return;
        }
      }

      // 2) Détection format FR déjà humain (ex: "jeudi 14 mai 2026 dès 06h00")
      // On le normalise (emoji + espaces + hh:mm)
      const frMatch = raw.match(
        /^(?:⏰\s*)?(?:(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\s+)?(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})(?:\s*(?:dès|à)\s*(\d{1,2})h(\d{2}))?/i
      );
      if (frMatch) {
        const weekdayText = frMatch[1]; // peut être undefined
        const day = Number(frMatch[2]);
        const monthName = frMatch[3].toLowerCase();
        const year = Number(frMatch[4]);
        const hh = frMatch[5] != null ? Number(frMatch[5]) : null;
        const mm = frMatch[6] != null ? Number(frMatch[6]) : null;

        const months = {
          janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
          juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
        };

        if (!(monthName in months)) return;

        // Construit une date locale (sans timezone surprises)
        const d = new Date(year, months[monthName], day, hh ?? 0, mm ?? 0);
        if (isNaN(d)) return;

        const dateStr = d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
        const weekday = weekdayText
          ? weekdayText.toLowerCase()
          : d.toLocaleDateString(locale, { weekday: "long" });

        if (hh != null && mm != null) {
          el.textContent = `⏰ ${weekday} ${dateStr} dès ${pad2(hh)}h${pad2(mm)}`;
        } else {
          el.textContent = dateStr;
        }
        return;
      }

      // 3) Dernier recours : tentative new Date sur ce qu'on trouve
      // (utile si Simple.ink change encore le format)
      const fallbackDate = new Date(raw);
      if (!isNaN(fallbackDate)) {
        const dateStr = fallbackDate.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
        el.textContent = dateStr;
      }
    });
  }

  // --- 3) Footer colonnes ---
  function createFooterColumns() {
    const footer = document.querySelector("footer.styles_main_footer__LoNow");
    if (!footer) return;
    if (footer.querySelector(".festiv-footer-columns")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "festiv-footer-columns";
    wrapper.innerHTML = `
<style>
.festiv-footer-columns{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;text-align:center;padding:0 10px;width:100%;}
.festiv-footer-column a{display:block;color:#555;text-decoration:none;margin-bottom:8px;transition:color 0.2s;}
.festiv-footer-column a:hover{color:#000;}
@media(max-width:600px){.festiv-footer-columns{grid-template-columns:1fr;}}
.fo-embed-iframe{margin-top:32px;border-radius:16px;overflow:hidden;}
.fo-embed-iframe iframe{display:block;width:100%;border:0;}
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
</div>
`;

    footer.appendChild(wrapper);
  }

  function addCopyright() {
    const footer = document.querySelector("footer.styles_main_footer__LoNow");
    if (!footer) return;
    if (footer.querySelector(".festiv-copyright")) return;

    const year = new Date().getFullYear();
    const copyright = document.createElement("div");
    copyright.className = "festiv-copyright";
    copyright.textContent = `Copyright © ${year} - Festiv'Ounans - Tous droits réservés`;

    Object.assign(copyright.style, {
      width: "100%",
      textAlign: "center",
      fontSize: "14px",
      color: "#666",
      marginTop: "20px",
      paddingBottom: "20px",
    });

    footer.appendChild(copyright);
  }

  // --- 4) Cover ---
  function tweakCover() {
    const coverImage = document.querySelector(".notion-page-cover-wrapper img");
    if (!coverImage) return;

    coverImage.style.height = "500px";
    coverImage.style.objectFit = "cover";
    coverImage.style.objectPosition = "center 50%";
  }

  // --- Init & Observer ---
  function runAll() {
    makeLogoClickable();
    formatDates();
    createFooterColumns();
    addCopyright();
    tweakCover();
  }

  onReady(() => {
    runAll();

    // Simple.ink / Notion : DOM dynamique -> on ré-applique
    const observer = new MutationObserver(() => {
      runAll();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
