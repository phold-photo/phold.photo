// phold.photo: the prints strewn on each card, the per-camera gallery, and the prices for your region.
// Plain JS, no libraries, nothing loaded from other sites. Without it the page still works: prints link to the full
// image, prices show in pounds with the others listed.
(function () {
  "use strict";
  var d = document;
  var still = matchMedia("(prefers-reduced-motion: reduce)");

  // MARK: Prints strewn like they were dropped on the table, a new layout each visit

  d.querySelectorAll(".strewn").forEach(function (box) {
    [].forEach.call(box.children, function (el) {
      var r = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 5);
      el.style.setProperty("--r", r.toFixed(1) + "deg");
      el.style.setProperty("--dx", (Math.random() * 12 - 6).toFixed(0) + "px");
      el.style.setProperty("--dy", (Math.random() * 14 - 7).toFixed(0) + "px");
      el.style.setProperty("--z", String(1 + (Math.random() * 3 | 0)));
    });
  });

  // MARK: The gallery: every photo we have from the camera, opened at the one you clicked

  var manifest = null, box = null, list = [], at = 0, opener = null, cam = null;

  function camOf(href) {
    var m = /\/([a-z0-9-]+)-([A-Za-z0-9]+)\.jpg$/.exec(href);
    return m ? { subject: m[1], cam: m[2] } : null;
  }

  function el(tag, cls, html) {
    var e = d.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function build() {
    box = el("div", "lb");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.hidden = true;
    box.innerHTML =
      '<div class="lb-stage"><img class="lb-img" alt=""><p class="lb-cap" aria-live="polite"></p></div>' +
      '<button type="button" class="lb-btn lb-prev" aria-label="Previous photo">‹</button>' +
      '<button type="button" class="lb-btn lb-next" aria-label="Next photo">›</button>' +
      '<button type="button" class="lb-btn lb-close" aria-label="Close">×</button>' +
      '<p class="lb-count"></p><div class="lb-strip" role="list"></div>';
    d.body.appendChild(box);
    box.querySelector(".lb-prev").onclick = function () { show(at - 1); };
    box.querySelector(".lb-next").onclick = function () { show(at + 1); };
    box.querySelector(".lb-close").onclick = close;
    box.addEventListener("click", function (e) { if (e.target === box || e.target.classList.contains("lb-stage")) close(); });
    var x0 = null;
    box.addEventListener("pointerdown", function (e) { x0 = e.clientX; });
    box.addEventListener("pointerup", function (e) {
      if (x0 != null && Math.abs(e.clientX - x0) > 40) show(at + (e.clientX < x0 ? 1 : -1));
      x0 = null;
    });
    box.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
      else if (e.key === "Tab") {
        var f = [].slice.call(box.querySelectorAll("button")).filter(function (b) { return b.offsetParent; });
        var i = f.indexOf(d.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    });
  }

  function show(i) {
    if (!list.length) return;
    at = (i + list.length) % list.length;
    var p = list[at], img = box.querySelector(".lb-img");
    img.src = p.src;
    img.alt = p.alt || "";
    img.width = p.w || 640;
    img.height = p.h || 640;
    box.querySelector(".lb-cap").textContent = cam.name + " · " + (p.stock || cam.stock);
    box.querySelector(".lb-count").textContent = (at + 1) + " / " + list.length;
    [].forEach.call(box.querySelectorAll(".lb-strip button"), function (b, k) { b.setAttribute("aria-current", k === at ? "true" : "false"); });
    var cur = box.querySelectorAll(".lb-strip button")[at];
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
    // the neighbours, so swiping on is instant
    [at + 1, at - 1].forEach(function (k) { var q = list[(k + list.length) % list.length]; if (q) (new Image()).src = q.src; });
  }

  function open(link) {
    var who = camOf(link.getAttribute("href"));
    if (!who || !manifest || !manifest[who.cam]) return false;
    cam = manifest[who.cam];
    list = cam.photos.map(function (p) { return { src: "img/" + p.f, w: p.w, h: p.h, alt: p.alt, stock: p.stock, subject: p.f.replace(/^.*\/|\.jpg$/g, "") }; });
    var k = list.findIndex(function (p) { return p.subject === who.subject; });
    if (k < 0) {
      var im = link.querySelector("img");
      list.unshift({ src: im ? im.currentSrc || im.src : link.href, w: im && im.naturalWidth, h: im && im.naturalHeight, alt: im ? im.alt : "", subject: who.subject });
      k = 0;
    }
    if (!box) build();
    box.setAttribute("aria-label", cam.name + ": photos");
    var strip = box.querySelector(".lb-strip");
    strip.innerHTML = "";
    list.forEach(function (p, i) {
      var b = el("button", "lb-thumb");
      b.type = "button";
      b.setAttribute("role", "listitem");
      b.setAttribute("aria-label", "Photo " + (i + 1) + " of " + list.length);
      b.innerHTML = '<img loading="lazy" alt="" src="' + p.src + '">';
      b.onclick = function () { show(i); };
      strip.appendChild(b);
    });
    opener = link;
    box.hidden = false;
    d.documentElement.classList.add("lb-open");
    show(k);
    box.querySelector(".lb-close").focus();
    return true;
  }

  function close() {
    if (!box || box.hidden) return;
    box.hidden = true;
    d.documentElement.classList.remove("lb-open");
    if (opener) opener.focus();
  }

  function loadManifest() {
    if (manifest) return Promise.resolve(manifest);
    return fetch("img/g/manifest.json").then(function (r) { return r.json(); }).then(function (m) { manifest = m; return m; });
  }

  d.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var link = e.target.closest && e.target.closest('a[href*="img/p/full/"], a[href*="img/pile/full/"]');
    if (!link || !camOf(link.getAttribute("href"))) return;
    e.preventDefault();
    loadManifest().then(function () { if (!open(link)) location.href = link.href; }, function () { location.href = link.href; });
  });

  // MARK: Prices for your region. Keep in step with supabase/functions/_shared/catalog.ts (node site/check-prices.mjs).

  // EU prices include the €3 customs duty and €2 handling fee (catalog.ts euImportDuty)
  var PRICES = {
    roll120: { uk: 1499, us: 1799, eu: 2399, canada: 2299, australia: 2799 },
    roll135: { uk: 1999, us: 2499, eu: 2799, canada: 2999, australia: 3699 },
    instant: { uk: 1699, us: 1999, eu: 2499, canada: 2599, australia: 3199 },
    deluxe: { uk: 3799, us: 3999, eu: null, canada: 4999, australia: null },
    // the reduced bin's cheapest box: a 120 Shoebox, a pound (or so) under the fresh roll
    expired: { uk: 1399, us: 1699, eu: 2299, canada: 2199, australia: 2699 }
  };
  var PAID = { us: true, australia: true, uk: true, canada: true, eu: true, world: true };
  var SIGN = { uk: "£", us: "$", eu: "€", canada: "C$", australia: "A$" };
  var TAX = {
    uk: "Prices in the UK, including VAT.", eu: "Prices in the EU, including VAT, customs duty and handling.", australia: "Prices in Australia and New Zealand, including GST.",
    us: "Prices in the US, before sales tax, which is added and shown before you pay.", canada: "Prices in Canada, before sales tax, which is added and shown before you pay."
  };
  var CANADA = /^America\/(Toronto|Vancouver|Montreal|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit|Glace_Bay|Goose_Bay|Dawson_Creek|Dawson|Fort_Nelson|Creston|Atikokan|Blanc-Sablon|Rankin_Inlet|Resolute|Cambridge_Bay|Inuvik|Swift_Current|Thunder_Bay|Nipigon|Rainy_River|Pangnirtung)$/;
  var EU_LANG = /^(de|fr|es|it|nl|pt|pl|sv|da|fi|el|cs|sk|sl|hu|ro|bg|hr|et|lv|lt|mt|ga)\b/;

  function guess() {
    var tz = "";
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ""; } catch (e) {}
    if (CANADA.test(tz)) return "canada";
    if (/^America\//.test(tz)) return "us";
    if (/^(Australia\/|Pacific\/(Auckland|Chatham))/.test(tz)) return "australia";
    if (/^Europe\/(London|Isle_of_Man|Jersey|Guernsey)$/.test(tz)) return "uk";
    if (/^Europe\//.test(tz)) return "eu";
    var lang = (navigator.language || "").toLowerCase();
    if (/-ca$/.test(lang)) return "canada";
    if (/-us$/.test(lang)) return "us";
    if (/-(au|nz)$/.test(lang)) return "australia";
    if (/-gb$/.test(lang)) return "uk";
    if (EU_LANG.test(lang)) return "eu";
    return "uk";
  }

  function money(minor, r) { return SIGN[r] + (minor / 100).toFixed(2); }

  function setRegion(r) {
    d.querySelectorAll("[data-p]").forEach(function (e) { var v = PRICES[e.getAttribute("data-p")][r]; if (v != null) e.textContent = money(v, r); });
    d.querySelectorAll("#regions button").forEach(function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-r") === r ? "true" : "false"); });
    var aus = r === "australia" || r === "eu"; // no Deluxe in either shop (catalog.ts sellsDeluxe)
    d.querySelectorAll(".deluxe").forEach(function (e) { e.hidden = aus; });
    d.querySelectorAll(".no-deluxe").forEach(function (e) { e.hidden = !aus; });
    d.querySelectorAll(".no-nz").forEach(function (e) { e.hidden = true; });
    var mail = r === "us" || r === "canada";
    d.querySelectorAll('[data-w="post"]').forEach(function (e) { e.textContent = mail ? "mailing" : "posting"; });
    var tax = d.getElementById("tax-line");
    if (tax) tax.textContent = TAX[r];
    var soon = d.getElementById("coming");
    if (soon) soon.hidden = !!PAID[r];
  }

  var regions = d.getElementById("regions");
  if (regions) {
    var saved = null;
    try { saved = localStorage.getItem("phold-region"); } catch (e) {}
    regions.hidden = false;
    regions.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-r]");
      if (!b) return;
      var r = b.getAttribute("data-r");
      try { localStorage.setItem("phold-region", r); } catch (e2) {}
      setRegion(r);
    });
    setRegion(SIGN[saved] ? saved : guess());
  }
})();
