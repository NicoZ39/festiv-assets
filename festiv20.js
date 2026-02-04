(function () {
  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(() => {
    // 1) Rendre le logo cliquable
    function makeLogoClickable() {
      const logoDiv = document.querySelector(".styles_logo__JgM3o");
      if (logoDiv && !logoDiv.querySelector("a")) {
        const img = logoDiv.querySelector("img");
        if (img) {
          const link = document.createElement("a");
          link.href = "/";
          link.appendChild(img.cloneNode(true));
          logoDiv.innerHTML = "";
          logoDiv.appendChild(link);
          logoDiv.style.marginBottom = "20px";
        }
      }
    }

    // 2) Formater les dates FR
    const locale = "fr-FR";
    function formatDates() {
      document
        .querySelectorAll(".notion-property-date, .notion-callout-text .notion-text")
        .forEach((el) => {
          const match = el.textContent.match(/([A-Za-z]+ \d{1,2}, \d{4}( \d{2}:\d{2})?)/);
          if (!match) return;

          const date = new Date(match[1]);
          if (isNaN(date)) return;

          const formattedDate = date.toLocaleDateString(locale, {
            day: "numeric",
            month: "long",
            year: "numeric",
          });

          const hasTime = !!match[2];
          if (hasTime) {
            const hh = date.getHours().toString().padStart(2, "0");
            const mm = date.getMinutes().toString().padStart(2, "0");
            el.textContent = `⏰ ${date.toLocaleDateString(locale, { weekday: "long" })} ${formattedDate} dès ${hh}h${mm}`;
          } else {
            el.textContent = formattedDate;
          }
        });
    }

    // 3) Colonnes de footer + copyright
    function createFooterColumns() {
      const footer = document.querySelector("footer.styles_main_footer__LoNow");
      if (footer && !footer.querySelector(".festiv-footer-columns")) {
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
</div>
`;
        footer.appendChild(wrapper);
      }
    }

    function addCopyright() {
  const footer = document.querySelector("footer.styles_main_footer__LoNow");
  if (footer && !footer.querySelector(".festiv-copyright")) {
    const year = new Date().getFullYear();
    const copyright = document.createElement("div");

    copyright.className = "festiv-copyright";
    copyright.textContent = `Copyright © ${year} - Festiv'Ounans - Tous droits réservés`;

    // Styles essentiels
    copyright.style.width = "100%";
    copyright.style.textAlign = "center";
    copyright.style.fontSize = "14px";
    copyright.style.color = "#666";
    copyright.style.marginTop = "20px";
    copyright.style.paddingBottom = "20px";

    footer.appendChild(copyright);
  }
}


    // 4) Hauteur/fit cover
    function tweakCover() {
      const coverImage = document.querySelector(".notion-page-cover-wrapper img");
      if (coverImage) {
        coverImage.style.height = "500px";
        coverImage.style.objectFit = "cover";
        coverImage.style.objectPosition = "center 50%";
      }
    }

    // Init
    makeLogoClickable();
    formatDates();
    createFooterColumns();
    addCopyright();
    tweakCover();

    // Observer global (Simple.ink / Notion change souvent le DOM)
    const observer = new MutationObserver(() => {
      makeLogoClickable();
      formatDates();
      createFooterColumns();
      addCopyright();
      tweakCover();
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
