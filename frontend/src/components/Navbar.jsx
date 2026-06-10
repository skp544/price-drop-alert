import { Link } from 'react-router-dom';
import { LogOut, TrendingDown } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Navbar({ userEmail, onLogout }) {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingDown size={18} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">
              Price<span className="text-brand-500">Drop</span>
            </span>
          </Link>

          {userEmail && (
            <div className="flex items-center gap-3">
              <NotificationBell userEmail={userEmail} />
              <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                <span className="text-sm text-gray-600 font-medium">{userEmail}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors"
                title="Switch account"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
