import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

function AppContent({ theme, toggleTheme }) {
  const location = useLocation();
  const isAuthRoute = location.pathname === '/auth';

  return (
    <div className="min-h-screen flex flex-col bg-bg-page text-text-main transition-colors duration-200">
      {/* Landing page header only shown outside /auth */}
      {!isAuthRoute && <Header theme={theme} toggleTheme={toggleTheme} />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/auth"
            element={<AuthPage theme={theme} toggleTheme={toggleTheme} />}
          />
        </Routes>
      </div>

      {/* Landing page footer only shown outside /auth */}
      {!isAuthRoute && <Footer />}
    </div>
  );
}

export function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skillsync-theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('skillsync-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <Router>
      <AppContent theme={theme} toggleTheme={toggleTheme} />
    </Router>
  );
}

export default App;
