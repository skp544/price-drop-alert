import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, TrendingDown, TrendingUp, Check } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api';

const fmt = (n) =>
  n != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
    : '—';

const timeAgo = (date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const POLL_INTERVAL_MS = 60000;

export default function NotificationBell({ userEmail }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications(userEmail);
      setNotifications(res.data || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // Notifications are non-critical; fail silently
    }
  }, [userEmail]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    const hadUnread = unreadCount > 0;
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    if (hadUnread) {
      try {
        await markAllNotificationsRead(userEmail);
      } catch {
        fetchNotifications();
      }
    }
  };

  const handleNotificationClick = async (n) => {
    setOpen(false);
    if (n.isRead) return;
    setNotifications((list) => list.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await markNotificationRead(n._id);
    } catch {
      fetchNotifications();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-500 hover:text-brand-500 hover:bg-gray-50 rounded-full transition-colors"
        title="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-brand-500 hover:underline"
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No price changes yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n._id}
                  to={`/products/${n.productId}`}
                  onClick={() => handleNotificationClick(n)}
                  className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                    !n.isRead ? 'bg-brand-50/40' : ''
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      n.type === 'price_drop' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-500'
                    }`}
                  >
                    {n.type === 'price_drop' ? <TrendingDown size={15} /> : <TrendingUp size={15} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2 leading-snug">{n.productTitle}</p>
                    <p className="text-xs mt-0.5">
                      <span className={n.type === 'price_drop' ? 'text-green-600 font-medium' : 'text-red-500 font-medium'}>
                        {fmt(n.oldPrice)} → {fmt(n.newPrice)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <span className="w-2 h-2 bg-brand-500 rounded-full mt-1.5 flex-shrink-0" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
