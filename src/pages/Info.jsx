import { useTitle } from '../hooks.js';

// Fill CONTACT_EMAIL before applying for AdSense.
const CONTACT_EMAIL = 'contact@watchora.example';

function InfoPage({ title, children }) {
  useTitle(title);
  return (
    <div className="page">
      <article className="prose">
        <h1>{title}</h1>
        {children}
      </article>
    </div>
  );
}

export function About() {
  return (
    <InfoPage title="About Watchora">
      <p>Watchora is a free place to watch movies, web series, anime, drama and TV serials. You don't need an account: open a title and press play.</p>
      <p>Your watch history and saved list stay in your own browser. We don't ask for your name, email or phone number.</p>
      <p>Watchora doesn't store video files. Videos play from third-party video hosts through their embedded players.</p>
    </InfoPage>
  );
}

export function Contact() {
  return (
    <InfoPage title="Contact">
      <p>For questions, feedback or content requests, email us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      <p>To report content that infringes your copyright, follow the steps in our <a href="/dmca">DMCA policy</a>.</p>
    </InfoPage>
  );
}

export function Privacy() {
  return (
    <InfoPage title="Privacy policy">
      <p>Last updated: November 2026</p>
      <h2>What we collect</h2>
      <p>Watchora has no accounts and doesn't collect your name, email or phone number. Your watch history, saved list and 18+ confirmation are stored only in your browser's local storage, on your device.</p>
      <h2>Cookies and ads</h2>
      <p>We may show ads from Google AdSense. Google and its partners use cookies to show ads based on your visits to this and other websites. You can turn off personalised ads in <a href="https://adssettings.google.com" target="_blank" rel="noreferrer">Google Ad Settings</a>.</p>
      <h2>Video players</h2>
      <p>Videos play inside players from third-party hosts. Those hosts may set their own cookies and have their own privacy policies.</p>
      <h2>Server logs</h2>
      <p>Our hosting provider (Cloudflare) may log basic technical data such as IP address and browser type for security and performance.</p>
      <h2>Children</h2>
      <p>The 18+ section is only for adults. We don't knowingly collect data from children.</p>
      <h2>Contact</h2>
      <p>Questions about privacy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
    </InfoPage>
  );
}

export function Dmca() {
  return (
    <InfoPage title="DMCA and copyright">
      <p>Watchora respects copyright. We don't host video files; videos are embedded from third-party hosts. If you own the rights to content shown on Watchora and didn't allow it, we'll remove it.</p>
      <h2>How to report</h2>
      <p>Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> with:</p>
      <ul>
        <li>The Watchora page link(s) for the content</li>
        <li>Proof that you own the rights, or are authorised to act for the owner</li>
        <li>Your name and contact details</li>
        <li>A statement that the information is accurate and that you believe the use isn't authorised</li>
      </ul>
      <p>We remove valid reports within 48 hours.</p>
    </InfoPage>
  );
}
