import { useState } from 'react';
import { TrendingDown, Mail, ArrowRight, Bell, Shield, Zap } from 'lucide-react';
import { upsertUser } from '../api';
import toast from 'react-hot-toast';

export default function EmailSetup({ onSetEmail }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.match(/^\S+@\S+\.\S+$/)) return setError('Enter a valid email address');

    setLoading(true);
    try {
      await upsertUser({ email, name });
      toast.success(`Welcome! Alerts will be sent to ${email}`);
      onSetEmail(email);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-5">
          <TrendingDown size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Never Overpay Again
        </h1>
        <p className="text-gray-500 text-lg max-w-md mx-auto leading-relaxed">
          Track Amazon and Flipkart prices. Get an email the moment your target price is hit.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-4 mb-10 w-full max-w-md">
        {[
          { icon: <Bell size={18} />, label: 'Instant alerts', color: 'text-brand-500 bg-brand-50' },
          { icon: <Zap size={18} />, label: 'Hourly checks', color: 'text-amber-500 bg-amber-50' },
          { icon: <Shield size={18} />, label: 'No spam', color: 'text-green-500 bg-green-50' },
        ].map((f) => (
          <div key={f.label} className="card p-3 text-center">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5 ${f.color}`}>
              {f.icon}
            </div>
            <p className="text-xs font-medium text-gray-700">{f.label}</p>
          </div>
        ))}
      </div>

      {/* Email form */}
      <div className="card w-full max-w-md p-6 shadow-md">
        <h2 className="text-base font-semibold text-gray-800 mb-1">Get started — it's free</h2>
        <p className="text-sm text-gray-400 mb-5">Your email is only used for price drop notifications.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="input"
              disabled={loading}
            />
          </div>
          <div className="relative">
            <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="your@email.com"
              className="input pl-9"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
            {loading ? 'Setting up...' : 'Start Tracking Prices'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>
      </div>
    </div>
  );
}
