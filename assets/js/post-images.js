/**
 * Article images: max width = column / intrinsic size, aspect ratio kept; click for lightbox.
 * Only runs inside .post-content.
 */
(function () {
  "use strict";

  var container = document.querySelector(".post-content");
  if (!container) return;

  var overlay = null;
  var lightboxImg = null;
  var prevOverflow = "";

  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "img-lightbox";
    overlay.setAttribute("hidden", "");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "大图预览");

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "img-lightbox-close";
    btn.setAttribute("aria-label", "关闭");
    btn.innerHTML = "\u00d7";

    lightboxImg = document.createElement("img");
    lightboxImg.className = "img-lightbox-img";
    lightboxImg.alt = "";

    var hint = document.createElement("p");
    hint.className = "img-lightbox-hint";
    hint.textContent = "\u70b9\u51fb\u80cc\u666f\u6216\u6309 Esc \u5173\u95ed";

    overlay.appendChild(btn);
    overlay.appendChild(lightboxImg);
    overlay.appendChild(hint);
    document.body.appendChild(overlay);

    function close() {
      overlay.setAttribute("hidden", "");
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    }

    function onKey(e) {
      if (e.key === "Escape") close();
    }

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay || e.target === btn) close();
    });
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      close();
    });
    lightboxImg.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    overlay._openLightbox = function (src, alt) {
      lightboxImg.src = src;
      lightboxImg.alt = alt || "";
      overlay.removeAttribute("hidden");
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onKey);
      btn.focus();
    };
  }

  function openFromImg(img) {
    ensureOverlay();
    var src = img.currentSrc || img.src;
    if (!src) return;
    overlay._openLightbox(src, img.alt || "");
  }

  var images = container.querySelectorAll("img");
  images.forEach(function (img) {
    if (img.closest(".img-lightbox")) return;
    var w = img.naturalWidth || img.width;
    if (w > 0 && w < 48) return;

    img.classList.add("post-zoomable");
    img.setAttribute("tabindex", "0");
    img.setAttribute("role", "button");
    img.setAttribute(
      "aria-label",
      (img.alt || "\u56fe\u7247") + "\uff0c\u70b9\u51fb\u653e\u5927"
    );

    function activate(e) {
      if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return;
      if (e.type === "keydown") e.preventDefault();
      e.preventDefault();
      e.stopPropagation();
      openFromImg(img);
    }

    /* Capture: cancel <a href> when image is wrapped in a link */
    img.addEventListener("click", activate, true);

    img.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") activate(e);
    });

    var parentA = img.parentElement;
    if (parentA && parentA.tagName === "A" && parentA.querySelectorAll("img").length === 1) {
      parentA.classList.add("post-content-img-wrap");
    }
  });
})();
