import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, RefreshCw, Edit2, Check, X as XIcon, Trash2,
  TrendingDown, Clock, Bell, AlertCircle,
} from 'lucide-react';
import PriceHistoryChart from '../components/PriceHistoryChart';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProductById, getPriceHistory, updateTargetPrice, deleteProduct, checkNow } from '../api';
import toast from 'react-hot-toast';

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    : '—';

export default function ProductDetail({ userEmail }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [editTarget, setEditTarget] = useState(false);
  const [targetVal, setTargetVal] = useState('');

  const load = async () => {
    try {
      const [prodRes, histRes] = await Promise.all([
        getProductById(id),
        getPriceHistory(id, 100),
      ]);
      setProduct(prodRes.data);
      setHistory(histRes.data || []);
      setTargetVal(prodRes.data.targetPrice?.toString() || '');
    } catch (err) {
      toast.error(err.message);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkNow(id);
      toast.success('Price refreshed!');
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  const handleSaveTarget = async () => {
    const val = parseFloat(targetVal);
    if (!val || val <= 0) return toast.error('Enter a valid price');
    try {
      await updateTargetPrice(id, val);
      toast.success('Target price updated');
      setEditTarget(false);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Stop tracking this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Removed from tracking');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <LoadingSpinner text="Loading product..." />;
  if (!product) return null;

  const isOutOfStock = product.inStock === false || product.currentPrice == null;
  const isBelow = product.currentPrice != null && product.currentPrice <= product.targetPrice;
  const historyMin = history.length ? Math.min(...history.map((h) => h.price)) : null;
  const historyMax = history.length ? Math.max(...history.map((h) => h.price)) : null;
  const historyAvg = history.length
    ? Math.round(history.reduce((s, h) => s + h.price, 0) / history.length)
    : null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-5 transition-colors">
        <ArrowLeft size={15} /> Back to Dashboard
      </Link>

      {/* Product header */}
      <div className="card mb-5">
        <div className="flex flex-col sm:flex-row gap-5 p-6">
          {product.imageUrl && (
            <div className="w-full sm:w-36 h-36 flex-shrink-0 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center">
              <img src={product.imageUrl} alt={product.title} className="w-full h-full object-contain p-2" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={product.platform === 'amazon' ? 'badge-amazon' : 'badge-flipkart'}>
                {product.platform === 'amazon' ? '🟠 Amazon' : '🔵 Flipkart'}
              </span>
              {isBelow && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  TARGET HIT!
                </span>
              )}
              {isOutOfStock && (
                <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
                  Out of Stock
                </span>
              )}
            </div>
            <h1 className="text-lg font-bold text-gray-900 mb-4 leading-snug">{product.title}</h1>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCheckNow}
                disabled={checking}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Checking...' : 'Check Now'}
              </button>
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <ExternalLink size={14} />
                View Product
              </a>
              <button onClick={handleDelete} className="btn-danger flex items-center gap-2 text-sm">
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </div>
        </div>

        {/* Price info bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-t border-gray-100">
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Current Price</p>
            {product.currentPrice == null ? (
              <p className="text-sm font-semibold text-gray-400 italic">Not available</p>
            ) : (
              <p className={`text-xl font-bold ${isBelow ? 'text-green-600' : 'text-gray-900'}`}>
                {fmt(product.currentPrice)}
              </p>
            )}
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">Your Target</p>
            {editTarget ? (
              <div className="flex items-center justify-center gap-1">
                <input
                  type="number"
                  value={targetVal}
                  onChange={(e) => setTargetVal(e.target.value)}
                  className="w-24 text-sm px-2 py-1 border border-brand-500 rounded-lg text-center font-bold focus:outline-none"
                  autoFocus
                />
                <button onClick={handleSaveTarget} className="text-green-500 hover:text-green-700">
                  <Check size={15} />
                </button>
                <button onClick={() => { setEditTarget(false); setTargetVal(product.targetPrice?.toString()); }} className="text-gray-400 hover:text-gray-600">
                  <XIcon size={15} />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-1.5">
                <p className="text-xl font-bold text-brand-600">{fmt(product.targetPrice)}</p>
                <button onClick={() => setEditTarget(true)} className="text-gray-300 hover:text-brand-500 transition-colors">
                  <Edit2 size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">All-time Low</p>
            <p className="text-xl font-bold text-gray-900">{fmt(historyMin)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-xs text-gray-400 mb-1">All-time High</p>
            <p className="text-xl font-bold text-gray-900">{fmt(historyMax)}</p>
          </div>
        </div>
      </div>

      {/* Price History Chart */}
      <div className="card p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Price History</h2>
          <span className="text-xs text-gray-400">{history.length} data points</span>
        </div>
        <PriceHistoryChart history={history} targetPrice={product.targetPrice} />
      </div>

      {/* Stats + Status */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <TrendingDown size={15} className="text-brand-500" /> Price Stats
          </h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Average Price', value: fmt(historyAvg) },
              { label: 'All-time Low', value: fmt(historyMin) },
              { label: 'All-time High', value: fmt(historyMax) },
              { label: 'Last Notified At', value: product.lastNotifiedPrice ? fmt(product.lastNotifiedPrice) : 'Never notified' },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-400">{row.label}</span>
                <span className="font-medium text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Bell size={15} className="text-brand-500" /> Tracking Status
          </h3>
          <div className="space-y-2 text-sm">
            {[
              { label: 'Platform', value: product.platform === 'amazon' ? '🟠 Amazon' : '🔵 Flipkart' },
              { label: 'Status', value: product.isActive ? '✅ Active' : '⏸ Paused' },
              { label: 'Last Checked', value: product.lastCheckedAt ? new Date(product.lastCheckedAt).toLocaleString('en-IN') : 'Not yet' },
              { label: 'Added On', value: new Date(product.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between">
                <span className="text-gray-400">{row.label}</span>
                <span className="font-medium text-gray-800">{row.value}</span>
              </div>
            ))}
          </div>
          {product.scrapeError && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">{product.scrapeError}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
