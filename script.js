/* ============================================================
   ELECTRONICS ENGINEERING PREP HUB — COMPLETE JS SYSTEM
   Modular | Mobile-Safe | Production Quality
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     CONSTANTS & STATE
  ============================================================ */
  const STORAGE_KEY = 'eeph_progress_v2';
  const TOTAL_LECTURES = 10;

  const state = {
    studiedLectures: new Set(),
    theme: 'engineering',
    quizState: {
      current: 0,
      answers: {},
      completed: false,
      score: 0,
    },
  };

  /* ============================================================
     UTILITY HELPERS
  ============================================================ */
  function qs(selector, ctx) {
    return (ctx || document).querySelector(selector);
  }

  function qsa(selector, ctx) {
    return Array.from((ctx || document).querySelectorAll(selector));
  }

  function safe(fn) {
    try { fn(); } catch (e) { /* silent — prevent crash */ }
  }

  /* ============================================================
     STORAGE — PERSISTENCE
  ============================================================ */
  const Storage = {
    save() {
      safe(() => {
        const data = {
          studiedLectures: [...state.studiedLectures],
          theme: state.theme,
          quizAnswers: state.quizState.answers,
          quizScore: state.quizState.score,
          quizCompleted: state.quizState.completed,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      });
    },

    load() {
      safe(() => {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.studiedLectures)) {
          data.studiedLectures.forEach((n) => state.studiedLectures.add(n));
        }
        if (data.theme) state.theme = data.theme;
        if (data.quizAnswers) state.quizState.answers = data.quizAnswers;
        if (typeof data.quizScore === 'number') state.quizState.score = data.quizScore;
        if (data.quizCompleted) state.quizState.completed = data.quizCompleted;
      });
    },

    clear() {
      safe(() => {
        localStorage.removeItem(STORAGE_KEY);
        state.studiedLectures.clear();
        state.quizState = { current: 0, answers: {}, completed: false, score: 0 };
      });
    },
  };

  /* ============================================================
     PROGRESS TRACKER
  ============================================================ */
  const Progress = {
    update() {
      const count = state.studiedLectures.size;
      const pct = Math.round((count / TOTAL_LECTURES) * 100);

      const bar = qs('.progress-bar');
      const countEl = qs('.progress-count');
      const tracker = qs('.progress-tracker');

      if (bar) {
        bar.style.width = pct + '%';
        bar.setAttribute('aria-valuenow', pct);
      }
      if (countEl) countEl.textContent = count;
      if (tracker) tracker.setAttribute('data-completed', count);

      // Sidebar links — mark studied
      qsa('[data-lecture]').forEach((link) => {
        const num = parseInt(link.getAttribute('data-lecture'), 10);
        if (state.studiedLectures.has(num)) {
          link.classList.add('is-studied');
        } else {
          link.classList.remove('is-studied');
        }
      });

      // Lecture articles — update status
      qsa('.lecture').forEach((lecture) => {
        const num = parseInt(lecture.getAttribute('data-lecture-number'), 10);
        if (state.studiedLectures.has(num)) {
          lecture.setAttribute('data-status', 'completed');
        } else {
          lecture.setAttribute('data-status', 'not-started');
        }
      });

      Storage.save();
    },

    markStudied(lectureNum) {
      state.studiedLectures.add(lectureNum);
      Progress.update();
    },

    unmarkStudied(lectureNum) {
      state.studiedLectures.delete(lectureNum);
      Progress.update();
    },

    toggleStudied(lectureNum) {
      if (state.studiedLectures.has(lectureNum)) {
        Progress.unmarkStudied(lectureNum);
      } else {
        Progress.markStudied(lectureNum);
      }
    },
  };

  /* ============================================================
     MARK AS STUDIED BUTTONS — inject into each lecture header
  ============================================================ */
  function injectStudyButtons() {
    qsa('.lecture').forEach((lecture) => {
      const num = parseInt(lecture.getAttribute('data-lecture-number'), 10);
      if (!num) return;

      const header = qs('.lecture-header', lecture);
      if (!header || qs('.study-btn', header)) return;

      const btn = document.createElement('button');
      btn.className = 'study-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('aria-pressed', state.studiedLectures.has(num) ? 'true' : 'false');
      btn.setAttribute('aria-label', `Mark Lecture ${num} as studied`);
      btn.innerHTML = `<span class="study-btn-icon">○</span><span class="study-btn-text">Mark as Studied</span>`;

      btn.addEventListener('click', function () {
        Progress.toggleStudied(num);
        const studied = state.studiedLectures.has(num);
        btn.setAttribute('aria-pressed', studied ? 'true' : 'false');
        btn.classList.toggle('is-active', studied);
        btn.querySelector('.study-btn-icon').textContent = studied ? '✓' : '○';
        btn.querySelector('.study-btn-text').textContent = studied ? 'Studied ✓' : 'Mark as Studied';
        announceToSR(studied ? `Lecture ${num} marked as studied.` : `Lecture ${num} unmarked.`);
      });

      header.appendChild(btn);
    });
  }

  function syncStudyButtons() {
    qsa('.study-btn').forEach((btn) => {
      const lecture = btn.closest('.lecture');
      if (!lecture) return;
      const num = parseInt(lecture.getAttribute('data-lecture-number'), 10);
      const studied = state.studiedLectures.has(num);
      btn.classList.toggle('is-active', studied);
      btn.setAttribute('aria-pressed', studied ? 'true' : 'false');
      const icon = btn.querySelector('.study-btn-icon');
      const text = btn.querySelector('.study-btn-text');
      if (icon) icon.textContent = studied ? '✓' : '○';
      if (text) text.textContent = studied ? 'Studied ✓' : 'Mark as Studied';
    });
  }

  /* ============================================================
     COLLAPSIBLE TOPICS — smooth animation via max-height trick
  ============================================================ */
  function initCollapsibles() {
    qsa('details').forEach((details) => {
      const body = qs('.topic-body', details);
      if (!body) return;

      // Ensure open state is persisted properly
      const summary = qs('summary', details);
      if (!summary) return;

      summary.addEventListener('click', function (e) {
        e.preventDefault();
        const isOpen = details.open;

        if (!isOpen) {
          details.open = true;
          body.style.maxHeight = body.scrollHeight + 'px';
          body.style.opacity = '1';
        } else {
          body.style.maxHeight = '0';
          body.style.opacity = '0';
          setTimeout(() => { details.open = false; }, 280);
        }
      });

      // Set initial state
      if (details.open) {
        body.style.maxHeight = 'none';
        body.style.opacity = '1';
      } else {
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.style.overflow = 'hidden';
      }
    });

    // Add transition styles for topic bodies
    const style = document.createElement('style');
    style.textContent = `
      .topic-body {
        transition: max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease;
        overflow: hidden;
      }
      details[open] .topic-body {
        max-height: none !important;
        overflow: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     SMOOTH SCROLL NAVIGATION
  ============================================================ */
  function initSmoothScroll() {
    const headerHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '72',
      10
    );
    const navHeight = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '48',
      10
    );
    const offset = headerHeight + navHeight + 16;

    document.addEventListener('click', function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      const target = qs(hash);
      if (!target) return;

      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

      // Update URL without jump
      safe(() => history.pushState(null, '', hash));

      // Move focus for accessibility
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ============================================================
     ACTIVE SECTION HIGHLIGHTING — sidebar + nav
  ============================================================ */
  function initActiveHighlighting() {
    const sections = qsa('[id]').filter((el) =>
      el.matches('.lecture, .course-section, .reference-section')
    );
    if (!sections.length) return;

    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        highlightActive(sections);
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    highlightActive(sections);
  }

  function highlightActive(sections) {
    const offset = 120;
    let current = null;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= offset && rect.bottom > offset) {
        current = section.id;
      }
    });

    if (!current && sections.length) {
      current = sections[0].id;
    }

    // Sidebar links
    qsa('.sidebar-nav-list li a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-active', href === '#' + current);
    });

    // Top nav links
    qsa('.nav-list li a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      a.classList.toggle('is-active', href === '#' + current);
    });
  }

  /* ============================================================
     DARK / LIGHT THEME TOGGLE
  ============================================================ */
  function initThemeToggle() {
    // Inject toggle button into header
    const headerInner = qs('.header-inner');
    if (!headerInner) return;

    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Toggle light/dark theme');
    btn.setAttribute('title', 'Toggle Theme');
    btn.innerHTML = `<span class="theme-icon">◑</span>`;

    headerInner.appendChild(btn);

    btn.addEventListener('click', function () {
      const body = document.body;
      const isLight = body.getAttribute('data-theme') === 'light';
      body.setAttribute('data-theme', isLight ? 'engineering' : 'light');
      state.theme = isLight ? 'engineering' : 'light';
      btn.querySelector('.theme-icon').textContent = isLight ? '◑' : '○';
      Storage.save();
    });

    // Apply saved theme
    if (state.theme === 'light') {
      document.body.setAttribute('data-theme', 'light');
      const icon = btn.querySelector('.theme-icon');
      if (icon) icon.textContent = '○';
    }

    // Inject light theme CSS overrides
    const style = document.createElement('style');
    style.textContent = `
      body[data-theme="light"] {
        --bg-root: #f0f2f7;
        --bg-surface: #f5f7fc;
        --bg-card: #ffffff;
        --bg-card-hover: #f8faff;
        --bg-sidebar: #eef0f6;
        --bg-header: #ffffff;
        --bg-glass: rgba(255,255,255,0.85);
        --bg-inset: #f0f2f8;
        --text-primary: #1a1f2e;
        --text-secondary: #3d4760;
        --text-muted: #6b778f;
        --text-faint: #9aa5bd;
        --text-heading: #111827;
        --border-subtle: rgba(0,0,0,0.07);
        --border-dim: rgba(0,0,0,0.10);
        --border-card: rgba(0,0,0,0.08);
        --shadow-card: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05);
        --grad-header: linear-gradient(180deg,#ffffff 0%,#f9fafd 100%);
        --grad-sidebar: linear-gradient(180deg,#eff1f7 0%,#e8ebf4 100%);
      }
      body[data-theme="light"]::before { opacity: 0.4; }
      body[data-theme="light"] .lecture { background: #fff; }
      body[data-theme="light"] .formula-block { background: rgba(6,182,212,0.05); }
      body[data-theme="light"] .note-block[data-type="must-remember"] { background: rgba(0,212,255,0.05); }
      body[data-theme="light"] .note-block[data-type="exam"] { background: rgba(139,92,246,0.05); }
      body[data-theme="light"] .quick-summary { background: linear-gradient(135deg,rgba(0,212,255,0.07) 0%,rgba(59,130,246,0.04) 100%); }
      body[data-theme="light"] .definition-block { background: #f5f7fc; }
      body[data-theme="light"] .warning-block { background: rgba(244,63,94,0.05); }
      body[data-theme="light"] table.comparison-table tbody tr:nth-child(even),
      body[data-theme="light"] table.reference-table tbody tr:nth-child(even) { background: rgba(0,0,0,0.02); }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     BACK-TO-TOP BUTTON
  ============================================================ */
  function initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Back to top');
    btn.setAttribute('title', 'Back to top');
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    let visible = false;

    window.addEventListener('scroll', function () {
      const shouldShow = window.pageYOffset > 400;
      if (shouldShow !== visible) {
        visible = shouldShow;
        btn.classList.toggle('is-visible', visible);
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    const style = document.createElement('style');
    style.textContent = `
      .back-to-top {
        position: fixed;
        bottom: 28px;
        right: 24px;
        width: 42px;
        height: 42px;
        border-radius: 50%;
        background: rgba(0,212,255,0.12);
        border: 1px solid rgba(0,212,255,0.3);
        color: var(--accent-cyan);
        font-size: 1.1rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity 0.22s ease, transform 0.22s ease, background 0.15s ease;
        z-index: 200;
        pointer-events: none;
        font-family: var(--font-mono);
        line-height: 1;
      }
      .back-to-top.is-visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }
      .back-to-top:hover {
        background: rgba(0,212,255,0.22);
        box-shadow: 0 0 16px rgba(0,212,255,0.25);
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     MOBILE NAVIGATION — hamburger + slide-in sidebar
  ============================================================ */
  function initMobileNav() {
    if (window.innerWidth > 768) return;

    const header = qs('.header-inner');
    const sidebar = qs('#sidebar');
    if (!header || !sidebar) return;

    // Create toggle button
    const toggle = document.createElement('button');
    toggle.className = 'mobile-nav-toggle';
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-label', 'Open course navigation');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = `<span></span><span></span><span></span>`;
    header.insertBefore(toggle, header.firstChild);

    // Create close button inside sidebar
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sidebar-close';
    closeBtn.setAttribute('type', 'button');
    closeBtn.setAttribute('aria-label', 'Close navigation');
    closeBtn.innerHTML = '✕';
    sidebar.insertBefore(closeBtn, sidebar.firstChild);

    let open = false;

    function openSidebar() {
      open = true;
      sidebar.classList.add('mobile-open');
      toggle.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    }

    function closeSidebar() {
      open = false;
      sidebar.classList.remove('mobile-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.focus();
    }

    toggle.addEventListener('click', function () {
      open ? closeSidebar() : openSidebar();
    });

    closeBtn.addEventListener('click', closeSidebar);

    // Close when clicking a sidebar link
    qsa('.sidebar-nav-list li a', sidebar).forEach((link) => {
      link.addEventListener('click', () => {
        if (open) closeSidebar();
      });
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) closeSidebar();
    });

    // Mobile styles
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        #sidebar {
          display: block !important;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 280px;
          max-width: 85vw;
          z-index: 300;
          transform: translateX(-100%);
          transition: transform 0.28s cubic-bezier(0.4,0,0.2,1);
          box-shadow: none;
          padding-top: 60px;
        }
        #sidebar.mobile-open {
          transform: translateX(0);
          box-shadow: 4px 0 24px rgba(0,0,0,0.5);
        }
        .mobile-nav-toggle {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 36px;
          height: 36px;
          padding: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          cursor: pointer;
          flex-shrink: 0;
        }
        .mobile-nav-toggle span {
          display: block;
          height: 2px;
          background: var(--text-primary);
          border-radius: 2px;
          transition: all 0.2s ease;
        }
        .sidebar-close {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 32px;
          height: 32px;
          background: rgba(255,255,255,0.06);
          border: 1px solid var(--border-subtle);
          border-radius: 50%;
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }
      }
      @media (min-width: 769px) {
        .mobile-nav-toggle, .sidebar-close { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     SIDEBAR ACTIVE LINK STYLES
  ============================================================ */
  function injectNavActiveStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-nav-list li a.is-active {
        color: var(--accent-cyan);
        border-left-color: var(--accent-cyan);
        background: rgba(0,212,255,0.06);
        font-weight: 500;
      }
      .sidebar-nav-list li a.is-studied::after {
        content: '✓';
        margin-left: auto;
        font-size: 0.72rem;
        color: var(--accent-emerald);
        font-weight: 700;
      }
      .nav-list li a.is-active {
        color: var(--accent-cyan);
        border-bottom-color: var(--accent-cyan);
        background: rgba(0,212,255,0.06);
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     STUDY BUTTON STYLES
  ============================================================ */
  function injectStudyButtonStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .study-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 16px;
        padding: 8px 18px;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--text-muted);
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border-dim);
        border-radius: var(--radius-pill);
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .study-btn:hover {
        color: var(--accent-emerald);
        border-color: var(--border-emerald);
        background: rgba(16,185,129,0.06);
      }
      .study-btn.is-active {
        color: var(--accent-emerald);
        border-color: rgba(16,185,129,0.4);
        background: rgba(16,185,129,0.08);
        box-shadow: 0 0 12px rgba(16,185,129,0.1);
      }
      .study-btn-icon {
        font-size: 0.9rem;
        line-height: 1;
      }
      .theme-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        background: rgba(255,255,255,0.05);
        border: 1px solid var(--border-subtle);
        border-radius: 50%;
        cursor: pointer;
        color: var(--text-muted);
        font-size: 1rem;
        transition: all 0.18s ease;
        flex-shrink: 0;
      }
      .theme-toggle:hover {
        color: var(--accent-cyan);
        border-color: var(--border-accent);
        background: rgba(0,212,255,0.06);
      }
      .lecture[data-status="completed"] .lecture-header {
        background: linear-gradient(180deg, rgba(16,185,129,0.05) 0%, transparent 40%);
      }
      .lecture[data-status="completed"] .lecture-badge {
        background: rgba(16,185,129,0.08);
        border-color: rgba(16,185,129,0.25);
        color: var(--accent-emerald);
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     INTERACTIVE QUIZ SYSTEM
  ============================================================ */
  const QUIZ_QUESTIONS = [
    {
      id: 'q_ohm_1',
      topic: 'Ohm\'s Law',
      difficulty: 'basic',
      question: 'A 470 Ω resistor is connected to a 9 V battery. What current flows through it?',
      options: ['9.1 mA', '19.1 mA', '47 mA', '0.47 A'],
      correct: 1,
      explanation: 'I = V / R = 9 / 470 = 0.01915 A ≈ 19.1 mA. Using Ohm\'s Law in the form I = V/R.',
    },
    {
      id: 'q_power_1',
      topic: 'Power',
      difficulty: 'basic',
      question: 'A 100 Ω resistor has 5 V across it. What power does it dissipate?',
      options: ['50 mW', '100 mW', '250 mW', '500 mW'],
      correct: 2,
      explanation: 'P = V² / R = 25 / 100 = 0.25 W = 250 mW. Alternatively, I = 5/100 = 50 mA, P = VI = 5 × 0.05 = 0.25 W.',
    },
    {
      id: 'q_kcl_1',
      topic: 'KCL',
      difficulty: 'intermediate',
      question: 'At a node, currents entering are 4 A and 7 A. One current leaves at 6 A. What is the second leaving current?',
      options: ['2 A', '3 A', '5 A', '11 A'],
      correct: 2,
      explanation: 'KCL: ΣI_in = ΣI_out → 4 + 7 = 6 + I₂ → I₂ = 11 − 6 = 5 A.',
    },
    {
      id: 'q_opamp_1',
      topic: 'Op-Amp',
      difficulty: 'intermediate',
      question: 'An inverting op-amp has Rin = 2 kΩ and Rf = 20 kΩ. What is the voltage gain?',
      options: ['+10', '−10', '+0.1', '−0.1'],
      correct: 1,
      explanation: 'Av = −Rf / Rin = −20,000 / 2,000 = −10. The negative sign indicates 180° phase inversion.',
    },
    {
      id: 'q_led_1',
      topic: 'LED Circuit',
      difficulty: 'basic',
      question: 'Calculate the series resistor for a blue LED (Vf = 3.2 V, If = 20 mA) powered from 5 V.',
      options: ['68 Ω', '90 Ω', '160 Ω', '220 Ω'],
      correct: 1,
      explanation: 'R = (Vsupply − Vf) / If = (5 − 3.2) / 0.020 = 1.8 / 0.02 = 90 Ω. Use 100 Ω (next standard value) for safety.',
    },
    {
      id: 'q_rms_1',
      topic: 'AC / RMS',
      difficulty: 'basic',
      question: 'A sine wave has a peak voltage of 170 V. What is the RMS voltage?',
      options: ['85 V', '108 V', '120 V', '170 V'],
      correct: 2,
      explanation: 'V_RMS = V_peak / √2 = 170 / 1.414 ≈ 120 V. This is exactly why household "120 V" mains has a peak of ~170 V.',
    },
    {
      id: 'q_bjt_1',
      topic: 'BJT Transistors',
      difficulty: 'intermediate',
      question: 'A BJT has β (hFE) = 150 and base current IB = 0.5 mA. What is the collector current IC?',
      options: ['0.5 mA', '75 mA', '150 mA', '300 mA'],
      correct: 1,
      explanation: 'IC = β × IB = 150 × 0.5 mA = 75 mA. This demonstrates the current amplification of a BJT.',
    },
    {
      id: 'q_cap_1',
      topic: 'Capacitors',
      difficulty: 'basic',
      question: 'What does capacitive reactance (Xc) do as frequency increases?',
      options: ['Increases', 'Stays constant', 'Decreases', 'Becomes negative'],
      correct: 2,
      explanation: 'Xc = 1/(2πfC). As frequency f increases, Xc decreases. At high frequency, capacitors act as near-short circuits. At DC (f=0), Xc = ∞ (open circuit).',
    },
    {
      id: 'q_kvl_1',
      topic: 'KVL',
      difficulty: 'intermediate',
      question: 'A 12 V supply is connected to R1 = 10 Ω and R2 = 20 Ω in series. What is the voltage drop across R2?',
      options: ['4 V', '6 V', '8 V', '12 V'],
      correct: 2,
      explanation: 'R_total = 30 Ω. I = 12/30 = 0.4 A. V2 = I × R2 = 0.4 × 20 = 8 V. Verify with voltage divider: V2 = 12 × 20/30 = 8 V ✓',
    },
    {
      id: 'q_diode_1',
      topic: 'Diodes',
      difficulty: 'basic',
      question: 'What is the approximate forward voltage drop of a standard silicon rectifier diode?',
      options: ['0.1–0.2 V', '0.3–0.4 V', '0.6–0.7 V', '1.5–2.0 V'],
      correct: 2,
      explanation: 'Silicon diodes have Vf ≈ 0.6–0.7 V. Schottky diodes are lower (~0.3 V). LEDs are higher (1.8–3.5 V depending on color).',
    },
    {
      id: 'q_555_1',
      topic: 'ICs',
      difficulty: 'advanced',
      question: 'A 555 timer in monostable mode uses R = 100 kΩ and C = 10 µF. What is the output pulse duration?',
      options: ['0.11 s', '1.1 s', '11 s', '110 ms'],
      correct: 1,
      explanation: 't = 1.1 × R × C = 1.1 × 100,000 × 0.00001 = 1.1 seconds. This is the fundamental monostable 555 formula.',
    },
    {
      id: 'q_parallel_1',
      topic: 'Parallel Circuits',
      difficulty: 'intermediate',
      question: 'Two resistors, 20 Ω and 60 Ω, are in parallel. What is the total resistance?',
      options: ['5 Ω', '15 Ω', '40 Ω', '80 Ω'],
      correct: 1,
      explanation: 'R_total = (R1 × R2)/(R1 + R2) = (20 × 60)/(20 + 60) = 1200/80 = 15 Ω. Parallel resistance is always less than the smallest resistor.',
    },
    {
      id: 'q_motor_1',
      topic: 'Motors',
      difficulty: 'intermediate',
      question: 'Which DC motor type has the HIGHEST starting torque?',
      options: ['Shunt motor', 'Series motor', 'Compound motor', 'Brushless DC motor'],
      correct: 1,
      explanation: 'DC series motors have the highest starting torque because torque ∝ Ia². With field and armature in series, high starting current produces very high flux and torque. However, they must never run without load.',
    },
    {
      id: 'q_semiconductor_1',
      topic: 'Semiconductors',
      difficulty: 'basic',
      question: 'N-type semiconductor is created by doping silicon with which type of atom?',
      options: ['Trivalent (3 valence electrons)', 'Pentavalent (5 valence electrons)', 'Divalent (2 valence electrons)', 'Tetravalent (4 valence electrons)'],
      correct: 1,
      explanation: 'N-type silicon is doped with pentavalent atoms (phosphorus, arsenic) which have 5 valence electrons. The extra electron becomes a free carrier, making electrons the majority carriers.',
    },
    {
      id: 'q_opamp_2',
      topic: 'Op-Amp',
      difficulty: 'intermediate',
      question: 'What is the voltage gain of a non-inverting op-amp with Rf = 47 kΩ and R1 = 10 kΩ?',
      options: ['3.7', '4.7', '5.7', '−4.7'],
      correct: 2,
      explanation: 'Av = 1 + Rf/R1 = 1 + 47/10 = 1 + 4.7 = 5.7. Non-inverting gain is always ≥ 1 and never inverts the signal.',
    },
  ];

  function initQuizSystem() {
    const quizArea = qs('#quiz-area');
    if (!quizArea) return;

    // Replace the static quiz content with our interactive system
    quizArea.innerHTML = '';

    const heading = document.createElement('h3');
    heading.id = 'quiz-heading';
    heading.textContent = 'Interactive Practice Quiz';
    quizArea.appendChild(heading);

    const desc = document.createElement('p');
    desc.className = 'quiz-description';
    desc.textContent = `Test your knowledge across all 10 lectures — ${QUIZ_QUESTIONS.length} questions covering Ohm's Law, KCL/KVL, transistors, op-amps, motors, and more.`;
    quizArea.appendChild(desc);

    // Stats bar
    const statsBar = document.createElement('div');
    statsBar.className = 'quiz-stats-bar';
    statsBar.innerHTML = `
      <span class="qs-item"><span class="qs-val" id="qs-total">${QUIZ_QUESTIONS.length}</span> Questions</span>
      <span class="qs-item"><span class="qs-val" id="qs-answered">0</span> Answered</span>
      <span class="qs-item"><span class="qs-val" id="qs-correct">0</span> Correct</span>
      <span class="qs-item"><span class="qs-val" id="qs-pct">0%</span> Score</span>
    `;
    quizArea.appendChild(statsBar);

    // Progress bar for quiz
    const qProgressContainer = document.createElement('div');
    qProgressContainer.className = 'quiz-progress-container';
    qProgressContainer.innerHTML = `<div class="quiz-progress-bar" id="quiz-progress-bar" style="width:0%"></div>`;
    quizArea.appendChild(qProgressContainer);

    // Questions container
    const questionsEl = document.createElement('div');
    questionsEl.className = 'quiz-questions-list';
    quizArea.appendChild(questionsEl);

    // Render all questions
    QUIZ_QUESTIONS.forEach((q, idx) => {
      questionsEl.appendChild(buildQuestion(q, idx));
    });

    // Action bar
    const actionBar = document.createElement('div');
    actionBar.className = 'quiz-action-bar';

    const resetBtn = document.createElement('button');
    resetBtn.className = 'quiz-reset-btn';
    resetBtn.setAttribute('type', 'button');
    resetBtn.textContent = 'Reset Quiz';
    resetBtn.addEventListener('click', resetQuiz);

    const scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'quiz-score-display';
    scoreDisplay.id = 'quiz-score-display';
    scoreDisplay.setAttribute('aria-live', 'polite');

    actionBar.appendChild(resetBtn);
    actionBar.appendChild(scoreDisplay);
    quizArea.appendChild(actionBar);

    // Inject quiz-specific styles
    injectQuizStyles();

    // Restore saved answers if any
    restoreQuizState();

    updateQuizStats();
  }

  function buildQuestion(q, idx) {
    const article = document.createElement('article');
    article.className = 'iq-question';
    article.id = 'iq-' + q.id;
    article.setAttribute('data-question-id', q.id);
    article.setAttribute('data-correct', q.correct);
    article.setAttribute('data-answered', 'false');

    const meta = document.createElement('div');
    meta.className = 'iq-meta';
    meta.innerHTML = `<span class="iq-num">Q${idx + 1}</span><span class="iq-topic">${q.topic}</span><span class="iq-diff iq-diff-${q.difficulty}">${q.difficulty}</span>`;

    const qText = document.createElement('p');
    qText.className = 'iq-text';
    qText.textContent = q.question;

    const options = document.createElement('ul');
    options.className = 'iq-options';
    options.setAttribute('role', 'radiogroup');
    options.setAttribute('aria-label', `Options for question ${idx + 1}`);

    q.options.forEach((opt, optIdx) => {
      const li = document.createElement('li');
      li.className = 'iq-option';

      const btn = document.createElement('button');
      btn.className = 'iq-option-btn';
      btn.setAttribute('type', 'button');
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', 'false');
      btn.setAttribute('data-option-idx', optIdx);
      btn.innerHTML = `<span class="iq-opt-letter">${String.fromCharCode(65 + optIdx)}</span><span class="iq-opt-text">${opt}</span>`;

      btn.addEventListener('click', function () {
        handleOptionClick(article, q, optIdx, btn);
      });

      li.appendChild(btn);
      options.appendChild(li);
    });

    const feedback = document.createElement('div');
    feedback.className = 'iq-feedback';
    feedback.setAttribute('aria-live', 'polite');
    feedback.hidden = true;

    article.appendChild(meta);
    article.appendChild(qText);
    article.appendChild(options);
    article.appendChild(feedback);

    return article;
  }

  function handleOptionClick(article, q, optIdx, clickedBtn) {
    if (article.getAttribute('data-answered') === 'true') return;

    const isCorrect = optIdx === q.correct;
    article.setAttribute('data-answered', 'true');
    article.setAttribute('data-result', isCorrect ? 'correct' : 'incorrect');

    // Mark selected
    qsa('.iq-option-btn', article).forEach((b) => {
      b.disabled = true;
      b.setAttribute('aria-checked', 'false');
      const i = parseInt(b.getAttribute('data-option-idx'), 10);
      if (i === q.correct) b.classList.add('iq-correct');
      if (i === optIdx && !isCorrect) b.classList.add('iq-wrong');
    });

    clickedBtn.setAttribute('aria-checked', 'true');

    // Show feedback
    const feedback = qs('.iq-feedback', article);
    if (feedback) {
      feedback.hidden = false;
      feedback.innerHTML = `
        <span class="iq-result-icon">${isCorrect ? '✓' : '✗'}</span>
        <span class="iq-result-text">${isCorrect ? 'Correct!' : `Incorrect. Correct answer: <strong>${String.fromCharCode(65 + q.correct)}. ${q.options[q.correct]}</strong>`}</span>
        <p class="iq-explanation">${q.explanation}</p>
      `;
      feedback.className = `iq-feedback iq-feedback-${isCorrect ? 'correct' : 'wrong'}`;
    }

    // Update state
    state.quizState.answers[q.id] = { selected: optIdx, correct: isCorrect };
    updateQuizStats();
    Storage.save();

    announceToSR(isCorrect ? 'Correct answer!' : `Incorrect. The correct answer is ${q.options[q.correct]}.`);
  }

  function updateQuizStats() {
    const answered = Object.keys(state.quizState.answers).length;
    const correct = Object.values(state.quizState.answers).filter((a) => a.correct).length;
    const pct = answered > 0 ? Math.round((correct / answered) * 100) : 0;
    const totalPct = Math.round((answered / QUIZ_QUESTIONS.length) * 100);

    safe(() => {
      const answEl = qs('#qs-answered');
      const corrEl = qs('#qs-correct');
      const pctEl = qs('#qs-pct');
      const progBar = qs('#quiz-progress-bar');
      const scoreDisp = qs('#quiz-score-display');

      if (answEl) answEl.textContent = answered;
      if (corrEl) corrEl.textContent = correct;
      if (pctEl) pctEl.textContent = pct + '%';
      if (progBar) progBar.style.width = totalPct + '%';

      if (answered === QUIZ_QUESTIONS.length && scoreDisp) {
        state.quizState.completed = true;
        let grade = 'Needs Review';
        let gradeClass = 'grade-fail';
        if (pct >= 90) { grade = 'Excellent!'; gradeClass = 'grade-excellent'; }
        else if (pct >= 75) { grade = 'Good Work'; gradeClass = 'grade-good'; }
        else if (pct >= 60) { grade = 'Passing'; gradeClass = 'grade-pass'; }
        scoreDisp.innerHTML = `
          <div class="quiz-final-score ${gradeClass}">
            <span class="qfs-label">Final Score</span>
            <span class="qfs-score">${correct}/${QUIZ_QUESTIONS.length}</span>
            <span class="qfs-pct">${pct}%</span>
            <span class="qfs-grade">${grade}</span>
          </div>
        `;
        announceToSR(`Quiz complete! Your score is ${correct} out of ${QUIZ_QUESTIONS.length}, ${pct}%.`);
        Storage.save();
      }
    });
  }

  function resetQuiz() {
    state.quizState = { current: 0, answers: {}, completed: false, score: 0 };
    Storage.save();

    qsa('.iq-question').forEach((article) => {
      article.setAttribute('data-answered', 'false');
      article.removeAttribute('data-result');
      qsa('.iq-option-btn', article).forEach((btn) => {
        btn.disabled = false;
        btn.classList.remove('iq-correct', 'iq-wrong');
        btn.setAttribute('aria-checked', 'false');
      });
      const feedback = qs('.iq-feedback', article);
      if (feedback) {
        feedback.hidden = true;
        feedback.className = 'iq-feedback';
        feedback.innerHTML = '';
      }
    });

    const scoreDisp = qs('#quiz-score-display');
    if (scoreDisp) scoreDisp.innerHTML = '';

    updateQuizStats();
    announceToSR('Quiz has been reset.');
  }

  function restoreQuizState() {
    const answers = state.quizState.answers;
    if (!Object.keys(answers).length) return;

    QUIZ_QUESTIONS.forEach((q) => {
      const saved = answers[q.id];
      if (!saved) return;

      const article = qs('#iq-' + q.id);
      if (!article) return;

      article.setAttribute('data-answered', 'true');
      article.setAttribute('data-result', saved.correct ? 'correct' : 'incorrect');

      qsa('.iq-option-btn', article).forEach((btn) => {
        btn.disabled = true;
        const i = parseInt(btn.getAttribute('data-option-idx'), 10);
        if (i === q.correct) btn.classList.add('iq-correct');
        if (i === saved.selected && !saved.correct) btn.classList.add('iq-wrong');
        if (i === saved.selected) btn.setAttribute('aria-checked', 'true');
      });

      const feedback = qs('.iq-feedback', article);
      if (feedback) {
        feedback.hidden = false;
        feedback.className = `iq-feedback iq-feedback-${saved.correct ? 'correct' : 'wrong'}`;
        feedback.innerHTML = `
          <span class="iq-result-icon">${saved.correct ? '✓' : '✗'}</span>
          <span class="iq-result-text">${saved.correct ? 'Correct!' : `Incorrect. Correct answer: <strong>${String.fromCharCode(65 + q.correct)}. ${q.options[q.correct]}</strong>`}</span>
          <p class="iq-explanation">${q.explanation}</p>
        `;
      }
    });
  }

  function injectQuizStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Stats Bar */
      .quiz-stats-bar {
        display: flex;
        gap: 24px;
        padding: 14px 20px;
        background: var(--bg-inset);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        margin-bottom: 16px;
        flex-wrap: wrap;
      }
      .qs-item {
        font-family: var(--font-mono);
        font-size: 0.75rem;
        color: var(--text-muted);
        display: flex;
        gap: 6px;
        align-items: baseline;
      }
      .qs-val {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--accent-cyan);
      }

      /* Quiz Progress */
      .quiz-progress-container {
        height: 3px;
        background: rgba(255,255,255,0.06);
        border-radius: 99px;
        overflow: hidden;
        margin-bottom: 20px;
      }
      .quiz-progress-bar {
        height: 100%;
        background: var(--grad-accent);
        border-radius: 99px;
        transition: width 0.3s ease;
      }

      /* Question Cards */
      .iq-question {
        background: var(--bg-inset);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 20px 24px;
        margin-bottom: 12px;
        transition: border-color 0.2s ease;
      }
      .iq-question[data-result="correct"] { border-color: rgba(16,185,129,0.3); }
      .iq-question[data-result="incorrect"] { border-color: rgba(244,63,94,0.3); }

      .iq-meta {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 12px;
        flex-wrap: wrap;
      }
      .iq-num {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 700;
        color: var(--accent-cyan);
        background: rgba(0,212,255,0.08);
        border: 1px solid rgba(0,212,255,0.2);
        padding: 2px 8px;
        border-radius: 99px;
      }
      .iq-topic {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        color: var(--text-muted);
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border-subtle);
        padding: 2px 8px;
        border-radius: 99px;
      }
      .iq-diff {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        padding: 2px 8px;
        border-radius: 99px;
        letter-spacing: 0.05em;
      }
      .iq-diff-basic { color: var(--accent-emerald); background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2); }
      .iq-diff-intermediate { color: var(--accent-amber); background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); }
      .iq-diff-advanced { color: var(--accent-rose); background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.2); }

      .iq-text {
        font-size: 0.92rem;
        font-weight: 500;
        color: var(--text-primary);
        margin-bottom: 14px;
        line-height: 1.55;
      }

      /* Options */
      .iq-options {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 7px;
        margin: 0;
      }
      .iq-option { margin: 0; padding: 0; }
      .iq-option-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 14px;
        background: rgba(255,255,255,0.025);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        cursor: pointer;
        text-align: left;
        transition: all 0.15s ease;
        color: var(--text-secondary);
        font-size: 0.87rem;
        font-family: var(--font-body);
      }
      .iq-option-btn:hover:not(:disabled) {
        background: rgba(0,212,255,0.05);
        border-color: rgba(0,212,255,0.25);
        color: var(--text-primary);
      }
      .iq-option-btn:disabled { cursor: default; }
      .iq-option-btn.iq-correct {
        background: rgba(16,185,129,0.08);
        border-color: rgba(16,185,129,0.4);
        color: var(--accent-emerald);
      }
      .iq-option-btn.iq-wrong {
        background: rgba(244,63,94,0.07);
        border-color: rgba(244,63,94,0.35);
        color: var(--accent-rose);
      }
      .iq-opt-letter {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        min-width: 22px;
        border-radius: 50%;
        font-family: var(--font-mono);
        font-size: 0.68rem;
        font-weight: 700;
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--border-dim);
        color: var(--text-muted);
        transition: all 0.15s ease;
      }
      .iq-option-btn.iq-correct .iq-opt-letter {
        background: rgba(16,185,129,0.2);
        border-color: rgba(16,185,129,0.5);
        color: var(--accent-emerald);
      }
      .iq-option-btn.iq-wrong .iq-opt-letter {
        background: rgba(244,63,94,0.15);
        border-color: rgba(244,63,94,0.4);
        color: var(--accent-rose);
      }

      /* Feedback */
      .iq-feedback {
        margin-top: 12px;
        padding: 12px 16px;
        border-radius: var(--radius-sm);
        font-size: 0.85rem;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: flex-start;
        animation: fadeInDown 0.2s ease;
      }
      .iq-feedback-correct {
        background: rgba(16,185,129,0.07);
        border: 1px solid rgba(16,185,129,0.25);
      }
      .iq-feedback-wrong {
        background: rgba(244,63,94,0.06);
        border: 1px solid rgba(244,63,94,0.2);
      }
      .iq-result-icon {
        font-size: 1rem;
        font-weight: 700;
        flex-shrink: 0;
      }
      .iq-feedback-correct .iq-result-icon { color: var(--accent-emerald); }
      .iq-feedback-wrong .iq-result-icon { color: var(--accent-rose); }
      .iq-result-text {
        color: var(--text-secondary);
        font-size: 0.85rem;
        flex: 1;
        min-width: 200px;
      }
      .iq-explanation {
        width: 100%;
        font-family: var(--font-mono);
        font-size: 0.78rem;
        color: var(--text-muted);
        margin: 4px 0 0;
        line-height: 1.55;
      }

      /* Action Bar */
      .quiz-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid var(--border-subtle);
        flex-wrap: wrap;
      }
      .quiz-reset-btn {
        padding: 10px 22px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border-dim);
        border-radius: var(--radius-pill);
        color: var(--text-muted);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .quiz-reset-btn:hover {
        color: var(--accent-rose);
        border-color: rgba(244,63,94,0.3);
        background: rgba(244,63,94,0.05);
      }

      /* Final Score */
      .quiz-final-score {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 14px 22px;
        border-radius: var(--radius-md);
        border: 1px solid;
        flex-wrap: wrap;
      }
      .grade-excellent { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.3); }
      .grade-good { background: rgba(0,212,255,0.06); border-color: rgba(0,212,255,0.25); }
      .grade-pass { background: rgba(245,158,11,0.07); border-color: rgba(245,158,11,0.25); }
      .grade-fail { background: rgba(244,63,94,0.06); border-color: rgba(244,63,94,0.2); }
      .qfs-label {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--text-muted);
      }
      .qfs-score {
        font-family: var(--font-display);
        font-size: 1.4rem;
        font-weight: 800;
        color: var(--text-heading);
        letter-spacing: -0.02em;
      }
      .qfs-pct {
        font-family: var(--font-mono);
        font-size: 1rem;
        font-weight: 700;
        color: var(--accent-cyan);
      }
      .qfs-grade {
        font-family: var(--font-display);
        font-size: 0.95rem;
        font-weight: 700;
        color: var(--text-heading);
      }
      .grade-excellent .qfs-pct, .grade-excellent .qfs-grade { color: var(--accent-emerald); }
      .grade-fail .qfs-pct, .grade-fail .qfs-grade { color: var(--accent-rose); }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     DASHBOARD STATS — inject a live stats widget in sidebar
  ============================================================ */
  function initDashboardStats() {
    const progressSection = qs('.progress-section.sidebar-section');
    if (!progressSection) return;

    const statsEl = document.createElement('div');
    statsEl.className = 'dash-stats';
    statsEl.innerHTML = `
      <div class="dash-stat">
        <span class="ds-icon">📖</span>
        <div class="ds-info">
          <span class="ds-val" id="ds-studied">0</span>
          <span class="ds-label">Studied</span>
        </div>
      </div>
      <div class="dash-stat">
        <span class="ds-icon">🎯</span>
        <div class="ds-info">
          <span class="ds-val" id="ds-remaining">10</span>
          <span class="ds-label">Remaining</span>
        </div>
      </div>
    `;
    progressSection.appendChild(statsEl);

    const style = document.createElement('style');
    style.textContent = `
      .dash-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 12px;
      }
      .dash-stat {
        background: rgba(255,255,255,0.025);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        padding: 10px 10px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ds-icon { font-size: 1rem; }
      .ds-info { display: flex; flex-direction: column; }
      .ds-val {
        font-family: var(--font-mono);
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--accent-cyan);
        line-height: 1;
      }
      .ds-label {
        font-family: var(--font-mono);
        font-size: 0.62rem;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);

    updateDashStats();
  }

  function updateDashStats() {
    const studied = state.studiedLectures.size;
    const remaining = TOTAL_LECTURES - studied;
    const studiedEl = qs('#ds-studied');
    const remainEl = qs('#ds-remaining');
    if (studiedEl) studiedEl.textContent = studied;
    if (remainEl) remainEl.textContent = remaining;
  }

  // Override Progress.update to also update dash stats
  const _origProgressUpdate = Progress.update.bind(Progress);
  Progress.update = function () {
    _origProgressUpdate();
    updateDashStats();
  };

  /* ============================================================
     ACCESSIBILITY — SCREEN READER ANNOUNCEMENTS
  ============================================================ */
  let srRegion;

  function announceToSR(msg) {
    if (!srRegion) {
      srRegion = document.createElement('div');
      srRegion.setAttribute('aria-live', 'assertive');
      srRegion.setAttribute('aria-atomic', 'true');
      srRegion.className = 'sr-only';
      document.body.appendChild(srRegion);

      const style = document.createElement('style');
      style.textContent = `.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;padding:0;margin:-1px;}`;
      document.head.appendChild(style);
    }
    srRegion.textContent = '';
    requestAnimationFrame(() => { srRegion.textContent = msg; });
  }

  /* ============================================================
     KEYBOARD ACCESSIBILITY — focus trap utils
  ============================================================ */
  function initKeyboardAccess() {
    // Allow Enter/Space on summary elements
    qsa('summary').forEach((summary) => {
      summary.setAttribute('tabindex', '0');
    });
  }

  /* ============================================================
     FORMULA HIGHLIGHT — copy on click
  ============================================================ */
  function initFormulaCopy() {
    qsa('code.formula').forEach((code) => {
      code.setAttribute('title', 'Click to copy formula');
      code.style.cursor = 'pointer';

      code.addEventListener('click', function () {
        const text = code.textContent;
        safe(() => {
          navigator.clipboard.writeText(text).then(() => {
            const orig = code.textContent;
            code.textContent = '✓ Copied!';
            setTimeout(() => { code.textContent = orig; }, 1200);
            announceToSR('Formula copied to clipboard.');
          });
        });
      });
    });
  }

  /* ============================================================
     SEARCH HIGHLIGHT — simple in-page search
  ============================================================ */
  function initSearch() {
    const nav = qs('#primary-nav .nav-list');
    if (!nav) return;

    const searchLi = document.createElement('li');
    searchLi.style.marginLeft = 'auto';

    const searchInput = document.createElement('input');
    searchInput.type = 'search';
    searchInput.placeholder = 'Search topics…';
    searchInput.className = 'nav-search';
    searchInput.setAttribute('aria-label', 'Search course content');

    searchLi.appendChild(searchInput);
    nav.appendChild(searchLi);

    const style = document.createElement('style');
    style.textContent = `
      .nav-search {
        padding: 5px 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--border-dim);
        border-radius: var(--radius-pill);
        color: var(--text-secondary);
        font-family: var(--font-body);
        font-size: 0.78rem;
        outline: none;
        transition: all 0.18s ease;
        width: 160px;
        margin: auto 0;
      }
      .nav-search:focus {
        border-color: var(--border-accent);
        background: rgba(0,212,255,0.04);
        color: var(--text-primary);
        width: 220px;
      }
      .nav-search::placeholder { color: var(--text-faint); }
      .search-highlight {
        background: rgba(245,158,11,0.25);
        border-radius: 2px;
        color: var(--accent-amber);
      }
      .search-hidden { display: none !important; }
      @media (max-width: 768px) {
        .nav-search { width: 120px; }
        .nav-search:focus { width: 160px; }
      }
    `;
    document.head.appendChild(style);

    let debounceTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => performSearch(searchInput.value.trim()), 250);
    });
  }

  function performSearch(query) {
    // Clear previous highlights
    qsa('.search-highlight').forEach((el) => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });

    // Show all topic sections
    qsa('.topic-section').forEach((s) => s.classList.remove('search-hidden'));

    if (!query || query.length < 2) return;

    const lq = query.toLowerCase();
    let matchCount = 0;

    qsa('.topic-section').forEach((section) => {
      const text = section.textContent.toLowerCase();
      if (!text.includes(lq)) {
        section.classList.add('search-hidden');
      } else {
        matchCount++;
        // Open it if closed
        const details = qs('details', section);
        if (details && !details.open) {
          details.open = true;
          const body = qs('.topic-body', details);
          if (body) {
            body.style.maxHeight = 'none';
            body.style.opacity = '1';
          }
        }
      }
    });

    announceToSR(matchCount > 0 ? `${matchCount} sections match "${query}"` : `No results for "${query}"`);
  }

  /* ============================================================
     RESPONSIVE RESIZE HANDLER
  ============================================================ */
  function initResizeHandler() {
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Re-initialize mobile nav on width change
        const sidebar = qs('#sidebar');
        if (sidebar && window.innerWidth > 768) {
          sidebar.classList.remove('mobile-open');
          sidebar.style.transform = '';
        }
      }, 200);
    }, { passive: true });
  }

  /* ============================================================
     STICKY LECTURE PROGRESS INDICATOR
  ============================================================ */
  function initReadingProgress() {
    const bar = document.createElement('div');
    bar.className = 'reading-progress';
    document.body.appendChild(bar);

    const style = document.createElement('style');
    style.textContent = `
      .reading-progress {
        position: fixed;
        top: 0;
        left: 0;
        height: 2px;
        width: 0%;
        background: var(--grad-accent);
        z-index: 500;
        transition: width 0.1s linear;
        pointer-events: none;
        box-shadow: 0 0 8px rgba(0,212,255,0.5);
      }
    `;
    document.head.appendChild(style);

    window.addEventListener('scroll', function () {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      bar.style.width = Math.min(100, pct) + '%';
    }, { passive: true });
  }

  /* ============================================================
     LECTURE EXPAND-ALL / COLLAPSE-ALL
  ============================================================ */
  function initLectureToggleAll() {
    qsa('.lecture').forEach((lecture) => {
      const header = qs('.lecture-header', lecture);
      if (!header) return;

      const toggleAll = document.createElement('button');
      toggleAll.className = 'toggle-all-btn';
      toggleAll.setAttribute('type', 'button');
      toggleAll.textContent = 'Expand All';
      toggleAll.setAttribute('aria-label', 'Expand or collapse all topics in this lecture');

      toggleAll.addEventListener('click', function () {
        const details = qsa('details', lecture);
        const anyOpen = details.some((d) => d.open);
        const expand = !anyOpen;

        details.forEach((d) => {
          if (expand && !d.open) {
            d.open = true;
            const body = qs('.topic-body', d);
            if (body) { body.style.maxHeight = 'none'; body.style.opacity = '1'; }
          } else if (!expand && d.open) {
            const body = qs('.topic-body', d);
            if (body) { body.style.maxHeight = '0'; body.style.opacity = '0'; }
            setTimeout(() => { d.open = false; }, 280);
          }
        });

        toggleAll.textContent = expand ? 'Collapse All' : 'Expand All';
      });

      header.appendChild(toggleAll);
    });

    const style = document.createElement('style');
    style.textContent = `
      .toggle-all-btn {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        margin-top: 12px;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--text-faint);
        background: transparent;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-pill);
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .toggle-all-btn:hover {
        color: var(--accent-blue);
        border-color: rgba(59,130,246,0.3);
        background: rgba(59,130,246,0.04);
      }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     INITIALIZATION — SAFE BOOT
  ============================================================ */
  function init() {
    // Load persisted data
    Storage.load();

    // Inject styles that need to come before DOM manipulation
    injectNavActiveStyles();
    injectStudyButtonStyles();

    // Core features
    safe(initThemeToggle);
    safe(initReadingProgress);
    safe(initBackToTop);
    safe(initSmoothScroll);
    safe(initCollapsibles);
    safe(initActiveHighlighting);
    safe(initKeyboardAccess);

    // Progress system
    safe(injectStudyButtons);
    safe(initDashboardStats);
    safe(() => Progress.update());
    safe(syncStudyButtons);

    // Mobile
    safe(initMobileNav);
    safe(initResizeHandler);

    // Content features
    safe(initLectureToggleAll);
    safe(initFormulaCopy);
    safe(initSearch);

    // Quiz — runs last so DOM is ready
    safe(initQuizSystem);

    // Mark app as ready
    safe(() => {
      document.body.setAttribute('data-js', 'ready');
      document.documentElement.classList.add('js-loaded');
    });
  }

  /* ============================================================
     BOOT — wait for DOM
  ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();