import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import LandingPage from './pages/LandingPage';
import Modal from './components/ui/Modal';
import Button from './components/ui/Button';
import { scrollToSection } from './utils/scroll';

export function App() {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('skillsync-theme');
      if (stored === 'dark' || stored === 'light') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  const [authModal, setAuthModal] = useState({
    isOpen: false,
    mode: 'sign-in', // 'sign-in' or 'register'
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

  const handleOpenAuth = (mode = 'sign-in') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal({ isOpen: false, mode: 'sign-in' });
  };

  const handleExploreDemoFromModal = () => {
    handleCloseAuth();
    scrollToSection('demo');
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-bg-page text-text-main transition-colors duration-200">
        <Header
          theme={theme}
          toggleTheme={toggleTheme}
          onOpenAuth={handleOpenAuth}
        />

        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<LandingPage onOpenAuth={handleOpenAuth} />}
            />
          </Routes>
        </div>

        <Footer />

        {/* Phase 3 Authentication Notice Modal (Prevents dead buttons) */}
        <Modal
          isOpen={authModal.isOpen}
          onClose={handleCloseAuth}
          title={
            authModal.mode === 'register'
              ? 'Student Registration — Phase 3'
              : 'Student Sign In — Phase 3'
          }
        >
          <div className="space-y-4">
            <p>
              Account creation, university email verification, and the animated
              diagonal portal transition are scheduled for implementation in{' '}
              <strong className="text-text-main font-medium">Phase 3</strong>.
            </p>
            <p className="text-xs text-text-muted">
              In this current Phase 2 release, all design system tokens,
              reusable component foundations, and the interactive compatibility
              simulator are fully functional for evaluation.
            </p>
            <div className="pt-2 flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleCloseAuth}>
                Dismiss
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExploreDemoFromModal}
              >
                Try Match Simulator
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Router>
  );
}

export default App;
