import { Link } from 'react-router-dom';
import { useState } from 'react';
import {
  Trash2, RefreshCw, ExternalLink, TrendingDown, TrendingUp, Minus, AlertCircle, Heart,
} from 'lucide-react';
import { deleteProduct, checkNow, toggleWishlist } from '../api';
import toast from 'react-hot-toast';

const CATEGORY_ICON = {
  phone: '📱', tablet: '📟', laptop: '💻', desktop: '🖥️', tv: '📺',
  audio: '🎧', camera: '📷', wearable: '⌚', gaming: '🎮', accessories: '🔌', other: '📦',
};

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    : '—';

const PriceTrend = ({ current, prev }) => {
  if (!current || !prev || current === prev) return <Minus size={14} className="text-gray-400" />;
  if (current < prev) return <TrendingDown size={14} className="text-green-500" />;
  return <TrendingUp size={14} className="text-red-500" />;
};

export default function ProductCard({ product, onRefresh }) {
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [wishlisting, setWishlisting] = useState(false);

  const isOutOfStock = product.inStock === false || product.currentPrice == null;
  const isBelow = product.currentPrice != null && product.currentPrice <= product.targetPrice;
  const pctDiff =
    product.currentPrice && product.targetPrice
      ? (((product.currentPrice - product.targetPrice) / product.targetPrice) * 100).toFixed(1)
      : null;

  const handleDelete = async (e) => {
    e.preventDefault();
    if (!confirm('Stop tracking this product?')) return;
    setDeleting(true);
    try {
      await deleteProduct(product._id);
      toast.success('Product removed');
      onRefresh();
    } catch (err) {
      toast.error(err.message);
      setDeleting(false);
    }
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlisting(true);
    try {
      const res = await toggleWishlist(product._id);
      toast.success(res.data?.isWishlisted ? 'Added to wishlist' : 'Removed from wishlist');
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setWishlisting(false);
    }
  };

  const handleCheckNow = async (e) => {
    e.preventDefault();
    setChecking(true);
    try {
      const res = await checkNow(product._id);
      toast.success(`Price updated: ${fmt(res.data?.currentPrice)}`);
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className={`card transition-all duration-200 hover:shadow-md ${isBelow ? 'ring-2 ring-green-400' : ''}`}>
      <Link to={`/products/${product._id}`} className="block">
        {/* Image + platform badge */}
        <div className="relative bg-gray-50 h-40 flex items-center justify-center overflow-hidden border-b border-gray-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.title}
              className={`h-full w-full object-contain p-3 ${isOutOfStock ? 'opacity-40 grayscale' : ''}`}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="text-gray-300 text-4xl">🛍️</div>
          )}
          <span className={`absolute top-2 left-2 ${product.platform === 'amazon' ? 'badge-amazon' : 'badge-flipkart'}`}>
            {product.platform === 'amazon' ? '🟠 Amazon' : '🔵 Flipkart'}
          </span>
          <button
            onClick={handleToggleWishlist}
            disabled={wishlisting}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors disabled:opacity-50 ${
              product.isWishlisted
                ? 'bg-pink-500 text-white'
                : 'bg-white/80 text-gray-400 hover:text-pink-500'
            }`}
            title={product.isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart size={14} fill={product.isWishlisted ? 'currentColor' : 'none'} />
          </button>
          {isBelow && (
            <span className="absolute top-10 right-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
              TARGET HIT!
            </span>
          )}
          {isOutOfStock && (
            <span className="absolute bottom-2 left-2 bg-gray-800/80 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Out of Stock
            </span>
          )}
          {product.scrapeError && (
            <span className="absolute bottom-2 right-2 text-amber-500" title={product.scrapeError}>
              <AlertCircle size={16} />
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-2">
            {product.title}
          </h3>
          {(product.category || product.brand) && (
            <div className="flex items-center gap-1.5 flex-wrap mb-2.5">
              {product.category && product.category !== 'other' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
                  {CATEGORY_ICON[product.category] ?? '📦'} {product.category}
                </span>
              )}
              {product.brand && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-brand-50 text-brand-600 text-xs font-medium">
                  {product.brand}
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Current</p>
              {product.currentPrice == null ? (
                <p className="text-xs font-semibold text-gray-400 italic">Not available</p>
              ) : (
                <p className={`text-base font-bold flex items-center justify-center gap-1 ${isBelow ? 'text-green-600' : 'text-gray-900'}`}>
                  {fmt(product.currentPrice)}
                  <PriceTrend current={product.currentPrice} prev={product.previousPrice} />
                </p>
              )}
            </div>
            <div className="bg-brand-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400 mb-0.5">Target</p>
              <p className="text-base font-bold text-brand-600">{fmt(product.targetPrice)}</p>
            </div>
          </div>

          {pctDiff !== null && (
            <div className={`text-xs text-center py-1 rounded-md font-medium ${
              isBelow
                ? 'bg-green-50 text-green-700'
                : 'bg-amber-50 text-amber-700'
            }`}>
              {isBelow ? `${Math.abs(pctDiff)}% below target` : `${pctDiff}% above target`}
            </div>
          )}

          {product.lastCheckedAt && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Checked {new Date(product.lastCheckedAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </Link>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={handleCheckNow}
          disabled={checking}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking...' : 'Check Now'}
        </button>
        <a
          href={product.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-50 rounded-lg transition-colors"
          title="Open product"
        >
          <ExternalLink size={15} />
        </a>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          title="Remove from tracking"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
