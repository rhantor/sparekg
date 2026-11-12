import type { Metadata } from 'next';
import Link from 'next/link';
import { Ban, AlertTriangle } from 'lucide-react';
import { LegalPage, ContactLine } from '@/components/marketing/LegalPage';

export const metadata: Metadata = {
  title: 'Prohibited Items',
  description: 'What can never be sent through SpareKG, and what needs the traveler’s explicit agreement.',
};

// Blueprint §5.3. Revised as customs rules on the corridor change; the date on
// the page records which version applied to a given delivery.
const PROHIBITED = [
  'Cash or currency in any form, gold bars or unmounted gold, and jewellery above its declared value',
  'Firearms, ammunition, explosives and weapons of any kind, including replicas',
  'Drugs, narcotics and controlled substances, and prescription medicine for anyone other than the traveler',
  'Live animals, animal parts, and perishable biological material',
  'Lithium batteries over 100 Wh, loose lithium cells, and e-cigarette batteries sent without their device',
  'Liquids above the destination’s customs limits, and alcohol where the destination forbids it',
  'Counterfeit goods, replicas of branded products, and anything using a trademark without permission to sell it',
  'Legal documents belonging to someone else — passports, visas, birth certificates, court papers',
  'Anything flammable, toxic, corrosive or otherwise dangerous, and anything illegal in Malaysia or Bangladesh',
];

const RESTRICTED = [
  'Electronics with built-in batteries, such as phones and laptops, in their original packaging',
  'Cosmetics and personal-care products (volume limits apply)',
  'Powdered foods and spices, which are often checked by Bangladesh customs',
  'Books and printed materials (some titles are restricted on arrival)',
  'Religious or ceremonial items',
];

export default function ProhibitedItemsPage() {
  return (
    <LegalPage
      title="Prohibited Items"
      intro="Travelers carry parcels in their own luggage and answer for them at every airport. These rules protect them, and they are not negotiable. If you are unsure about an item, don't send it."
    >
      <h2>Never allowed</h2>
      <p>These items may not be listed, bid for or carried through SpareKG under any circumstances:</p>
      <ul className="list-none! pl-0! space-y-2.5">
        {PROHIBITED.map((item) => (
          <li key={item} className="flex gap-3">
            <Ban className="w-4 h-4 text-rose-600 shrink-0 mt-1" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <h2>Allowed only with the traveler&apos;s agreement</h2>
      <p>
        These can be sent, but only if the sender names them clearly in the bid and the traveler knowingly accepts
        them. A traveler may refuse any of them.
      </p>
      <ul className="list-none! pl-0! space-y-2.5">
        {RESTRICTED.map((item) => (
          <li key={item} className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-1" aria-hidden />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <h2>Every parcel, every time</h2>
      <ul>
        <li>Senders must describe the contents truthfully and let the traveler inspect them before handover.</li>
        <li>Travelers must inspect everything and must never carry a sealed package they have not seen inside.</li>
        <li>Both of you must follow your airline&apos;s baggage rules and the customs rules of both countries.</li>
      </ul>

      <h2>What happens if these rules are broken</h2>
      <p>
        Reports of prohibited goods go straight to our senior review. A confirmed violation leads to immediate
        suspension of the account and loss of its points, and depending on the item it may be reported to the
        authorities in Malaysia or Bangladesh.
      </p>

      <h2>Questions</h2>
      <p>
        Not sure whether something is allowed? <ContactLine /> before you send it. These rules form part of our{' '}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalPage>
  );
}
