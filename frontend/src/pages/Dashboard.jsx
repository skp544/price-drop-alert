import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, TrendingDown, Bell, AlertCircle, RefreshCw, X, Heart } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import AddProductModal from '../components/AddProductModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProducts, checkNow } from '../api';
import toast from 'react-hot-toast';

const CATEGORY_META = {
  phone:       { label: 'Phone',       icon: '📱' },
  tablet:      { label: 'Tablet',      icon: '📟' },
  laptop:      { label: 'Laptop',      icon: '💻' },
  desktop:     { label: 'Desktop',     icon: '🖥️' },
  tv:          { label: 'TV',          icon: '📺' },
  audio:       { label: 'Audio',       icon: '🎧' },
  camera:      { label: 'Camera',      icon: '📷' },
  wearable:    { label: 'Wearable',    icon: '⌚' },
  gaming:      { label: 'Gaming',      icon: '🎮' },
  accessories: { label: 'Accessories', icon: '🔌' },
  other:       { label: 'Other',       icon: '📦' },
};

export default function Dashboard({ userEmail }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkingAll, setCheckingAll] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ platform: 'all', category: '', brand: '' });

  const fetchProducts = useCallback(async () => {
    try {
      const res = await getProducts(userEmail);
      setProducts(res.data || []);
    } catch (err) {
      toast.error(`Failed to load products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleFilter = (key, val) =>
    setFilters((f) => ({ ...f, [key]: f[key] === val ? (key === 'platform' ? 'all' : '') : val }));
  const clearFilters = () => setFilters({ platform: 'all', category: '', brand: '' });
  const hasActiveFilters = filters.platform !== 'all' || filters.category || filters.brand;

  const filtered = products.filter((p) => {
    if (filters.platform === 'below' && !(p.currentPrice != null && p.currentPrice <= p.targetPrice)) return false;
    if (filters.platform === 'amazon' && p.platform !== 'amazon') return false;
    if (filters.platform === 'flipkart' && p.platform !== 'flipkart') return false;
    if (filters.platform === 'wishlist' && !p.isWishlisted) return false;
    if (filters.category && p.category !== filters.category) return false;
    if (filters.brand && p.brand?.toLowerCase() !== filters.brand.toLowerCase()) return false;
    return true;
  });

  const stats = {
    total: products.length,
    below: products.filter((p) => p.currentPrice != null && p.currentPrice <= p.targetPrice).length,
    amazon: products.filter((p) => p.platform === 'amazon').length,
    flipkart: products.filter((p) => p.platform === 'flipkart').length,
    wishlist: products.filter((p) => p.isWishlisted).length,
  };

  const availableCategories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const availableBrands = [...new Set(products.map((p) => p.brand).filter(Boolean))].sort();

  const handleCheckAll = async () => {
    if (checkingAll || products.length === 0) return;
    setCheckingAll(true);
    const results = await Promise.allSettled(products.map((p) => checkNow(p._id)));
    const failed = results.filter((r) => r.status === 'rejected').length;
    const succeeded = results.length - failed;
    if (failed === 0) toast.success(`All ${succeeded} products updated`);
    else toast.error(`${succeeded} updated, ${failed} failed`);
    await fetchProducts();
    setCheckingAll(false);
  };

  const pageTitle = filters.brand
    ? `${filters.brand} Products`
    : filters.category
    ? `${CATEGORY_META[filters.category]?.label ?? filters.category}s`
    : filters.platform === 'below' ? 'Target Price Hit'
    : filters.platform === 'amazon' ? 'Amazon Products'
    : filters.platform === 'flipkart' ? 'Flipkart Products'
    : filters.platform === 'wishlist' ? 'Wishlist'
    : 'Tracked Products';

  if (loading) return <LoadingSpinner text="Loading your products..." />;

  return (
    <div>
      {/* Stats / platform filter row */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Tracking', value: stats.total,    icon: <Package size={16} />,            color: 'text-gray-600 bg-gray-100',   key: 'all' },
            { label: 'Target Hit', value: stats.below,  icon: <TrendingDown size={16} />,       color: 'text-green-600 bg-green-100', key: 'below' },
            { label: 'Wishlist', value: stats.wishlist, icon: <Heart size={16} />,              color: 'text-pink-600 bg-pink-100',   key: 'wishlist' },
            { label: 'Amazon',   value: stats.amazon,   icon: <span className="text-xs">🟠</span>, color: 'text-orange-600 bg-orange-100', key: 'amazon' },
            { label: 'Flipkart', value: stats.flipkart, icon: <span className="text-xs">🔵</span>, color: 'text-blue-600 bg-blue-100',    key: 'flipkart' },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => toggleFilter('platform', s.key)}
              className={`card p-4 flex items-center gap-3 text-left transition-all hover:shadow-md ${
                filters.platform === s.key ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.color}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900 leading-none">{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Category + brand filter bar */}
      {products.length > 0 && (availableCategories.length > 0 || availableBrands.length > 0) && (
        <div className="bg-white border border-gray-100 rounded-xl p-3.5 mb-4 space-y-3">
          {availableCategories.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 font-medium pt-1 w-16 flex-shrink-0">Category</span>
              <div className="flex gap-1.5 flex-wrap">
                {availableCategories.map((cat) => {
                  const meta = CATEGORY_META[cat] ?? { label: cat, icon: '📦' };
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleFilter('category', cat)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        filters.category === cat
                          ? 'bg-brand-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {meta.icon} {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {availableBrands.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-gray-400 font-medium pt-1 w-16 flex-shrink-0">Brand</span>
              <div className="flex gap-1.5 flex-wrap">
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleFilter('brand', brand)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      filters.brand === brand
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{pageTitle}</h1>
          {products.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              Alerts → <span className="font-medium text-gray-600">{userEmail}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {products.length > 0 && (
            <button
              onClick={handleCheckAll}
              disabled={checkingAll}
              className="btn-secondary flex items-center gap-2 disabled:opacity-60"
            >
              <RefreshCw size={15} className={checkingAll ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{checkingAll ? 'Checking...' : 'Check All'}</span>
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Target hit banner */}
      {stats.below > 0 && filters.platform !== 'below' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 mb-5 flex items-center gap-3">
          <Bell size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">
            <strong>{stats.below} product{stats.below > 1 ? 's have' : ' has'} hit your target price!</strong>
            {' '}
            <button
              onClick={() => setFilters((f) => ({ ...f, platform: 'below' }))}
              className="underline font-medium"
            >
              View them →
            </button>
          </p>
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <EmptyState hasFilters={hasActiveFilters} onClear={clearFilters} onAdd={() => setShowModal(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p._id} product={p} onRefresh={fetchProducts} />
          ))}
        </div>
      )}

      {showModal && (
        <AddProductModal
          userEmail={userEmail}
          onClose={() => setShowModal(false)}
          onAdded={() => { fetchProducts(); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function EmptyState({ hasFilters, onClear, onAdd }) {
  if (hasFilters) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 mb-3">No products match these filters</p>
        <button onClick={onClear} className="btn-secondary text-sm">Clear filters</button>
      </div>
    );
  }
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Package size={28} className="text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-1">No products yet</h3>
      <p className="text-gray-400 text-sm mb-5 max-w-xs mx-auto">
        Add an Amazon or Flipkart product URL and set your target price to start tracking.
      </p>
      <button onClick={onAdd} className="btn-primary inline-flex items-center gap-2">
        <Plus size={16} /> Add Your First Product
      </button>
    </div>
  );
}
