'use client';

import { useEffect } from 'react';
import './narrative.css';

export default function Home() {
  useEffect(() => {
    /* ─── CURSOR ─────────────────────────────── */
    const cursor = document.getElementById('cursor');
    if (!cursor) return;

    let mx = 0, my = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
    };

    document.addEventListener('mousemove', handleMouseMove);

    let animId: number;
    const tick = () => {
      cursor.style.left = mx + 'px';
      cursor.style.top = my + 'px';
      animId = requestAnimationFrame(tick);
    };
    tick();

    document.querySelectorAll('a, button, [data-tilt]').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expand'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expand'));
    });

    /* ─── TEXT SCRAMBLE ──────────────────────── */
    function scramble(el: HTMLElement) {
      const target = el.dataset.text || '';
      const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      const total = Math.ceil(target.length * 1.2);

      el.textContent = '';
      const spans: HTMLSpanElement[] = [];
      const words = target.split(' ');

      words.forEach((word, wi) => {
        const wordWrap = document.createElement('span');
        wordWrap.style.whiteSpace = 'nowrap';
        wordWrap.style.display = 'inline';

        for (let i = 0; i < word.length; i++) {
          const s = document.createElement('span');
          s.textContent = pool[Math.floor(Math.random() * pool.length)];
          s.style.display = 'inline-block';
          s.style.textAlign = 'center';

          const measure = document.createElement('span');
          measure.style.visibility = 'hidden';
          measure.style.position = 'absolute';
          measure.style.font = getComputedStyle(el).font;
          measure.textContent = word[i];
          document.body.appendChild(measure);
          s.style.width = measure.offsetWidth + 'px';
          document.body.removeChild(measure);

          spans.push(s);
          wordWrap.appendChild(s);
        }

        el.appendChild(wordWrap);

        if (wi < words.length - 1) {
          const spacer = document.createElement('span');
          spacer.innerHTML = ' ';
          spacer.style.display = 'inline';
          spans.push(spacer);
          el.appendChild(spacer);
        }
      });

      const chars = target.split('').filter(c => c !== ' ');
      let frame = 0;
      const letterSpans = spans.filter(s => s.innerHTML !== ' ');

      const run = setInterval(() => {
        for (let i = 0; i < letterSpans.length; i++) {
          if (i < frame / 1.2) {
            letterSpans[i].textContent = chars[i];
          } else {
            letterSpans[i].textContent = pool[Math.floor(Math.random() * pool.length)];
          }
        }
        frame++;
        if (frame > total) clearInterval(run);
      }, 28);
    }

    const scEl = document.querySelector('.sc') as HTMLElement;
    if (scEl) {
      scEl.style.visibility = 'hidden';
      setTimeout(() => {
        scEl.style.visibility = 'visible';
        scramble(scEl);
      }, 1100);
    }

    /* ─── CARD TILT ──────────────────────────── */
    document.querySelectorAll('[data-tilt]').forEach(card => {
      const el = card as HTMLElement;
      el.addEventListener('mousemove', (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) scale(1.025)`;
        el.style.transition = 'transform 0.08s ease';
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'perspective(900px) rotateY(0) rotateX(0) scale(1)';
        el.style.transition = 'transform 0.55s ease';
      });
    });

    /* ─── SCROLL REVEAL ──────────────────────── */
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .stagger, .stagger4').forEach(el => io.observe(el));

    /* ─── MARQUEE PAUSE ON HOVER ─────────────── */
    document.querySelectorAll('.marquee-belt, .exec-belt').forEach(belt => {
      const el = belt as HTMLElement;
      el.addEventListener('mouseenter', () => { el.style.animationPlayState = 'paused'; });
      el.addEventListener('mouseleave', () => { el.style.animationPlayState = 'running'; });
    });

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animId);
      io.disconnect();
    };
  }, []);

  return (
    <div className="narrative-page">
      <div id="cursor" />

      {/* NAV */}
      <nav>
        <a href="#" className="logo">The Narrative Company</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="/thesis" className="nav-link">Our Thesis</a>
          <a href="mailto:arnav.kothari@thenarrative.company" className="nav-link">Get in touch</a>
          <a href="/dashboard" className="nav-login">Log in</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-ghost">{'narrative'}</div>
        <div className="hero-content">
          <div className="hero-tag">Executive narrative</div>
          <h1 className="hero-headline">
            <span className="sc" data-text="Your company ships fast. Your story should travel faster.">
              Your company ships fast. Your story should travel faster.
            </span>
          </h1>
          <p className="hero-sub">
            We build and run the social presence for CEOs and senior leaders - turning X and LinkedIn into your most valuable distribution channels.
          </p>
          <div className="hero-ctas">
            <a href="mailto:arnav.kothari@thenarrative.company" className="btn-fill" id="hero-btn">
              Start a conversation&nbsp;&rarr;
            </a>
            <a href="#gap" className="btn-text">
              See how it works
              <span className="arrow">&darr;</span>
            </a>
          </div>
        </div>

        {/* ticker at bottom of hero */}
        <div className="hero-ticker">
          <div className="marquee-wrap">
            <div className="marquee-belt">
              <span>CEO X Threads</span><span className="sep">&middot;</span>
              <span>C-Suite LinkedIn</span><span className="sep">&middot;</span>
              <span>Earnings Narratives</span><span className="sep">&middot;</span>
              <span>Product Launch Orchestration</span><span className="sep">&middot;</span>
              <span>Influencer Cascade Engineering</span><span className="sep">&middot;</span>
              <span>Corporate Handle Voice</span><span className="sep">&middot;</span>
              <span>Employee Amplification</span><span className="sep">&middot;</span>
              <span>Algorithm Intelligence</span><span className="sep">&middot;</span>
              {/* duplicate for seamless loop */}
              <span>CEO X Threads</span><span className="sep">&middot;</span>
              <span>C-Suite LinkedIn</span><span className="sep">&middot;</span>
              <span>Earnings Narratives</span><span className="sep">&middot;</span>
              <span>Product Launch Orchestration</span><span className="sep">&middot;</span>
              <span>Influencer Cascade Engineering</span><span className="sep">&middot;</span>
              <span>Corporate Handle Voice</span><span className="sep">&middot;</span>
              <span>Employee Amplification</span><span className="sep">&middot;</span>
              <span>Algorithm Intelligence</span><span className="sep">&middot;</span>
            </div>
          </div>
        </div>
      </section>

      {/* THE GAP */}
      <section className="shift" id="gap">
        <div className="container">
          <div className="shift-left">
            <div className="shift-label reveal">The gap</div>
            <h2 className="reveal">Most executive social is run by comms. Comms is built to protect, not distribute.</h2>
          </div>
          <div className="shift-right reveal" style={{ transitionDelay: '0.15s' }}>
            <p className="shift-body">Your comms team is excellent at what they do - managing risk, protecting reputation, keeping messaging tight. But X and LinkedIn aren&apos;t press channels. They&apos;re distribution channels.</p>
            <p className="shift-body">The opportunity isn&apos;t to replace comms. It&apos;s to add a layer that treats every executive post as a marketing moment - turning social from something you maintain into something that compounds.</p>
            <p className="shift-body shift-accent">We sit between comms and marketing, so your executives can play offense without losing control.</p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="pillars">
        <div className="pillars-top reveal">
          <h2>A narrative system, not a content calendar.</h2>
          <p>Every company moment becomes a coordinated multi-surface event. Zero paid spend - every impression earned.</p>
        </div>
        <div className="pillars-grid stagger" id="cards">
          <div className="card" data-tilt="">
            <div className="card-num">01</div>
            <div className="card-title">Moment Design</div>
            <p className="card-body">We architect your highest-leverage events into multi-surface narratives designed to cascade, not just broadcast.</p>
          </div>
          <div className="card" data-tilt="">
            <div className="card-num">02</div>
            <div className="card-title">Orchestrated Amplification</div>
            <p className="card-body">We engineer quote cascades and timed reshares so one post becomes a coordinated signal across your entire ecosystem.</p>
          </div>
          <div className="card" data-tilt="">
            <div className="card-num">03</div>
            <div className="card-title">Platform-Native Execution</div>
            <p className="card-body">Algorithms change weekly. We operate inside X and LinkedIn every day, adapting before the platform rewards shift.</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <div className="how-header reveal">
          <div className="section-label">How it works</div>
          <h2>Built to compound, not expire.</h2>
        </div>
        <div className="steps stagger4">
          <div className="step">
            <div className="step-circle">01</div>
            <div className="step-title">Audit</div>
            <p className="step-body">We map your executive presence, your competitors, and where trust is being earned by someone else.</p>
          </div>
          <div className="step">
            <div className="step-circle">02</div>
            <div className="step-title">Architect</div>
            <p className="step-body">Voice calibration, moment calendar, and a coordination playbook across every surface - built around what your company actually does.</p>
          </div>
          <div className="step">
            <div className="step-circle">03</div>
            <div className="step-title">Execute</div>
            <p className="step-body">Live content, real-time engagement, and quote cascade engineering - every moment orchestrated across surfaces.</p>
          </div>
          <div className="step">
            <div className="step-circle">04</div>
            <div className="step-title">Compound</div>
            <p className="step-body">We measure reshare depth, conversation quality, and influencer activation rate. Adjusted weekly so every moment builds on the last.</p>
          </div>
        </div>
      </section>

      {/* EXECUTION STRIP */}
      <div className="exec-strip">
        <div className="marquee-wrap">
          <div className="exec-belt">
            <span>Earnings narratives</span><span className="dot">&middot;</span>
            <span>Product launch orchestration</span><span className="dot">&middot;</span>
            <span>C-suite LinkedIn</span><span className="dot">&middot;</span>
            <span>CEO X threads</span><span className="dot">&middot;</span>
            <span>Influencer cascade engineering</span><span className="dot">&middot;</span>
            <span>Corporate handle voice</span><span className="dot">&middot;</span>
            <span>Quote reshare systems</span><span className="dot">&middot;</span>
            <span>Algorithm-native formats</span><span className="dot">&middot;</span>
            {/* duplicate */}
            <span>Earnings narratives</span><span className="dot">&middot;</span>
            <span>Product launch orchestration</span><span className="dot">&middot;</span>
            <span>C-suite LinkedIn</span><span className="dot">&middot;</span>
            <span>CEO X threads</span><span className="dot">&middot;</span>
            <span>Influencer cascade engineering</span><span className="dot">&middot;</span>
            <span>Corporate handle voice</span><span className="dot">&middot;</span>
            <span>Quote reshare systems</span><span className="dot">&middot;</span>
            <span>Algorithm-native formats</span><span className="dot">&middot;</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <div className="cta-eyebrow reveal">Limited engagements</div>
          <h2 className="cta-headline reveal">Let&apos;s see if it&apos;s a fit.</h2>
          <p className="cta-sub reveal">We work with a small number of Fortune 500 technology leaders at a time.</p>
          <a href="mailto:arnav.kothari@thenarrative.company" className="cta-btn reveal" id="cta-btn">
            Start the conversation&nbsp;&rarr;
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <span className="footer-logo">The Narrative Company</span>
        <span className="footer-note">&copy; 2026 The Narrative Company. All rights reserved.</span>
      </footer>
    </div>
  );
}
