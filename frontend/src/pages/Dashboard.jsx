import { useState, useEffect, useCallback } from 'react';
import { Plus, Package, TrendingDown, Bell, AlertCircle } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import AddProductModal from '../components/AddProductModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { getProducts } from '../api';
import toast from 'react-hot-toast';

export default function Dashboard({ userEmail }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');

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

  const filtered = products.filter((p) => {
    if (filter === 'below') return p.currentPrice != null && p.currentPrice <= p.targetPrice;
    if (filter === 'amazon') return p.platform === 'amazon';
    if (filter === 'flipkart') return p.platform === 'flipkart';
    return true;
  });

  const stats = {
    total: products.length,
    below: products.filter((p) => p.currentPrice != null && p.currentPrice <= p.targetPrice).length,
    amazon: products.filter((p) => p.platform === 'amazon').length,
    flipkart: products.filter((p) => p.platform === 'flipkart').length,
  };

  if (loading) return <LoadingSpinner text="Loading your products..." />;

  return (
    <div>
      {/* Stats row */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Tracking', value: stats.total, icon: <Package size={16} />, color: 'text-gray-600 bg-gray-100', filter: 'all' },
            { label: 'Target Hit', value: stats.below, icon: <TrendingDown size={16} />, color: 'text-green-600 bg-green-100', filter: 'below' },
            { label: 'Amazon', value: stats.amazon, icon: <span className="text-xs">🟠</span>, color: 'text-orange-600 bg-orange-100', filter: 'amazon' },
            { label: 'Flipkart', value: stats.flipkart, icon: <span className="text-xs">🔵</span>, color: 'text-blue-600 bg-blue-100', filter: 'flipkart' },
          ].map((s) => (
            <button
              key={s.filter}
              onClick={() => setFilter(s.filter)}
              className={`card p-4 flex items-center gap-3 text-left transition-all hover:shadow-md ${
                filter === s.filter ? 'ring-2 ring-brand-500' : ''
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

      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {filter === 'all' ? 'Tracked Products' :
             filter === 'below' ? 'Target Price Hit' :
             filter === 'amazon' ? 'Amazon Products' : 'Flipkart Products'}
          </h1>
          {products.length > 0 && (
            <p className="text-sm text-gray-400 mt-0.5">
              Alerts → <span className="font-medium text-gray-600">{userEmail}</span>
            </p>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Product</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Target hit banner */}
      {stats.below > 0 && filter !== 'below' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 mb-5 flex items-center gap-3">
          <Bell size={16} className="text-green-500 flex-shrink-0" />
          <p className="text-sm text-green-700">
            <strong>{stats.below} product{stats.below > 1 ? 's have' : ' has'} hit your target price!</strong>
            {' '}
            <button onClick={() => setFilter('below')} className="underline font-medium">View them →</button>
          </p>
        </div>
      )}

      {/* Products grid */}
      {filtered.length === 0 ? (
        <EmptyState filter={filter} onAdd={() => setShowModal(true)} />
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

function EmptyState({ filter, onAdd }) {
  if (filter !== 'all') {
    return (
      <div className="text-center py-16">
        <AlertCircle size={36} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No products match this filter</p>
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
