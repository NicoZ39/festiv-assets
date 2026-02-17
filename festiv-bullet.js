 // =========================================
  // FAQ (Bullet.so) — Accordion + animation
  // Anim : height/padding (0 -> scrollHeight -> auto)
  // =========================================
  (function setupFaqAnimation() {
    try {
      if (window.__FESTIV_FAQ_ANIM_BOUND) return;
      window.__FESTIV_FAQ_ANIM_BOUND = true;

      const TOP_SPACE = 10; // padding-top quand ouvert
      const DURATION_MS = 350; // doit matcher ton CSS

      const prefersReducedMotion = () =>
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const getContent = (details) => details.querySelector(":scope > div");

      const closeWithAnim = (details) => {
        const content = getContent(details);
        if (!content) {
          details.removeAttribute("open");
          return;
        }
        if (!details.hasAttribute("open")) return;

        if (prefersReducedMotion()) {
          details.removeAttribute("open");
          content.style.height = "0px";
          content.style.paddingTop = "0px";
          return;
        }

        // on fige la hauteur actuelle (si c'était "auto")
        const h = content.scrollHeight;
        content.style.height = h + "px";
        content.style.paddingTop = TOP_SPACE + "px";
        content.getBoundingClientRect(); // force reflow

        // puis on anime vers 0
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

        // fallback si transitionend ne part pas
        setTimeout(() => {
          content.removeEventListener("transitionend", onEnd);
          if (details.hasAttribute("open")) return;
          content.style.height = "0px";
          content.style.paddingTop = "0px";
        },
          DURATION_MS + 80);
      };

      const openWithAnim = (details) => {
        const content = getContent(details);
        if (!content) return;

        if (prefersReducedMotion()) {
          details.setAttribute("open", "");
          content.style.height = "auto";
          content.style.paddingTop = TOP_SPACE + "px";
          return;
        }

        details.setAttribute("open", "");

        // départ à 0
        content.style.height = "0px";
        content.style.paddingTop = "0px";
        content.getBoundingClientRect(); // force reflow

        const h = content.scrollHeight;

        content.style.paddingTop = TOP_SPACE + "px";
        content.style.height = (h + TOP_SPACE) + "px";

        const onEnd = (ev) => {
          if (ev.propertyName !== "height") return;
          content.style.height = "auto"; // important
          content.removeEventListener("transitionend", onEnd);
        };
        content.addEventListener("transitionend", onEnd);

        // fallback
        setTimeout(() => {
          content.removeEventListener("transitionend", onEnd);
          if (details.hasAttribute("open")) {
            content.style.height = "auto";
          }
        },
          DURATION_MS + 80);
      };

      // Interception clic summary : on contrôle l'anim + accordéon
      document.addEventListener("click",
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

          // Accordéon : ferme les autres
          document.querySelectorAll("details.notion-toggle[open]").forEach((d) => {
            if (d !== details) closeWithAnim(d);
          });

          openWithAnim(details);
        }, true);

      // Init : si Bullet rend un <details open>, on met la bonne forme
      const initOpenItems = () => {
        document.querySelectorAll("details.notion-toggle[open]").forEach((d) => {
          const c = getContent(d);
          if (!c) return;
          c.style.paddingTop = TOP_SPACE + "px";
          c.style.height = "auto";
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initOpenItems, {
          once: true
        });
      } else {
        initOpenItems();
      }

      console.info("[festiv] FAQ anim+accordion ✅");
    } catch (e) {
      console.error("[festiv] setupFaqAnimation error:", e);
    }
  })();
</script>
