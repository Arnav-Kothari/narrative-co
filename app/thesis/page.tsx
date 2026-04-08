'use client';

import { useEffect } from 'react';
import '../narrative.css';

export default function ThesisPage() {
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

    document.querySelectorAll('a, button').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('expand'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('expand'));
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

    document.querySelectorAll('.reveal').forEach(el => io.observe(el));

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
        <a href="/" className="logo">The Narrative Company</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          <a href="mailto:arnav.kothari@thenarrative.company,aadit.sheth@thenarrative.company?subject=An%20upcoming%20moment&body=Hi%20Arnav%20and%20Aadit%2C%0A%0AWe%20have%20a%20moment%20coming%20up.%0A%0AWhat%20it%20is%20(launch%2C%20earnings%2C%20acquisition)%3A%0AWhen%3A%0AWhat%20we%20want%20it%20to%20do%3A%0A%0AThanks%2C%0A" className="nav-link">Get in touch</a>
          <a href="/dashboard" className="nav-login">Log in</a>
        </div>
      </nav>

      {/* ARTICLE */}
      <div className="article">
        <div className="article-inner">

          <blockquote className="reveal">
            <p>&ldquo;The best way to predict the future is to invent it.&rdquo;</p>
            <cite>Alan Kay</cite>
          </blockquote>

          <div className="reveal">
            <p>For most of modern corporate history, communication flowed through layers of media.</p>
            <p>Companies built. Media distributed. Audiences consumed.</p>
            <p>That structure made sense when distribution was scarce and attention was centralized.</p>
            <p>Today, social platforms, podcasts, newsletters, and developer communities have collapsed the distance between builders and their audience.</p>
            <p>Companies build. Employees distribute. Audiences consume.</p>
            <p>Here&apos;s what changed.</p>
          </div>

          <h2 className="reveal">The cost of translation has collapsed.</h2>

          <div className="reveal">
            <p>Companies have always created value in long-form.</p>
            <p>Products are complex. Releases are nuanced. Systems take time to explain.</p>
            <p>That has never changed, and it never will.</p>
            <p>What has changed is the cost of translation.</p>
            <p>Historically, long-form ideas were locked inside dense formats: PRDs, whitepapers, earnings decks, press releases. Turning that depth into something digestible required intermediaries. Journalists, editors, producers. Distribution was expensive, slow, and gated.</p>
            <p>Short-form was not something companies could easily build on.</p>
            <p>It required media to slice, frame, and package meaning for the public.</p>
            <p>That constraint is gone.</p>
            <p>Today, short-form is cheap, flexible, and programmable.</p>
            <p>A single product release can now be decomposed into dozens of surface areas: screenshots, diagrams, threads, demos, quotes, clips. Each one exposes a different &ldquo;endpoint&rdquo; for understanding, tuned to a specific audience and context.</p>
            <p>Short-form is not a downgrade of depth.</p>
            <p>It is a compression layer that lets depth travel.</p>
            <p>But that layer is unstable by design.</p>
            <p>Images outperform text on LinkedIn today. They didn&apos;t a year ago.</p>
            <p>Threads give way to screenshots. Screenshots to clips. Clips to diagrams.</p>
            <p>The dominant unit of meaning keeps shifting.</p>
            <p>Creators notice this first because they are forced to.</p>
            <p>They live inside the platforms.</p>
            <p>They adapt or disappear.</p>
            <p>Most companies are still producing excellent long-form work and hoping someone else will translate it into the formats that move.</p>
            <p>That &ldquo;someone else&rdquo; used to be journalists.</p>
            <p>Then it became corporate comms.</p>
            <p>Today, the leverage has moved closer to the source.</p>
            <p>The teams building the product now have the tools to expose it directly, continuously, and in public.</p>
            <p>The only missing piece is knowing how to do that translation well, in real time, on platforms that reward speed, specificity, and relevance.</p>
            <p>That is the shift.</p>
          </div>

          <h2 className="reveal">The middle-man has moved inside the company.</h2>

          <div className="reveal">
            <p>In the past, products moved slowly, and audiences discovered them even more slowly.</p>
            <p>A release could take months to matter.</p>
            <p>Feedback arrived through sales calls, keynote events, analysts, or quarterly reports.</p>
            <p>There was time for distance between building and explaining.</p>
            <p>That world is gone.</p>
            <p>Software now ships continuously.</p>
            <p>AI has collapsed development cycles.</p>
            <p>Competitors release similar capabilities weeks apart, sometimes days.</p>
            <p>In this environment, explanation cannot lag creation.</p>
            <p>Builders understand intent.</p>
            <p>They understand tradeoffs.</p>
            <p>They know what surprised them, what broke, and what didn&apos;t work.</p>
            <p>What they often lack is not insight, but a framework for sharing that insight in a way that travels.</p>
            <p>The companies with the most mindshare didn&apos;t respond by speaking louder.</p>
            <p>They responded by speaking closer.</p>
            <p>They didn&apos;t centralize their voice.</p>
            <p>They multiplied it.</p>
            <p>Engineers, researchers, designers, and product leads began explaining their work directly, in public, as it evolved.</p>
            <p>Not as marketing.</p>
            <p>As explanation.</p>
            <p>This shift matters because speed has changed the role of distribution.</p>
            <p>Distribution is no longer just about awareness.</p>
            <p>It is about coordination.</p>
            <p>When builders speak in public, they don&apos;t just describe products.</p>
            <p>They create micro-communities around them.</p>
            <p>Those communities test features immediately.</p>
            <p>They surface edge cases faster than any internal QA process.</p>
            <p>They generate feedback loops that keep pace with development speed.</p>
            <p>People who care deeply about a product want proximity to the people building it.</p>
            <p>That desire isn&apos;t new.</p>
            <p>What&apos;s new is how critical it has become.</p>
            <p>When alternatives are one click away and competitors are shipping just as fast, trust becomes the differentiator.</p>
            <p>That trust is built through interaction.</p>
            <p>When a builder replies to a comment, answers a question, or acknowledges a use case, the dynamic changes.</p>
            <p>The user stops being a passive consumer.</p>
            <p>They become involved.</p>
            <p>Involvement compounds into trust.</p>
            <p>Trust compounds into advocacy.</p>
            <p>This is how distribution becomes a competitive advantage in fast-moving markets.</p>
            <p>Not through reach alone.</p>
            <p>But through feedback loops, created in real-time.</p>
          </div>

          <h2 className="reveal">The opportunity.</h2>

          <div className="reveal">
            <p>Every great company already has its most powerful distribution engine inside it.</p>
            <p>When builders learn how to translate their work into platform-native narratives, companies gain durable brand awareness.</p>
            <p>Micro-communities form around real work.</p>
            <p>Feedback loops tighten.</p>
            <p>Retention improves.</p>
            <p>The brand becomes something people feel connected to, not marketed at.</p>
          </div>

          <h2 className="reveal">What we do.</h2>

          <div className="reveal">
            <p>We operate where narrative power has actually shifted.</p>
            <p>Not campaigns. Not press cycles.</p>
            <p>X and LinkedIn.</p>
            <p>These are no longer &ldquo;social channels.&rdquo;</p>
            <p>They are the primary interface between builders, buyers, media, and talent.</p>
            <p>This is where trust is earned in public.</p>
            <p>Where beliefs are formed before a sales call happens.</p>
            <p>Where brand awareness compounds quietly, over time, through repetition and relevance.</p>
            <p>Most leaders already post.</p>
            <p>But posting is treated like hygiene.</p>
            <p>A thing to do, not a system to win.</p>
            <p>So it becomes a cost center.</p>
            <p>Low conviction. Low signal. No feedback loop.</p>
            <p>The problem isn&apos;t effort.</p>
            <p>It&apos;s execution.</p>
            <p>Winning on X and LinkedIn requires an execution-level understanding of:</p>

            <ul>
              <li>What formats actually travel</li>
              <li>What language triggers response from the right people</li>
              <li>How conversations propagate across micro-communities</li>
              <li>When to speak, when to reply, and when to stay silent</li>
              <li>How platforms reward behavior week to week, not year to year</li>
            </ul>

            <p>We live inside those dynamics.</p>
            <p>We help founders and senior operators build personal brands that feel human, precise, and native to the platforms they&apos;re on.</p>
            <p>Not polished. Not over-managed.</p>
          </div>

        </div>
      </div>

      {/* CTA */}
      <section className="cta">
        <div className="cta-inner reveal">
          <div className="cta-eyebrow">Limited engagements</div>
          <h2 className="cta-headline">Let&apos;s see if it&apos;s a fit.</h2>
          <p className="cta-sub">We work with a small number of executives at a time. One conversation. No pitch deck. We&apos;ll tell you what we see.</p>
          <a href="mailto:arnav.kothari@thenarrative.company,aadit.sheth@thenarrative.company?subject=An%20upcoming%20moment&body=Hi%20Arnav%20and%20Aadit%2C%0A%0AWe%20have%20a%20moment%20coming%20up.%0A%0AWhat%20it%20is%20(launch%2C%20earnings%2C%20acquisition)%3A%0AWhen%3A%0AWhat%20we%20want%20it%20to%20do%3A%0A%0AThanks%2C%0A" className="cta-btn">
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
