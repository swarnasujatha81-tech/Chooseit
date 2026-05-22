import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Map, Navigation } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import HomePage from '@/pages/HomePage';
import DriverPage from '@/pages/DriverPage';
import { LanguageProvider } from '@/components/LanguageContext';

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const items = [
    { path: '/home', label: 'Map', icon: Map },
    { path: '/driver', label: 'Driver', icon: Navigation },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const Icon = item.icon;
        const active = location.pathname === item.path || (item.path === '/driver' && location.pathname === '/');
        return (
          <button key={item.path} className={active ? 'active' : ''} onClick={() => navigate(item.path)}>
            <Icon size={21} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function Shell() {
  return (
    <div className="preview-shell">
      <div className="app-shell">
        <main className="page-frame">
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/driver" element={<DriverPage />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </main>
        <BottomNav />
      </div>
      <Toaster position="top-center" toastOptions={{ style: { background: '#0f172a', color: '#fff' } }} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <Shell />
      </LanguageProvider>
    </BrowserRouter>
  );
}
