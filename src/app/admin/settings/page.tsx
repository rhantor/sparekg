'use client';
import { useEffect, useState } from 'react';
import { mockAppConfig } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useAppConfigQuery, useUpdateAppConfigMutation } from '@/lib/store/api';
import { DEFAULT_POINTS_ECONOMY, DEFAULT_FEATURE_FLAGS } from '@/lib/economy';
import {
  Settings, Shield, Coins, DollarSign, Save, ToggleLeft, ToggleRight,
  Loader2, AlertCircle, Info,
} from 'lucide-react';

/** Fields the server actually reads. Anything else on this page is not wired yet. */
type Economy = Record<string, number>;
type Flags = Record<string, boolean>;

export default function SettingsPage() {
  const { isSuperAdmin } = useAuth();

  // `app_config/main` is optional: a project that has never saved settings has no
  // document, and the query fails with `not-found`. That is the normal starting
  // state, not an error — fall back to the same defaults the server would use.
  const { data: stored, isLoading, error } = useAppConfigQuery();
  const [save, { isLoading: saving }] = useUpdateAppConfigMutation();

  const [economy, setEconomy] = useState<Economy>(DEFAULT_POINTS_ECONOMY);
  const [flags, setFlags] = useState<Flags>(DEFAULT_FEATURE_FLAGS);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Seeded from the server once it answers, then owned by the form. Keyed on the
  // fetched object so a refetch after saving does not clobber a fresh edit.
  useEffect(() => {
    if (isLoading) return;
    setEconomy({ ...DEFAULT_POINTS_ECONOMY, ...((stored?.pointsEconomy as Economy) ?? {}) });
    setFlags({ ...DEFAULT_FEATURE_FLAGS, ...((stored?.featureFlags as Flags) ?? {}) });
  }, [stored, isLoading]);

  const notFound = (error as { code?: string })?.code === 'not-found';
  const loadFailed = error && !notFound;

  async function handleSave() {
    setSaveError(null);
    try {
      await save({ pointsEconomy: economy, featureFlags: flags }).unwrap();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setSaveError((err as { message?: string })?.message ?? 'Could not save settings.');
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="text-center py-20">
        <Shield className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <p className="text-gray-400 text-lg font-medium">Super Admin Only</p>
        <p className="text-sm text-gray-500 mt-1">You need super-admin privileges to access this page.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-brand-400" /> App Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">Super-admin only. Changes are logged to audit trail.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || isLoading}
          className={`btn ${saved ? 'btn-success' : 'btn-primary'} disabled:opacity-60`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {saveError && (
        <div className="glass-card p-4 mb-6 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" /> {saveError}
        </div>
      )}

      {loadFailed && (
        <div className="glass-card p-4 mb-6 flex items-center gap-2 text-sm text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Couldn&apos;t read the stored config. The values below are the built-in defaults —
          saving will overwrite whatever is stored.
        </div>
      )}

      {notFound && (
        <div className="glass-card p-4 mb-6 flex items-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4 shrink-0" />
          No config saved yet, so the platform is running on these built-in defaults.
          Saving creates the document.
        </div>
      )}

      {/* Points Economy — live */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <Coins className="w-4 h-4 text-brand-400" /> Points Economy
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Read by the server on every sign-up, monthly grant, bid and boost. Whole numbers only.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.keys(DEFAULT_POINTS_ECONOMY).map((key) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={economy[key] ?? 0}
                onChange={(e) =>
                  setEconomy((prev) => ({ ...prev, [key]: Math.max(0, Math.round(+e.target.value || 0)) }))
                }
                className="input"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Feature Flags — live */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-1">Feature Flags</h3>
        <p className="text-xs text-gray-500 mb-4">
          Kill switches for the paid boosts. Turning one off stops new purchases; runs already
          bought keep their remaining time.
        </p>
        <div className="space-y-3">
          {Object.keys(DEFAULT_FEATURE_FLAGS).map((key) => (
            <div key={key} className="flex items-center justify-between bg-surface-100 rounded-lg p-3">
              <span className="text-sm text-gray-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button
                onClick={() => setFlags((prev) => ({ ...prev, [key]: !prev[key] }))}
                className="flex items-center gap-2"
              >
                {flags[key] ? (
                  <><ToggleRight className="w-6 h-6 text-emerald-400" /><span className="text-xs text-emerald-400 font-medium">ON</span></>
                ) : (
                  <><ToggleLeft className="w-6 h-6 text-gray-600" /><span className="text-xs text-gray-500 font-medium">OFF</span></>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/*
        Everything below is still mock. The server has no fee schedule and no
        purchase packages yet — those land with the payment gateway — so these are
        shown read-only rather than as inputs that quietly discard what is typed.
      */}
      <div className="glass-card p-5 mb-6 opacity-60">
        <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-400" /> Fee Schedule
          <span className="badge badge-neutral ml-1">Not wired yet</span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">Arrives with the payments phase. Display only.</p>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <span className="text-xs text-gray-500 block">Platform Fee (%)</span>
            {mockAppConfig.feeSchedule.platformFeePercent}
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Cancellation Refund Window (hours)</span>
            {mockAppConfig.feeSchedule.cancellationRefundWindowHours}
          </div>
        </div>
      </div>

      <div className="glass-card p-5 opacity-60">
        <h3 className="text-sm font-semibold text-white mb-1">
          Points Purchase Packages
          <span className="badge badge-neutral ml-2">Not wired yet</span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">Arrives with SSLCommerz / iPay88. Display only.</p>
        <table className="data-table">
          <thead><tr><th>Package</th><th>Points</th><th>Price (MYR)</th><th>Rate</th></tr></thead>
          <tbody>
            {mockAppConfig.pointsPricing.packages.map((pkg) => (
              <tr key={pkg.name}>
                <td className="text-white font-medium">{pkg.name}</td>
                <td>{pkg.points}</td>
                <td>MYR {pkg.priceMyr}</td>
                <td className="text-brand-400">{(pkg.points / pkg.priceMyr).toFixed(1)} pts/MYR</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
