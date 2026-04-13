import { headers } from 'next/headers';
import '../narrative.css';
import './dashboard.css';

function getEmailFromJwt(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    const data = JSON.parse(json);
    return data.email || null;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const hdrs = await headers();
  const jwt = hdrs.get('cf-access-jwt-assertion');
  const email = jwt ? getEmailFromJwt(jwt) : null;

  const clients = [
    {
      name: 'Marc Benioff',
      label: 'Executive',
      deliverables: [
        { title: 'Competitive Analysis', href: '/clients/marc/analysis.html' },
        { title: '45-Day Pilot Recap', href: '/clients/marc/one-pager.html' },
        { title: 'Post-Pilot Proposal', href: '/clients/marc/post-pilot-proposal.html' },
        { title: 'LinkedIn Performance Analysis', href: '/clients/marc/linkedin-analysis.html' },
      ],
    },
    {
      name: 'Salesforce',
      label: 'Corporate',
      deliverables: [
        { title: 'Competitive Analysis', href: '/clients/salesforce/analysis.html' },
      ],
    },
  ];

  return (
    <div className="narrative-page">
      {/* NAV */}
      <nav>
        <a href="/" className="logo">The Narrative Company</a>
        <div className="dash-nav-right">
          {email && <span className="dash-nav-email">{email}</span>}
          <a href="/cdn-cgi/access/logout" className="nav-login">Log out</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="dash-hero">
        <div className="dash-hero-content">
          <div className="section-label">Client Portal</div>
          <h1 className="dash-headline">Your deliverables</h1>
          <p className="dash-sub">
            Access analysis, proposals, and data dashboards for your engagement.
          </p>
        </div>
      </section>

      {/* CLIENT CARDS */}
      <section className="dash-cards">
        {clients.map((client) => (
          <div key={client.name} className="dash-card">
            <div className="dash-card-label">{client.label}</div>
            <h2 className="dash-card-name">{client.name}</h2>
            <div className="dash-deliverables">
              {client.deliverables.map((d) => (
                <a key={d.href} href={d.href} className="dash-deliverable">
                  <span>{d.title}</span>
                  <span className="dash-arrow">&rarr;</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer>
        <span className="footer-logo">The Narrative Company</span>
        <span className="footer-note">&copy; 2026 The Narrative Company. All rights reserved.</span>
      </footer>
    </div>
  );
}
