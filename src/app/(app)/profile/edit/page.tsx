'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth, db, storage } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { Avatar } from '@/components/ui/Avatar';
import { PageHeader } from '@/components/app/PageHeader';
import { ArrowLeft, Camera, Check } from 'lucide-react';

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-line bg-white text-navy text-sm outline-none focus:border-teal placeholder:text-ash/60';
const labelCls = 'block text-sm font-medium text-navy mb-1.5';

export default function EditProfilePage() {
  const { user } = useAuth();
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [homeAirport, setHomeAirport] = useState('');
  const [languages, setLanguages] = useState('');
  const [payout, setPayout] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.exists() ? snap.data() : {};
        setDisplayName(data.displayName || user.displayName || '');
        setPhone(data.phone || '');
        setHomeAirport(data.homeAirportCode || '');
        setLanguages(data.spokenLanguages || '');
        setPayout(data.payoutDetails || '');
        setPhotoPreview(data.photoUrl || user.photoUrl || null);
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [user]);

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setPhotoFile(f);
      setPhotoPreview(URL.createObjectURL(f));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !user) return;
    if (!displayName.trim()) return setError('Please enter your display name.');
    setSaving(true);
    setError('');

    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const path = `avatars/${user.uid}/photo_${Date.now()}`;
        await uploadBytes(ref(storage, path), photoFile);
        photoUrl = await getDownloadURL(ref(storage, path));
      }

      await updateProfile(auth.currentUser, {
        displayName: displayName.trim(),
        ...(photoUrl ? { photoURL: photoUrl } : {}),
      });

      await setDoc(
        doc(db, 'users', user.uid),
        {
          uid: user.uid,
          email: user.email,
          displayName: displayName.trim(),
          phone: phone.trim() || null,
          homeAirportCode: homeAirport.trim().toUpperCase() || null,
          spokenLanguages: languages.trim() || null,
          payoutDetails: payout.trim() || null,
          ...(photoUrl ? { photoUrl } : {}),
        },
        { merge: true }
      );

      router.push('/profile');
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <div className="max-w-2xl mx-auto flex justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link href="/profile" className="inline-flex items-center gap-1.5 text-sm text-ash hover:text-navy mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to profile
      </Link>
      <PageHeader title="Edit profile" subtitle="Complete your profile to build trust with the community." />

      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-line shadow-soft p-6 space-y-5">
        {/* photo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview} alt="Profile" className="w-16 h-16 rounded-full object-cover border border-line" />
            ) : (
              <Avatar name={displayName || 'New User'} color="ocean" size={64} />
            )}
          </div>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-line text-sm font-medium text-navy cursor-pointer hover:bg-sand transition-colors">
            <Camera className="w-4 h-4 text-teal" /> Change photo
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
          </label>
        </div>

        <div>
          <label className={labelCls}>Display name</label>
          <input className={inputCls} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Phone number</label>
            <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+60 12 345 6789" />
            <p className="text-[0.7rem] text-ash mt-1">Required before you can bid.</p>
          </div>
          <div>
            <label className={labelCls}>Home airport</label>
            <input className={inputCls} value={homeAirport} onChange={(e) => setHomeAirport(e.target.value)} placeholder="e.g. KUL" maxLength={4} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Spoken languages (optional)</label>
          <input className={inputCls} value={languages} onChange={(e) => setLanguages(e.target.value)} placeholder="e.g. Bengali, English, Malay" />
        </div>

        <div>
          <label className={labelCls}>Payout details (optional)</label>
          <input className={inputCls} value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Bank name · account number" />
          <p className="text-[0.7rem] text-ash mt-1">Used to pay you out after completed trips.</p>
        </div>

        {error && <div className="text-sm text-rose-700 bg-rose-500/10 rounded-lg p-3">{error}</div>}

        <button type="submit" disabled={saving}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-navy text-white font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50">
          <Check className="w-4 h-4" /> {saving ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
