import { adminDb } from '@/lib/firebaseAdmin';
import { getServerUser } from '@/lib/auth-server';
import { getSignedImageUrl } from './actions';
import { decryptData } from '@/lib/encryption';
import { KycReviewForm } from './KycReviewForm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface QueuedSubmission {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: string;
  idType: string;
  idCountry: string;
  idNumber: string;
  status: string;
  submittedAt: string;
  idFrontUrl: string | null;
  idBackUrl: string | null;
  selfieUrl: string | null;
}

async function loadSubmission(
  doc: FirebaseFirestore.QueryDocumentSnapshot
): Promise<QueuedSubmission> {
  const data = doc.data();
  const [idFrontUrl, idBackUrl, selfieUrl] = await Promise.all([
    getSignedImageUrl(data.idFrontUrl),
    data.idBackUrl ? getSignedImageUrl(data.idBackUrl) : Promise.resolve(null),
    getSignedImageUrl(data.selfieUrl),
  ]);

  return {
    id: doc.id,
    userId: data.userId,
    fullName: data.fullName,
    dateOfBirth: data.dateOfBirth,
    idType: data.idType,
    idCountry: data.idCountry,
    idNumber: decryptData(data.idNumber),
    status: data.status,
    submittedAt: data.submittedAt,
    idFrontUrl,
    idBackUrl,
    selfieUrl,
  };
}

export default async function KycModerationQueue() {
  // Server-side authorization — the client layout gate is not sufficient.
  const me = await getServerUser();
  if (!me?.admin) redirect('/login');

  const snapshot = await adminDb
    .collection('kyc_submissions')
    .where('status', 'in', ['PENDING', 'UNDER_REVIEW'])
    .orderBy('submittedAt', 'asc')
    .get();

  if (snapshot.empty) {
    return (
      <div className="p-8 text-center text-slate-400">
        <h2 className="text-xl font-medium mb-2">Moderation Queue is Empty</h2>
        <p>There are no pending KYC submissions to review at this time.</p>
      </div>
    );
  }

  const submissions = await Promise.all(snapshot.docs.map(loadSubmission));

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-100">KYC Moderation Queue</h1>
        <div className="px-3 py-1 bg-blue-900/50 text-blue-400 rounded-full text-sm font-medium">
          {snapshot.size} Pending Review
        </div>
      </div>

      <div className="space-y-8">
        {submissions.map((submission, index) => (
          <div key={submission.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Applicant Details */}
            <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-white">Applicant Details</h2>
                <span className="text-xs text-slate-500">#{index + 1}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-400">Full Name</p>
                  <p className="text-slate-100 font-medium">{submission.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Date of Birth</p>
                  <p className="text-slate-100 font-medium">{submission.dateOfBirth}</p>
                </div>
                <div className="h-px bg-slate-800 my-4" />
                <div>
                  <p className="text-sm text-slate-400">ID Type &amp; Country</p>
                  <p className="text-slate-100 font-medium">
                    {submission.idType} ({submission.idCountry})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">ID Number (Decrypted)</p>
                  <p className="text-slate-100 font-mono font-medium">{submission.idNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Submitted At</p>
                  <p className="text-slate-100 text-sm">
                    {new Date(submission.submittedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <KycReviewForm submissionId={submission.id} />
              </div>
            </div>

            {/* Documents */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-4">Identity Documents</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-2">ID Front</p>
                    {submission.idFrontUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={submission.idFrontUrl} alt="ID Front" className="w-full h-auto rounded border border-slate-700 object-cover aspect-video" />
                    ) : (
                      <div className="w-full aspect-video bg-slate-800 rounded flex items-center justify-center text-slate-500">Missing</div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-2">ID Back</p>
                    {submission.idBackUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={submission.idBackUrl} alt="ID Back" className="w-full h-auto rounded border border-slate-700 object-cover aspect-video" />
                    ) : (
                      <div className="w-full aspect-video bg-slate-800 rounded flex items-center justify-center text-slate-500">Not Provided</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-medium text-white mb-4">Live Selfie</h2>
                <div className="max-w-md mx-auto">
                  {submission.selfieUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={submission.selfieUrl} alt="Live Selfie" className="w-full h-auto rounded border border-slate-700 object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-slate-800 rounded flex items-center justify-center text-slate-500">Missing</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
