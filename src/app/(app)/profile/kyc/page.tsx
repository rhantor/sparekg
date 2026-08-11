'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CameraCapture } from '@/components/ui/CameraCapture';
import { submitKyc, getMyKycStatus, type MyKycStatus } from './actions';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { Check, ShieldCheck, Clock, XCircle } from 'lucide-react';
import type { IdType } from '@/lib/types';
import { ID_DOC_SPEC } from '@/lib/id-documents';
import { presentKycStatus, REJECTION_REASON_TEXT } from '@/lib/kyc-status';

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';
const labelCls = 'block text-sm font-medium text-navy mb-1.5';


/**
 * Mirrors the resolved layout — heading, status meta, document tiles — so the
 * page does not reflow when the real content lands.
 */
function KycSkeleton() {
  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-line shadow-soft p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="h-7 w-56 rounded-lg bg-line/70 animate-pulse" />
        <div className="h-6 w-24 rounded-full bg-line/70 animate-pulse" />
      </div>
      <div className="h-4 w-3/4 rounded bg-line/50 animate-pulse mb-6" />

      <div className="grid grid-cols-2 gap-4 p-4 rounded-xl border border-line bg-sand mb-6">
        {[0, 1].map((i) => (
          <div key={i}>
            <div className="h-3 w-16 rounded bg-line/60 animate-pulse mb-2" />
            <div className="h-4 w-28 rounded bg-line/70 animate-pulse" />
          </div>
        ))}
      </div>

      <div className="h-4 w-40 rounded bg-line/60 animate-pulse mb-3" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="w-full aspect-video rounded-lg border border-line bg-white/60 animate-pulse" />
        ))}
      </div>
      <span className="sr-only">Loading your verification status</span>
    </div>
  );
}

function formatWhen(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString();
}

/**
 * Read-only view of a submission already on file. Shows the uploaded documents
 * back to the applicant so they can confirm what was received.
 */
