import { redirect } from 'next/navigation';
import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/auth-server';
import { signStoragePath } from '@/lib/storage-admin';
import { cityFor, formatAirportTime } from '@/lib/airports';
import { TicketReviewForm } from './TicketReviewForm';

export const dynamic = 'force-dynamic';

/** Listing states still worth a decision — anything else has already closed. */
const OPEN_STATUSES = ['DRAFT', 'LIVE', 'LOCKED'];

interface QueuedTicket {
  flightId: string;
  travelerName: string;
  /** Legal name from the traveler's approved KYC, to compare against the ticket. */
  kycName: string | null;
  originAirport: string;
  destinationAirport: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  kgTotal: number;
  ticketUrl: string | null;
  /** Whether a file is on record, independent of whether a URL could be signed. */
  ticketStored: boolean;
  contentType: string;
  scheduleCheck: 'MATCH' | 'MISMATCH' | 'UNCHECKED';
}

const SCHEDULE_CHECK_TEXT: Record<QueuedTicket['scheduleCheck'], { text: string; cls: string }> = {
  MATCH: { text: 'Matches the published schedule', cls: 'text-emerald-400' },
  MISMATCH: { text: 'Does NOT match the published schedule — check the ticket closely', cls: 'text-amber-400' },
  UNCHECKED: { text: 'Not checked — the traveler did not use flight lookup', cls: 'text-slate-400' },
};

function toIso(value: unknown): string | null {
  const ts = value as { toDate?: () => Date } | null;
  return ts?.toDate ? ts.toDate().toISOString() : null;
}

async function loadTicket(doc: FirebaseFirestore.QueryDocumentSnapshot): Promise<QueuedTicket> {
  const flight = doc.data();
  const [ticketSnap, kycSnap] = await Promise.all([
    adminDb.collection('flight_tickets').doc(doc.id).get(),
    adminDb
      .collection('kyc_submissions')
      .where('userId', '==', flight.travelerId)
      .where('status', '==', 'APPROVED')
      .limit(1)
      .get(),
  ]);
  const ticket = ticketSnap.data();

  return {
    flightId: doc.id,
    travelerName: flight.traveler?.displayName ?? 'Traveler',
    kycName: kycSnap.empty ? null : (kycSnap.docs[0].data().fullName ?? null),
    originAirport: flight.originAirport,
    destinationAirport: flight.destinationAirport,
    airline: flight.airline,
    flightNumber: flight.flightNumber,
    departure: formatAirportTime(toIso(flight.departureAt), flight.originAirport),
    arrival: formatAirportTime(toIso(flight.arrivalAt), flight.destinationAirport),
    kgTotal: flight.totalKgAvailable,
    // Short-lived: the page is re-rendered on every visit, so nothing needs to outlive a review.
    ticketUrl: ticket?.storagePath ? await signStoragePath(ticket.storagePath, 15 * 60 * 1000) : null,
    ticketStored: Boolean(ticket?.storagePath),
    contentType: ticket?.contentType ?? '',
    scheduleCheck: ticket?.scheduleCheck === 'MATCH' || ticket?.scheduleCheck === 'MISMATCH'
      ? ticket.scheduleCheck
      : 'UNCHECKED',
  };
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`text-slate-100 font-medium ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function TicketImage({ item }: { item: QueuedTicket }) {
  if (item.ticketUrl && item.contentType === 'application/pdf') {
    return (
      <div className="space-y-2">
        <iframe
          src={item.ticketUrl}
          title="Ticket PDF"
          className="w-full h-[70vh] rounded border border-slate-700 bg-white"
        />
        <a href={item.ticketUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-400 underline">
          Open the PDF in a new tab
        </a>
      </div>
    );
  }
  if (item.ticketUrl) {
    return (
      <a href={item.ticketUrl} target="_blank" rel="noreferrer" title="Open full size">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.ticketUrl} alt="Ticket" className="w-full h-auto rounded border border-slate-700" />
      </a>
    );
  }
  return (
    <div className="w-full aspect-video bg-slate-800 rounded flex flex-col items-center justify-center gap-1 text-center px-3 border border-red-500/40">
      <p className="text-sm text-red-400 font-medium">
        {item.ticketStored ? 'Ticket failed to load' : 'No ticket on record'}
      </p>
      <p className="text-xs text-slate-400">
        {item.ticketStored
          ? 'The file exists but could not be fetched. Check server logs — do not reject on this basis.'
          : 'This listing has no ticket file. Reject it as "Not a ticket".'}
      </p>
    </div>
  );
}

export default async function FlightTicketQueue() {
  // Server-side authorization — the client layout gate is not sufficient.
  const me = await getServerUser();
  if (!me?.admin) redirect('/login');

  // Soonest departure first: those are the listings whose senders are waiting.
  const snapshot = await adminDb
    .collection('flights')
    .where('ticketStatus', '==', 'PENDING')
    .where('departureAt', '>=', new Date())
    .orderBy('departureAt', 'asc')
    .limit(50)
    .get();

  const open = snapshot.docs.filter((d) => OPEN_STATUSES.includes(d.data().status));

  if (open.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400">
        <h2 className="text-xl font-medium mb-2">No tickets waiting</h2>
        <p>Every upcoming listing&apos;s ticket has been reviewed.</p>
      </div>
    );
  }

  const tickets = await Promise.all(open.map(loadTicket));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-2">
        <h1 className="text-2xl font-bold text-slate-100">Flight Ticket Queue</h1>
        <div className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-medium">
          {tickets.length} pending
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-6">
        Check the name, flight number, date and route on the ticket against the listing. Travelers cannot accept bids until you verify.
      </p>

      <div className="space-y-8">
        {tickets.map((item) => (
          <div key={item.flightId} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">Listing</h2>
              <div className="space-y-4">
                <Field label="Name on verified ID" value={item.kycName ?? 'No approved KYC found'} />
                <Field label="Display name" value={item.travelerName} />
                <div className="h-px bg-slate-800" />
                <Field
                  label="Route"
                  value={`${item.originAirport} ${cityFor(item.originAirport)} → ${item.destinationAirport} ${cityFor(item.destinationAirport)}`}
                />
                <Field label="Flight" value={`${item.airline} · ${item.flightNumber}`} mono />
                <Field label="Departs" value={item.departure} />
                <Field label="Arrives" value={item.arrival} />
                <Field label="Capacity" value={`${item.kgTotal} KG`} />
                <div>
                  <p className="text-sm text-slate-400">Schedule check</p>
                  <p className={`font-medium ${SCHEDULE_CHECK_TEXT[item.scheduleCheck].cls}`}>
                    {SCHEDULE_CHECK_TEXT[item.scheduleCheck].text}
                  </p>
                </div>
              </div>
              <div className="mt-8">
                <TicketReviewForm flightId={item.flightId} />
              </div>
            </div>

            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4">Ticket</h2>
              <TicketImage item={item} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
