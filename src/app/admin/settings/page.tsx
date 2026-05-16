'use client';
import { useState } from 'react';
import { mockAppConfig } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { Settings, Shield, Coins, DollarSign, Save, ToggleLeft, ToggleRight } from 'lucide-react';

export default function SettingsPage() {
  const { isSuperAdmin } = useAuth();
  const [config, setConfig] = useState(mockAppConfig);
  const [saved, setSaved] = useState(false);

  const toggleFlag = (key: string) => {
    setConfig(prev => ({
      ...prev,
      featureFlags: { ...prev.featureFlags, [key]: !prev.featureFlags[key] },
    }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <button onClick={handleSave} className={`btn ${saved ? 'btn-success' : 'btn-primary'}`}>
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Fee Schedule */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-400" /> Fee Schedule</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Platform Fee (%)</label>
            <input type="number" value={config.feeSchedule.platformFeePercent} onChange={e => setConfig(prev => ({ ...prev, feeSchedule: { ...prev.feeSchedule, platformFeePercent: +e.target.value } }))} className="input" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Cancellation Refund Window (hours)</label>
            <input type="number" value={config.feeSchedule.cancellationRefundWindowHours} onChange={e => setConfig(prev => ({ ...prev, feeSchedule: { ...prev.feeSchedule, cancellationRefundWindowHours: +e.target.value } }))} className="input" />
          </div>
        </div>
      </div>

      {/* Points Economy */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Coins className="w-4 h-4 text-brand-400" /> Points Economy</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Object.entries(config.pointsEconomy).map(([key, val]) => (
            <div key={key}>
              <label className="text-xs text-gray-400 mb-1 block">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
              <input type="number" value={val} onChange={e => setConfig(prev => ({ ...prev, pointsEconomy: { ...prev.pointsEconomy, [key]: +e.target.value } }))} className="input" />
            </div>
          ))}
        </div>
      </div>

      {/* Bulk Packages */}
      <div className="glass-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-white mb-4">Points Purchase Packages</h3>
        <table className="data-table">
          <thead><tr><th>Package</th><th>Points</th><th>Price (MYR)</th><th>Rate</th></tr></thead>
          <tbody>
            {config.pointsPricing.packages.map(pkg => (
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

      {/* Feature Flags */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Feature Flags</h3>
        <div className="space-y-3">
          {Object.entries(config.featureFlags).map(([key, enabled]) => (
            <div key={key} className="flex items-center justify-between bg-surface-100 rounded-lg p-3">
              <span className="text-sm text-gray-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
              <button onClick={() => toggleFlag(key)} className="flex items-center gap-2">
                {enabled ? (
                  <><ToggleRight className="w-6 h-6 text-emerald-400" /><span className="text-xs text-emerald-400 font-medium">ON</span></>
                ) : (
                  <><ToggleLeft className="w-6 h-6 text-gray-600" /><span className="text-xs text-gray-500 font-medium">OFF</span></>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