function KycStatusPanel({ kyc }: { kyc: MyKycStatus }) {
  const p = presentKycStatus(kyc.status);
  const approved = kyc.status === 'APPROVED';
  const submitted = formatWhen(kyc.submittedAt);
  const reviewed = formatWhen(kyc.reviewedAt);

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-line shadow-soft p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h1 className="font-display text-2xl font-semibold text-navy">Identity verification</h1>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${p.badgeCls}`}>
          {approved ? <ShieldCheck className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          {p.label}
        </span>
      </div>
      <p className="text-sm text-ash mb-6">{p.detail}</p>

      <dl className="grid grid-cols-2 gap-4 p-4 bg-sand rounded-xl border border-line mb-6 text-sm">
        {kyc.idTypeName && (
          <div>
            <dt className="text-ash text-xs">Document</dt>
            <dd className="text-navy font-medium">{kyc.idTypeName}</dd>
          </div>
        )}
        {submitted && (
          <div>
            <dt className="text-ash text-xs">Submitted</dt>
            <dd className="text-navy font-medium">{submitted}</dd>
          </div>
        )}
        {reviewed && (
          <div>
            <dt className="text-ash text-xs">Reviewed</dt>
            <dd className="text-navy font-medium">{reviewed}</dd>
          </div>
        )}
      </dl>

      {kyc.documents.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-navy mb-3">Documents received</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {kyc.documents.map((doc) => (
              <div key={doc.label}>
                <p className="text-xs text-ash mb-1.5">{doc.label}</p>
                {doc.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doc.url}
                    alt={doc.label}
                    className="w-full aspect-video object-cover rounded-lg border border-line"
                  />
                ) : (
                  <div className="w-full aspect-video rounded-lg border border-line bg-sand flex items-center justify-center text-xs text-ash text-center px-3">
                    Preview unavailable — your file is stored safely.
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-ash mb-6">
            Only you and our verification team can view these images.
          </p>
        </>
      )}

      <Link
        href="/profile"
        className="inline-block px-5 py-2.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors"
      >
        Back to profile
      </Link>
    </div>
  );
}

export default function KycSubmissionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kyc, setKyc] = useState<MyKycStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  // State is only set from the async callback: a synchronous setState in an
  // effect body triggers cascading renders and is rejected by the lint rule.
  useEffect(() => {
    let active = true;
    getMyKycStatus().then((res) => {
      if (!active) return;
      setKyc(res);
      setStatusLoading(false);
    });
    return () => { active = false; };
  }, []);

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    idCountry: 'MY',
    idType: 'PASSPORT' as IdType,
    idNumber: '',
  });

  const [files, setFiles] = useState<{
    idFront: File | null;
    idBack: File | null;
    selfie: File | null;
  }>({ idFront: null, idBack: null, selfie: null });

  const docSpec = ID_DOC_SPEC[formData.idType];

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

  const handleIdTypeChange = (idType: IdType) => {
    setFormData((prev) => ({ ...prev, idType }));
    // Switching to a single-sided document drops any back image already picked,
    // so we never upload an image the new document type has no slot for.
    if (!ID_DOC_SPEC[idType].backLabel) setFiles((prev) => ({ ...prev, idBack: null }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof typeof files) => {
    if (e.target.files && e.target.files[0]) {
      setFiles((prev) => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const uploadFile = async (file: File, path: string) => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    return path;
  };

  const handleSubmit = async () => {
    if (!auth.currentUser) return setError('You must be logged in.');
    if (!files.idFront || !files.selfie) return setError('Missing required files.');
    if (docSpec.backLabel && !files.idBack) return setError(`${docSpec.backLabel} is required.`);

    setLoading(true);
    setError(null);

    try {
      const uid = auth.currentUser.uid;
      const ts = Date.now();
      const idFrontPath = await uploadFile(files.idFront, `kyc/${uid}/idFront_${ts}`);
      let idBackPath = null;
      if (files.idBack) idBackPath = await uploadFile(files.idBack, `kyc/${uid}/idBack_${ts}`);
      const selfiePath = await uploadFile(files.selfie, `kyc/${uid}/selfie_${ts}`);

      // No uid in the payload — the server derives it from the session cookie.
      const result = await submitKyc({
        ...formData,
        idFrontUrl: idFrontPath,
        idBackUrl: idBackPath,
        selfieUrl: selfiePath,
      });

      if (result.success) {
        router.push('/profile/kyc/success');
      } else {
        setError(result.error || 'Submission failed.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (statusLoading) return <KycSkeleton />;

  const presentation = presentKycStatus(kyc?.status ?? null);

  // A submission already exists and cannot be replaced — show its state and the
  // documents on file rather than an empty form that would be rejected.
  if (kyc && !presentation.canSubmit) {
    return <KycStatusPanel kyc={kyc} />;
  }

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-line shadow-soft p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-navy mb-1">Verify your identity</h1>
      <p className="text-sm text-ash mb-6">Required before posting flights or bidding.</p>

      {kyc?.status === 'REJECTED' && (
        <div className="p-4 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <p className="text-rose-700 text-sm font-semibold flex items-center gap-1.5">
            <XCircle className="w-4 h-4" /> Your previous submission was rejected
          </p>
          <p className="text-rose-700/90 text-sm mt-1">
            {kyc.userRejectionMessage ||
              REJECTION_REASON_TEXT[kyc.rejectionReason ?? 'OTHER'] ||
              REJECTION_REASON_TEXT.OTHER}
          </p>
          <p className="text-ash text-xs mt-2">Please correct the issue and submit again below.</p>
        </div>
      )}

      {/* Progress steps */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${step >= i ? 'bg-teal' : 'bg-line'}`} />
        ))}
      </div>

      {error && (
        <div className="p-3.5 mb-6 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-700 text-sm">{error}</div>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-navy">Personal details</h2>
          <div>
            <label className={labelCls}>Full name (as on ID)</label>
            <input type="text" className={inputCls} value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
          </div>
          <div>
            <label className={labelCls}>Date of birth</label>
            <input type="date" className={inputCls} value={formData.dateOfBirth}
              onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>ID type</label>
              <select className={inputCls} value={formData.idType}
                onChange={(e) => handleIdTypeChange(e.target.value as IdType)}>
                <option value="PASSPORT">Passport</option>
                <option value="NATIONAL_ID">National ID</option>
                <option value="DRIVERS_LICENSE">Driver&apos;s License</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Country of issue</label>
              <input type="text" placeholder="e.g. MY, BD" className={inputCls} value={formData.idCountry}
                onChange={(e) => setFormData({ ...formData, idCountry: e.target.value })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>ID number</label>
            <input type="text" className={inputCls} value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })} />
          </div>

          <button onClick={handleNext}
            disabled={!formData.fullName || !formData.dateOfBirth || !formData.idNumber}
            className="w-full py-3 mt-4 rounded-xl bg-navy text-white font-semibold disabled:opacity-50 hover:bg-navy-700 transition-colors">
            Next: Upload document
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-navy">Upload ID</h2>
          <div className="border border-line rounded-xl p-4 bg-sand">
            <label className="block text-sm font-medium text-navy mb-1">{docSpec.frontLabel} <span className="text-ash font-normal">(required)</span></label>
            <p className="text-xs text-ash mb-2">{docSpec.frontHint}</p>
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'idFront')} className="text-sm text-ash" />
            {files.idFront && <p className="text-teal text-sm mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {files.idFront.name}</p>}
          </div>
          {docSpec.backLabel ? (
            <div className="border border-line rounded-xl p-4 bg-sand">
              <label className="block text-sm font-medium text-navy mb-1">{docSpec.backLabel} <span className="text-ash font-normal">(required)</span></label>
              <p className="text-xs text-ash mb-2">{docSpec.backHint}</p>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'idBack')} className="text-sm text-ash" />
              {files.idBack && <p className="text-teal text-sm mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {files.idBack.name}</p>}
            </div>
          ) : (
            <p className="text-sm text-ash">A passport only needs the photo page — no second image required.</p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={handleBack} className="flex-1 py-3 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Back</button>
            <button onClick={handleNext} disabled={!files.idFront || (!!docSpec.backLabel && !files.idBack)}
              className="flex-1 py-3 rounded-xl bg-navy text-white font-semibold disabled:opacity-50 hover:bg-navy-700 transition-colors">
              Next: Live selfie
            </button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-semibold text-navy">Live liveness check</h2>
          <p className="text-sm text-ash">We need a live selfie to match against your ID. Please ensure you are in a well-lit area.</p>
          <CameraCapture
            label="Take a selfie"
            onCapture={(file) => setFiles((prev) => ({ ...prev, selfie: file }))}
            onReset={() => setFiles((prev) => ({ ...prev, selfie: null }))}
          />
          {files.selfie
            ? <p className="text-teal text-sm font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Selfie ready — you can submit now.</p>
            : <p className="text-ash text-sm">Take a photo, then press <span className="font-medium text-navy">Use this photo</span> to attach it.</p>}
          <div className="flex gap-3 pt-2">
            <button onClick={handleBack} disabled={loading} className="flex-1 py-3 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Back</button>
            <button onClick={handleSubmit} disabled={!files.selfie || loading}
              className="flex-1 py-3 rounded-xl bg-teal text-white font-semibold disabled:opacity-50 hover:bg-teal-700 transition-colors">
              {loading ? 'Uploading…' : 'Submit KYC'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
