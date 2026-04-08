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
            We engineer the narrative and the amplification behind your biggest company moments - launches, earnings calls, acquisitions - on X and LinkedIn.
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
            <h2 className="reveal">Most executive social is run by comms.</h2>
          </div>
          <div className="shift-right reveal" style={{ transitionDelay: '0.15s' }}>
            <p className="shift-body">Your comms team is excellent at what they do - managing risk, protecting reputation, keeping messaging tight. But X and LinkedIn aren&apos;t press channels. They&apos;re distribution channels.</p>
            <p className="shift-body">The opportunity isn&apos;t to replace comms. It&apos;s to add a layer that treats every executive post as a marketing moment - turning social from something you maintain into something that compounds.</p>
            <p className="shift-body shift-accent">We sit between comms and marketing, so your executives can play offense without losing control.</p>
          </div>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="how">
        <div className="how-header reveal">
          <div className="section-label">What we do</div>
          <h2>We engineer your biggest moments to break through.</h2>
        </div>
        <div className="steps stagger">
          <div className="step">
            <div className="step-circle">01</div>
            <div className="step-title">Diagnose</div>
            <p className="step-body">Data analytics on every post, every competitor handle, and every conversation in your category. We figure out where attention lives and what your moment has to do to break through.</p>
          </div>
          <div className="step">
            <div className="step-circle">02</div>
            <div className="step-title">Engineer</div>
            <p className="step-body">The narrative, the post, the supporting content, the cascade plan. We build the entire moment so it&apos;s ready to ship the day it goes live.</p>
          </div>
          <div className="step">
            <div className="step-circle">03</div>
            <div className="step-title">Amplify</div>
            <p className="step-body">Internal coordination across your executives, your company handles, and your company-wide announcements - so we can maximize reach organically.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner">
          <div className="cta-eyebrow reveal">Working together</div>
          <h2 className="cta-headline reveal">Let&apos;s talk about what&apos;s coming up.</h2>
          <p className="cta-sub reveal">Got an earnings call, product launch, or acquisition coming up? Let&apos;s make sure it lands. We work with a small group of leaders at a time.</p>
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
