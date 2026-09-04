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


  /* -------------------------------------------------------------------------
     Section 2 — the demo.

     This runs the APP'S algorithm, not an approximation of it. Same constants
     as Motion.kt / RevealTiming: a 250ms first word, an interval clamped to
     260-900ms, and buttons at max(n, sentenceEnd).

     At the default five seconds over six words that is 950ms raw, clamped to
     900, sentence finished at 4.75s and buttons at 5.00s - leaving a 250ms
     hold. A finished sentence with nothing yet to press. That is the case that
     made the app's own spec contradict itself, and putting it on the marketing
     site is more honest than rounding it away.
     ------------------------------------------------------------------------- */

  var FIRST_WORD_MS = 250, MIN_STEP = 260, MAX_STEP = 900;
  var REASON = 'so I have my evenings back';

  function plan(seconds) {
    var words = REASON.split(' ');
    var total = seconds * 1000;
    var raw = (total - FIRST_WORD_MS) / (words.length - 1);
    var step = Math.min(MAX_STEP, Math.max(MIN_STEP, raw));
    var wordsEnd = FIRST_WORD_MS + step * (words.length - 1);
    var buttonsAt = Math.max(total, wordsEnd);
    return {
      words: words, step: step, wordsEnd: wordsEnd,
      buttonsAt: buttonsAt, hold: buttonsAt - wordsEnd
    };
  }

  function demo() {
    var section = document.getElementById('try');
    if (!section) return;

    var phone    = section.querySelector('[data-demo-phone]');
    var sentence = section.querySelector('[data-demo-sentence]');
    var runBtn   = section.querySelector('[data-demo-run]');
    var feed     = section.querySelector('[data-demo-feed]');
    if (!phone || !sentence || !runBtn) return;

    var timers = [];
    var running = false;

    function selectedApp() {
      var el = section.querySelector('input[name="demo-app"]:checked');
      return el ? el.value : 'YouTube';
    }
    function selectedDelay() {
      var el = section.querySelector('input[name="demo-delay"]:checked');
      return el ? parseInt(el.value, 10) : 5;
    }

    function fmtMs(ms) { return Math.round(ms) + ' ms'; }
    function fmtS(ms) { return (ms / 1000).toFixed(2) + ' s'; }

    function paintTable() {
      var p = plan(selectedDelay());
      var set = function (k, v) {
        var el = section.querySelector('[data-t="' + k + '"]');
        if (el) el.textContent = v;
      };
      set('words', p.words.length);
      set('step', fmtMs(p.step));
      set('end', fmtS(p.wordsEnd));
      set('buttons', fmtS(p.buttonsAt));
      set('hold', fmtMs(p.hold));
    }

    function paintApp() {
      var name = selectedApp();
      var slots = section.querySelectorAll('[data-app-name]');
      for (var i = 0; i < slots.length; i++) slots[i].textContent = name;
    }

    function paintDelay() {
      var el = section.querySelector('[data-delay-value]');
      if (el) el.textContent = selectedDelay();
    }

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      running = false;
      phone.classList.remove('is-running', 'is-done');
      if (feed) feed.hidden = false;
      sentence.textContent = REASON;
      runBtn.textContent = 'Open ';
      var slot = document.createElement('span');
      slot.setAttribute('data-app-name', '');
      slot.textContent = selectedApp();
      runBtn.appendChild(slot);
    }

    function run() {
      if (running) { reset(); return; }
      running = true;

      var p = plan(selectedDelay());

      // rebuild the sentence one span per word
      sentence.textContent = '';
      var spans = [];
      p.words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.textContent = w;
        sentence.appendChild(s);
        if (i < p.words.length - 1) sentence.appendChild(document.createTextNode(' '));
        spans.push(s);
      });

      phone.classList.add('is-running');
      phone.classList.remove('is-done');
      runBtn.textContent = 'Start over';

      if (feed) timers.push(setTimeout(function () { feed.hidden = true; }, 220));

      // Reduced motion still runs the CLOCK - the wait is the product, so it
      // is not an animation to be skipped. Only the per-word fade goes.
      spans.forEach(function (s, i) {
        timers.push(setTimeout(function () { s.classList.add('in'); },
          FIRST_WORD_MS + p.step * i));
      });

      timers.push(setTimeout(function () {
        phone.classList.add('is-done');
      }, p.buttonsAt));
    }

    section.addEventListener('change', function (e) {
      if (e.target.name === 'demo-app') { paintApp(); reset(); }
      if (e.target.name === 'demo-delay') { paintDelay(); paintTable(); reset(); }
    });

    runBtn.addEventListener('click', run);

    // Tapping either phone button restarts, exactly like the app resolving.
    var actions = section.querySelector('[data-demo-actions]');
    if (actions) actions.addEventListener('click', function () { if (phone.classList.contains('is-done')) reset(); });

    // The feed is the BEFORE state of an animation, so it only makes sense
    // once there is a script to animate it away. Markup ships it hidden: with
    // no JS the phone shows a finished pause, which is the thing worth seeing,
    // rather than a placeholder feed with the prompt printed on top of it.
    if (feed) feed.hidden = false;

    paintTable();
    paintDelay();
  }


  /* -------------------------------------------------------------------------
     Sections 4 and 6 — the scroll-triggered pair.

     Both follow the hero's inversion rule: the CSS default is the FINISHED
     state, and the script sets the starting state before the observer can
     fire. So with no JavaScript the night band is already dark and the chart
     bars are already drawn - never an empty box waiting for something that is
     not coming.
     ------------------------------------------------------------------------- */

  function once(el, ratio, fn) {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { fn(); io.disconnect(); }
      });
    }, { threshold: ratio });
    io.observe(el);
  }

  function night() {
    var band = document.querySelector('[data-night]');
    if (!band || reduced) return;      // reduced motion: leave it dark
    band.classList.add('is-light');
    once(band, 0.35, function () { band.classList.remove('is-light'); });
  }

  function chart() {
    var el = document.querySelector('[data-chart]');
    if (!el || reduced) return;        // reduced motion: leave the bars drawn
    el.classList.add('is-pending');
    once(el, 0.35, function () {
      var bars = el.querySelectorAll('.chart__bar');
      for (var i = 0; i < bars.length; i++) {
        (function (bar, i) {
          setTimeout(function () { bar.style.height = ''; }, 25 * i);
        })(bars[i], i);
      }
      // The stagger is on the individual bars, so the pending class comes off
      // only after the last one has been released.
      setTimeout(function () { el.classList.remove('is-pending'); }, 25 * bars.length);
    });
  }

  /* Progressive enhancement only: <details> already opens and closes on its
     own, with correct keyboard and screen-reader behaviour. The class merely
     turns on the height transition. */
  function faq() {
    if (document.querySelector('.faq__list')) {
      document.documentElement.classList.add('js-faq');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { hero(); demo(); night(); chart(); faq(); });
  } else {
    hero();
    demo();
    night();
    chart();
    faq();
  }
})();
