import { useState } from 'react';
import { X, Link2, IndianRupee, Loader2 } from 'lucide-react';
import { addProduct } from '../api';
import toast from 'react-hot-toast';

export default function AddProductModal({ userEmail, onClose, onAdded }) {
  const [form, setForm] = useState({ url: '', targetPrice: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const detectPlatform = (url) => {
    if (url.includes('amazon')) return 'amazon';
    if (url.includes('flipkart')) return 'flipkart';
    return null;
  };

  const platform = detectPlatform(form.url);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.url.trim()) return setError('Product URL is required');
    if (!platform) return setError('Only Amazon (amazon.in) and Flipkart URLs are supported');
    if (!form.targetPrice || isNaN(form.targetPrice) || parseFloat(form.targetPrice) <= 0) {
      return setError('Enter a valid target price');
    }

    setLoading(true);
    try {
      const res = await addProduct({
        email: userEmail,
        url: form.url.trim(),
        targetPrice: parseFloat(form.targetPrice),
      });
      toast.success('Product added! Initial price is being fetched.');
      onAdded(res.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Track a New Product</h2>
            <p className="text-sm text-gray-500 mt-0.5">Supports Amazon India and Flipkart</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Product URL
            </label>
            <div className="relative">
              <Link2 size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="url"
                name="url"
                value={form.url}
                onChange={handleChange}
                placeholder="https://www.amazon.in/dp/... or flipkart.com/..."
                className="input pl-9"
                disabled={loading}
              />
            </div>
            {platform && (
              <p className="text-xs mt-1.5">
                <span className={platform === 'amazon' ? 'badge-amazon' : 'badge-flipkart'}>
                  {platform === 'amazon' ? '🟠 Amazon' : '🔵 Flipkart'} detected
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Alert me when price drops below
            </label>
            <div className="relative">
              <IndianRupee size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="number"
                name="targetPrice"
                value={form.targetPrice}
                onChange={handleChange}
                placeholder="e.g. 999"
                min="1"
                step="1"
                className="input pl-9"
                disabled={loading}
              />
            </div>
          </div>

          <div className="bg-brand-50 rounded-lg p-3 text-xs text-brand-700">
            <strong>Notification email:</strong> {userEmail}<br />
            Price is checked every hour automatically. You can also check manually.
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Fetching price...
                </span>
              ) : (
                'Start Tracking'
              )}
            </button>
          </div>
        </form>

        {/* Sample URLs */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 font-medium mb-2">Sample URLs to test:</p>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, url: 'https://www.amazon.in/dp/B0CHX3QBCH' }))}
              className="block w-full text-left text-xs text-gray-500 hover:text-brand-500 truncate py-0.5 transition-colors"
            >
              Amazon: https://www.amazon.in/dp/B0CHX3QBCH
            </button>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, url: 'https://www.flipkart.com/apple-iphone-15/p/itm6ac6485515ae4' }))}
              className="block w-full text-left text-xs text-gray-500 hover:text-brand-500 truncate py-0.5 transition-colors"
            >
              Flipkart: https://www.flipkart.com/apple-iphone-15/...
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
