import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import ProductDetail from './pages/ProductDetail';
import EmailSetup from './pages/EmailSetup';

const EMAIL_KEY = 'pda_user_email';

export default function App() {
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem(EMAIL_KEY) || '');

  useEffect(() => {
    if (userEmail) localStorage.setItem(EMAIL_KEY, userEmail);
    else localStorage.removeItem(EMAIL_KEY);
  }, [userEmail]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} onLogout={() => setUserEmail('')} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route
            path="/"
            element={
              userEmail ? (
                <Dashboard userEmail={userEmail} />
              ) : (
                <EmailSetup onSetEmail={setUserEmail} />
              )
            }
          />
          <Route
            path="/products/:id"
            element={
              userEmail ? <ProductDetail userEmail={userEmail} /> : <Navigate to="/" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
