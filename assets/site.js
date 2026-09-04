/*
  Clipa site. No dependencies, and nothing here is load-bearing: every section
  must read correctly with this file absent. The script only ever ADDS motion
  to a page that is already complete.
*/
(function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------------------------------------------------
     Section 1 — the hero reveal.

     Timing is deliberately NOT the app's. The app computes
     (n*1000 - 250) / (words - 1) clamped to 260-900ms, which for this
     8-word headline at the default 5s would take 4.75 seconds. On a website
     that is a bounce. The app's timing is a friction device; the site's is a
     demonstration. Fixed 210ms: fast enough to hold attention, slow enough
     that you read rather than scan. Total 1.59s.

     Nothing important is gated behind it beyond the 1.71s mark.
     ------------------------------------------------------------------------- */
  function hero() {
    var section = document.getElementById('hero');
    if (!section) return;

    var title = section.querySelector('.hero__title');
    var words = title ? title.querySelectorAll('.w') : [];
    if (!words.length) return;

    // Someone who asked for less motion gets the finished page, not a slower
    // animation. Returning before adding the class means the words are never
    // hidden in the first place.
    if (reduced) return;

    document.documentElement.classList.add('js-reveal');

    var at = function (el, ms) { setTimeout(function () { el.classList.add('in'); }, ms); };

    var chip = section.querySelector('[data-reveal="chip"]');
    if (chip) at(chip, 80);

    var phone = section.querySelector('[data-reveal="phone"]');
    if (phone) at(phone, 160);

    for (var i = 0; i < words.length; i++) at(words[i], 120 + 210 * i);

    // 1590ms is the last word; the rest arrives just after it lands.
    var rest = section.querySelectorAll('[data-reveal="rest"]');
    for (var j = 0; j < rest.length; j++) at(rest[j], 1710 + 40 * j);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hero);
  } else {
    hero();
  }
})();
