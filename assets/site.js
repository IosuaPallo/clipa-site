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

  /* The demo's own words, handed over by the page so the section speaks the
     language it is printed in. English is the fallback and not a placeholder:
     if the block is missing, malformed, or the page simply forgot it, the demo
     still runs rather than announcing "undefined seconds". */
  var L = {
    prompt: 'so I have my evenings back',
    open: 'Open', restart: 'Start over',
    ms: ' ms', s: ' s', noHold: 'none at this delay',
    announce: 'After DELAY seconds: “PROMPT”. Now you can choose: not now, or open APP.'
  };
  (function () {
    var el = document.querySelector('[data-demo-i18n]');
    if (!el) return;
    try {
      var given = JSON.parse(el.textContent);
      for (var k in given) { if (given[k]) L[k] = given[k]; }
    } catch (e) { /* keep the English defaults */ }
  })();

  var REASON = L.prompt;

  /* A port of RevealTiming.plan in the app's Motion.kt, and it has to stay one:
     the whole claim of this section is that the pause on the page is the pause
     on the phone.

     BUTTONS ARRIVE AT n SECONDS, FULL STOP - not when the words finish. This
     read Math.max(total, wordsEnd), which is wrong in exactly the case that
     matters. Pick 1 s and the 260 ms floor pushes the sentence out to 1.55 s;
     the app puts the buttons up at 1.00 s while the last words are still
     landing, and this page held them back to 1.55 s and then reported 1.55 s
     in its own table as though that were the app's behaviour. A demo that
     disagrees with the product is worse than no demo.

     Kotlin's .toInt() truncates, so the step is floored here for the same
     reason - the interval the table prints should be the interval the phone
     uses, to the millisecond. */
  function plan(seconds) {
    var words = REASON.split(' ');
    var total = seconds * 1000;
    var raw = (total - FIRST_WORD_MS) / (words.length - 1);
    var step = Math.floor(Math.min(MAX_STEP, Math.max(MIN_STEP, raw)));
    var wordsEnd = FIRST_WORD_MS + step * (words.length - 1);
    return {
      words: words, step: step, wordsEnd: wordsEnd,
      buttonsAt: total,
      hold: Math.max(0, total - wordsEnd),
      overruns: wordsEnd > total
    };
  }

  function demo() {
    var section = document.getElementById('try');
    if (!section) return;

    var phone    = section.querySelector('[data-demo-phone]');
    var sentence = section.querySelector('[data-demo-sentence]');
    var runBtn   = section.querySelector('[data-demo-run]');
    var feed     = section.querySelector('[data-demo-feed]');
    var status   = section.querySelector('[data-demo-status]');
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

    function fmtMs(ms) { return Math.round(ms) + L.ms; }
    function fmtS(ms) { return (ms / 1000).toFixed(2) + L.s; }

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
      set('hold', p.overruns ? L.noHold : fmtMs(p.hold));
      // When the floor pushes the sentence past the delay there IS no hold -
      // the buttons arrive mid-sentence. Saying "0 ms" would imply a beat that
      // merely rounds to nothing rather than one that does not exist.
      var holdRow = section.querySelector('.try__hold');
      if (holdRow) holdRow.classList.toggle('is-none', p.overruns);
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
      if (status) status.textContent = '';
      if (feed) feed.hidden = false;
      sentence.textContent = REASON;
      runBtn.textContent = L.open + ' ';
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
      runBtn.textContent = L.restart;

      if (feed) timers.push(setTimeout(function () { feed.hidden = true; }, 220));

      // Reduced motion still runs the CLOCK - the wait is the product, so it
      // is not an animation to be skipped. Only the per-word fade goes.
      spans.forEach(function (s, i) {
        timers.push(setTimeout(function () { s.classList.add('in'); },
          FIRST_WORD_MS + p.step * i));
      });

      timers.push(setTimeout(function () {
        phone.classList.add('is-done');
        // The phone itself is aria-hidden, so this is the ONLY account of the
        // demo a screen-reader user gets. Said once, at the end, rather than
        // per word - a polite region updated eight times reads the sentence
        // eight times.
        if (status) {
          status.textContent = L.announce
            .replace('DELAY', selectedDelay())
            .replace('PROMPT', REASON)
            .replace('APP', selectedApp());
        }
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

  /* -------------------------------------------------------------------------
     In-page links — the hero's two buttons, the footer's four, the masthead.

     scroll-behavior: smooth in the stylesheet is not enough, and the reason is
     worth writing down. Chrome refuses to animate a scroll AT ALL when the OS
     asks for reduced motion, and not merely through the media query, which a
     stylesheet can override: an explicit scrollTo({behavior:'smooth'}) still
     lands instantly. Measured in a browser with the setting on, not assumed.

     So the glide is driven here on requestAnimationFrame, which that
     suppression does not reach, and the CSS declaration is gone. One owner for
     the behaviour rather than two that disagree - with both in play, every
     frame of this animation would itself have been a smooth scroll.

     This deliberately does NOT check `reduced`. The usual reason to drop
     smooth scrolling for that preference is vestibular discomfort on long
     animated jumps, so the compromise is duration: 260ms minimum, 620ms
     ceiling however far the page travels, and any wheel, touch or key from the
     reader cancels it mid-flight rather than fighting them for the scrollbar.

     Without this file the links still work - an anchor jumps to its target,
     which is the correct unenhanced behaviour.
     ------------------------------------------------------------------------- */
  function anchors() {
    var MIN_MS = 260, MAX_MS = 620, MS_PER_1000PX = 320;
    var running = null;

    function ease(t) {
      // easeInOutCubic: leaves and arrives at rest, so neither end snaps.
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function cancel() { running = null; }
    ['wheel', 'touchstart', 'keydown'].forEach(function (type) {
      window.addEventListener(type, cancel, { passive: true });
    });

    function glide(to, done) {
      var from = window.pageYOffset;
      var dist = to - from;
      if (!dist) { done(); return; }

      var ms = Math.min(MAX_MS, MIN_MS + Math.abs(dist) / 1000 * MS_PER_1000PX);
      var token = {};
      var start = null;
      running = token;

      // If frames never arrive the reader must STILL end up at the section.
      // preventDefault has already taken the browser's own jump away, so a
      // stalled animation means the link does nothing at all - which is how
      // this was caught: in a pane painting at about 5fps the button moved the
      // page not at all, where plain HTML would have worked. An enhancement is
      // not allowed to leave a link dead.
      var net = setTimeout(function () {
        if (running !== token) return;
        running = null;
        window.scrollTo(0, to);
        done();
      }, ms + 300);

      requestAnimationFrame(function step(now) {
        if (running !== token) { clearTimeout(net); return; }   // reader took over
        if (start === null) start = now;
        var t = Math.min(1, (now - start) / ms);
        window.scrollTo(0, from + dist * ease(t));
        if (t < 1) { requestAnimationFrame(step); }
        else { clearTimeout(net); running = null; done(); }
      });
    }

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // open in a tab

      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;

      var href = a.getAttribute('href');
      if (!href || href.charAt(0) !== '#' || href === '#') return;

      var target = document.getElementById(href.slice(1));
      if (!target) return;

      e.preventDefault();
      glide(target.getBoundingClientRect().top + window.pageYOffset, function () {
        // preventDefault also cancelled the focus move the browser does on a
        // fragment jump, which is how a keyboard or screen-reader user knows
        // they arrived. Put it back, or this "enhancement" quietly breaks the
        // links for the people who most need them to work.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });

        // The address bar should still end on the section, so the link can be
        // copied and Back steps through the sections the way it always did.
        if (window.history && window.history.pushState) {
          window.history.pushState(null, '', href);
        } else {
          window.location.hash = href;
        }
      });
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
    document.addEventListener('DOMContentLoaded', function () { hero(); demo(); night(); chart(); faq(); anchors(); });
  } else {
    hero();
    demo();
    night();
    chart();
    faq();
    anchors();
  }
})();
