import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, ContactLine } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What personal data SpareKG collects, why, who sees it, and your choices.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro="SpareKG only works if people trust each other, and that starts with how we treat your information. This page explains what we collect, why we need it, who can see it and what you can ask us to do with it."
    >
      <h2>What we collect</h2>
      <h3>When you create an account</h3>
      <ul>
        <li>Your name, email address and, when you add them, your phone number, profile photo, home airport and preferred language.</li>
      </ul>
      <h3>When you verify your identity</h3>
      <ul>
        <li>Photos of your identity document, a live selfie taken in the app, the name and date of birth on the document, and the document number.</li>
      </ul>
      <h3>When you use the marketplace</h3>
      <ul>
        <li>Flights you list (route, dates, airline, flight number, space, price) and the ticket you upload to prove them.</li>
        <li>Bids, the items you describe and their declared value, handover and delivery confirmations, ratings, reports of problems, and your points history.</li>
      </ul>
      <h3>When you join the beta list</h3>
      <ul>
        <li>The name, email and, if you give them, phone number, route and travel date you enter on our home page.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run the marketplace: showing listings, handling bids and recording each step of a delivery.</li>
        <li>To verify that travelers and senders are who they say they are, and to check that listed flights are real.</li>
        <li>To keep people safe: preventing fraud and abuse, and investigating problems that are reported.</li>
        <li>To contact you about your account, your deliveries and — if you joined the beta list — early access.</li>
      </ul>
      <p>We do not sell your personal data, and we do not use advertising or analytics trackers.</p>

      <h2>Who can see what</h2>
      <ul>
        <li><strong>Everyone, including visitors:</strong> open listings show the traveler as a first name and initial, with their rating and trip count.</li>
        <li><strong>Signed-in users:</strong> listings show the traveler&apos;s display name, rating and verification badge. Other people&apos;s contact details are never shown in listings or bids.</li>
        <li><strong>The other person in an accepted deal:</strong> once a traveler accepts a bid, the two of you can see each other&apos;s name and phone number so you can arrange the handover.</li>
        <li><strong>SpareKG staff:</strong> reviewers see identity documents and tickets only to decide on them. Every staff decision is recorded in an audit log.</li>
        <li><strong>Service providers</strong> that run SpareKG for us: Google Cloud / Firebase (accounts, database and file storage), Vercel (website hosting) and a flight-schedule service that receives only a flight number and date when you use flight lookup.</li>
        <li><strong>Authorities,</strong> where the law requires it or where we must report a serious safety concern, such as prohibited goods.</li>
      </ul>

      <h2>How we protect it</h2>
      <ul>
        <li>Identity document numbers are encrypted before they are stored.</li>
        <li>Identity documents, selfies and tickets are never public. Staff open them through links that expire within minutes.</li>
        <li>Access to each kind of record is limited by security rules to the people who need it, and staff actions are logged.</li>
      </ul>

      <h2>Cookies and your browser</h2>
      <p>
        We use only what is needed to keep you signed in and remember simple preferences: a sign-in session cookie and
        a few values stored in your browser (such as whether you have seen the welcome message). There are no
        advertising cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your information while your account is open. If you close it, we remove or anonymise your personal
        details, except where we must keep records — for example of completed deliveries, points movements, disputes
        and staff decisions — to resolve problems, prevent fraud or meet legal obligations.
      </p>

      <h2>Your choices and rights</h2>
      <ul>
        <li>You can view and update most of your details in your <Link href="/profile">profile</Link>.</li>
        <li>You can ask us for a copy of your personal data, to correct it, or to close your account and delete it.</li>
        <li>We handle personal data in line with applicable data protection laws, including Malaysia&apos;s Personal Data Protection Act 2010.</li>
      </ul>

      <h2>Children</h2>
      <p>SpareKG is only for people aged 18 and over. We do not knowingly collect data from anyone younger.</p>

      <h2>Changes to this policy</h2>
      <p>If we change how we use your information, we will update this page and its date, and tell you in the app when the change matters.</p>

      <h2>Contact</h2>
      <p>
        For any privacy question or request, <ContactLine />. See also our <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
