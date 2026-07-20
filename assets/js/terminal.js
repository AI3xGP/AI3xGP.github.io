(() => {
  "use strict";

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  const typeInto = (el, text, speed, done) => {
    if (reduceMotion || !text) {
      el.textContent = text;
      if (done) done();
      return;
    }
    let i = 0;
    const tick = () => {
      el.textContent = text.slice(0, i);
      i += 1;
      if (i <= text.length) {
        setTimeout(tick, speed);
      } else if (done) {
        done();
      }
    };
    tick();
  };

  const addCursor = (parent) => {
    const cursor = document.createElement("span");
    cursor.className = "term-cursor";
    parent.appendChild(cursor);
  };

  const initBioTerminal = () => {
    const nameEl = document.querySelector(".author-name");
    const bioEl = document.querySelector(".author-bio");
    if (!nameEl || !bioEl) return;

    const name = nameEl.textContent.trim();
    const bio = bioEl.textContent.trim();
    const alreadyPlayed = sessionStorage.getItem("termIntroPlayed");

    if (alreadyPlayed || reduceMotion) {
      nameEl.textContent = name;
      bioEl.textContent = bio;
      addCursor(bioEl);
      return;
    }

    const prompt = document.createElement("p");
    prompt.className = "term-prompt";
    nameEl.parentNode.insertBefore(prompt, nameEl);

    nameEl.textContent = "";
    bioEl.textContent = "";

    typeInto(prompt, "guest@alexgpsec:~$ whoami", 25, () => {
      typeInto(nameEl, name, 35, () => {
        typeInto(bioEl, bio, 15, () => {
          addCursor(bioEl);
          sessionStorage.setItem("termIntroPlayed", "1");
        });
      });
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initBioTerminal);
  } else {
    initBioTerminal();
  }
})();
