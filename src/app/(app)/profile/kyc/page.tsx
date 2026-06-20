'use client';

import { useState } from 'react';
import { CameraCapture } from '@/components/ui/CameraCapture';
import { submitKyc } from './actions';
import { auth, storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import type { IdType } from '@/lib/types';

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';
const labelCls = 'block text-sm font-medium text-navy mb-1.5';

export default function KycSubmissionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleNext = () => setStep((prev) => prev + 1);
  const handleBack = () => setStep((prev) => prev - 1);

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

    setLoading(true);
    setError(null);

    try {
      const uid = auth.currentUser.uid;
      const ts = Date.now();
      const idFrontPath = await uploadFile(files.idFront, `kyc/${uid}/idFront_${ts}`);
      let idBackPath = null;
      if (files.idBack) idBackPath = await uploadFile(files.idBack, `kyc/${uid}/idBack_${ts}`);
      const selfiePath = await uploadFile(files.selfie, `kyc/${uid}/selfie_${ts}`);

      const result = await submitKyc({
        userId: uid,
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

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-line shadow-soft p-6 sm:p-8">
      <h1 className="font-display text-2xl font-semibold text-navy mb-1">Verify your identity</h1>
      <p className="text-sm text-ash mb-6">Required before posting flights or bidding.</p>

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
                onChange={(e) => setFormData({ ...formData, idType: e.target.value as IdType })}>
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
            <label className="block text-sm font-medium text-navy mb-2">ID front (required)</label>
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'idFront')} className="text-sm text-ash" />
            {files.idFront && <p className="text-teal text-sm mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {files.idFront.name}</p>}
          </div>
          <div className="border border-line rounded-xl p-4 bg-sand">
            <label className="block text-sm font-medium text-navy mb-2">ID back (if applicable)</label>
            <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'idBack')} className="text-sm text-ash" />
            {files.idBack && <p className="text-teal text-sm mt-2 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {files.idBack.name}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={handleBack} className="flex-1 py-3 rounded-xl border border-line text-navy font-semibold hover:border-navy/25 transition-colors">Back</button>
            <button onClick={handleNext} disabled={!files.idFront}
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
          <CameraCapture label="Take a selfie" onCapture={(file) => setFiles((prev) => ({ ...prev, selfie: file }))} />
          {files.selfie && <p className="text-teal text-sm font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Selfie captured</p>}
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
