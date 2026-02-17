<script>
  function setupFaqAnimationBullet() {
    try {
      if (window.__FESTIV_FAQ_ANIM_BOUND) return;
      window.__FESTIV_FAQ_ANIM_BOUND = true;

      const TOP_SPACE = 10;
      const DURATION_MS = 350;

      const reduceMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const getContent = (details) => details.querySelector(":scope > div");

      function openWithAnim(details) {
        const content = getContent(details);
        if (!content) {
          details.open = true; return;
        }

        if (reduceMotion) {
          details.open = true;
          content.style.height = "auto";
          content.style.paddingTop = TOP_SPACE + "px";
          return;
        }

        // Ouvre via propriété (plus fiable que setAttribute)
        details.open = true;

        // départ
        content.style.height = "0px";
        content.style.paddingTop = "0px";
        content.getBoundingClientRect();

        const h = content.scrollHeight;

        content.style.paddingTop = TOP_SPACE + "px";
        content.style.height = (h + TOP_SPACE) + "px";

        const onEnd = (ev) => {
          if (ev.propertyName !== "height") return;
          content.style.height = "auto";
          content.removeEventListener("transitionend", onEnd);
        };
        content.addEventListener("transitionend", onEnd);

        setTimeout(() => {
          content.removeEventListener("transitionend", onEnd);
          if (details.open) content.style.height = "auto";
        },
          DURATION_MS + 80);
      }

      function closeWithAnim(details) {
        const content = getContent(details);
        if (!content) {
          details.open = false; return;
        }
        if (!details.open) return;

        if (reduceMotion) {
          details.open = false;
          content.style.height = "0px";
          content.style.paddingTop = "0px";
          return;
        }

        // fige hauteur actuelle
        const h = content.scrollHeight;
        content.style.height = h + "px";
        content.style.paddingTop = TOP_SPACE + "px";
        content.getBoundingClientRect();

        // anime vers 0
        content.style.height = "0px";
        content.style.paddingTop = "0px";

        const onEnd = (ev) => {
          if (ev.propertyName !== "height") return;
          details.open = false; // ferme à la fin (propre)
          content.style.height = "0px";
          content.style.paddingTop = "0px";
          content.removeEventListener("transitionend", onEnd);
        };
        content.addEventListener("transitionend", onEnd);

        setTimeout(() => {
          content.removeEventListener("transitionend", onEnd);
          if (details.open) return;
          content.style.height = "0px";
          content.style.paddingTop = "0px";
        },
          DURATION_MS + 80);
      }

      // Interception click sur summary
      document.addEventListener("click",
        (e) => {
          const summary = e.target.closest("summary");
          if (!summary) return;

          const details = summary.closest("details.notion-toggle");
          if (!details) return;

          e.preventDefault();
          e.stopPropagation();

          if (details.open) {
            closeWithAnim(details);
            return;
          }

          // Accordéon : ferme les autres
          document.querySelectorAll("details.notion-toggle").forEach((d) => {
            if (d !== details && d.open) closeWithAnim(d);
          });

          openWithAnim(details);
        }, true);

      // Init des items déjà ouverts (si Bullet en met)
      const init = () => {
        document.querySelectorAll("details.notion-toggle").forEach((d) => {
          const c = getContent(d);
          if (!c) return;
          if (d.open) {
            c.style.paddingTop = TOP_SPACE + "px";
            c.style.height = "auto";
          } else {
            c.style.paddingTop = "0px";
            c.style.height = "0px";
          }
        });
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, {
          once: true
        });
      } else {
        init();
      }

      console.info("[festiv] FAQ anim OK ✅");
    } catch (e) {
      console.error("[festiv] FAQ anim error:", e);
    }
  }();
</script>
