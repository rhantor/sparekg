import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPage, ContactLine } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules for using SpareKG as a traveler or a sender.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="These terms explain how SpareKG works and what each person agrees to when they use it. Please read them before you post a flight or place a bid. By creating an account you accept them."
    >
      <h2>1. What SpareKG is — and is not</h2>
      <p>
        SpareKG is a marketplace that introduces travelers who have unused checked-baggage allowance to people who
        want to send items on the same route. We verify identities, list flights, handle bids and record each step of
        a delivery.
      </p>
      <p>
        <strong>SpareKG does not carry, store, inspect or insure anything.</strong> We are not a courier, freight
        forwarder or shipping company, and we are not a party to the agreement between a traveler and a sender. That
        agreement is between the two of you.
      </p>
      <p>SpareKG is currently in beta. Features may change, and some may be unavailable while we improve them.</p>

      <h2>2. Your account</h2>
      <ul>
        <li>You must be at least 18 years old and able to enter a binding agreement.</li>
        <li>One person, one account. The details you give us, including your name and phone number, must be true and kept up to date.</li>
        <li>You must pass identity verification before you can post a flight or place a bid. We may refuse or withdraw verification.</li>
        <li>You are responsible for everything done through your account. Keep your sign-in details private.</li>
      </ul>

      <h2>3. How a deal works</h2>
      <ul>
        <li><strong>Listing.</strong> A traveler lists a real, booked flight with the space and price they offer, and uploads proof of the ticket. Our team checks the ticket before any bid can be accepted.</li>
        <li><strong>Bidding.</strong> A sender bids for part of that space, describing what they are sending. Bidding is free. To keep offers serious, you can have one open bid per flight and five open bids in total.</li>
        <li><strong>Agreement.</strong> When a traveler accepts a bid, both of you can see each other&apos;s name and phone number to arrange the handover.</li>
        <li><strong>Handover.</strong> The sender hands over the parcel and the traveler inspects it. Both confirm the handover in the app.</li>
        <li><strong>Delivery.</strong> The sender gives the recipient a 6-digit code. The traveler enters it when delivering, which records the delivery.</li>
        <li><strong>Completion.</strong> A delivery is complete 72 hours after it is recorded if no problem has been reported. Both of you can then rate each other.</li>
      </ul>

      <h2>4. Payment</h2>
      <p>
        During the beta, the price agreed in the app is paid <strong>directly by the sender to the traveler</strong>,
        normally at handover. SpareKG does not collect, hold or transfer that money, and currently charges no fee on
        it. If we introduce a fee, it will be shown before you agree to a deal.
      </p>

      <h2>5. If you are a traveler</h2>
      <ul>
        <li><strong>Inspect everything you carry.</strong> Never accept a sealed package or anything you have not seen. You may refuse any item, at any time, without penalty.</li>
        <li>Carry only what fits your airline allowance and the rules of both countries. You are the person responsible for your luggage at every airport.</li>
        <li>Deliver the parcel as agreed and record the delivery honestly.</li>
      </ul>

      <h2>6. If you are a sender</h2>
      <ul>
        <li>Send only lawful items that are not on our <Link href="/prohibited-items">prohibited items list</Link>.</li>
        <li>Describe the contents and declared value truthfully, pack them properly and let the traveler inspect them.</li>
        <li>Give the delivery code only to the person collecting the parcel — never to the traveler.</li>
      </ul>

      <h2>7. Customs and the law</h2>
      <p>
        Travelers and senders are each responsible for complying with the customs, import and export laws of Malaysia,
        Bangladesh and any other country involved, including declaring items and paying any duties. SpareKG does not
        give legal or customs advice.
      </p>

      <h2>8. Problems and disputes</h2>
      <p>
        If something goes wrong, use <strong>Report a problem</strong> on the delivery — from the time a bid is
        accepted until 72 hours after delivery. Completion is paused while our team looks into it. We will review what
        both of you tell us and record a decision with our reasons. Our decision settles the matter within SpareKG; it
        does not stop either of you from using any legal rights you have.
      </p>

      <h2>9. Our liability</h2>
      <p>
        Because we do not carry or handle items, we are not responsible for loss, damage, delay or confiscation of
        anything sent through an agreement made on SpareKG. The declared value of an item is recorded for
        transparency; it is not insurance. To the fullest extent the law allows, our total liability for any delivery
        is limited to the fees you paid SpareKG for that delivery. Nothing in these terms limits liability that cannot
        lawfully be limited.
      </p>

      <h2>10. Suspension and closing accounts</h2>
      <p>
        We may suspend or close an account that breaks these terms, puts other people at risk, tries to take deals
        outside SpareKG to avoid its safeguards, or is involved in fraud. Serious cases, such as carrying prohibited
        goods, may be reported to the authorities. You may stop using SpareKG at any time.
      </p>

      <h2>11. Changes</h2>
      <p>
        We may update these terms as SpareKG develops. We will change the date at the top and, for significant
        changes, tell you in the app. Continuing to use SpareKG after a change means you accept the updated terms.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms? <ContactLine />. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  );
}
