import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import WorkspaceLayout from './components/layout/WorkspaceLayout';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import ProjectsPage from './pages/ProjectsPage';
import StudyBuddiesPage from './pages/StudyBuddiesPage';
import SkillSwapPage from './pages/SkillSwapPage';
import CollaborationRequestsPage from './pages/CollaborationRequestsPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function AppContent({ theme, toggleTheme }) {
  const location = useLocation();
  const isLandingRoute = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col bg-bg-page text-text-main transition-colors duration-200">
      {/* Landing page header only shown on the public landing page */}
      {isLandingRoute && <Header theme={theme} toggleTheme={toggleTheme} />}

      <div className="flex-1 flex flex-col">
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Page */}
          <Route
            path="/auth"
            element={<AuthPage theme={theme} toggleTheme={toggleTheme} />}
          />

          {/* Protected Workspace Layout & Nested Routes */}
          <Route
            element={
              <ProtectedRoute>
                <WorkspaceLayout theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/study-buddies" element={<StudyBuddiesPage />} />
            <Route path="/skillswap" element={<SkillSwapPage />} />
            <Route path="/requests" element={<CollaborationRequestsPage />} />
          </Route>
        </Routes>
      </div>

      {/* Landing page footer only shown on the public landing page */}
      {isLandingRoute && <Footer />}
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
      <AuthProvider>
        <AppContent theme={theme} toggleTheme={toggleTheme} />
      </AuthProvider>
    </Router>
  );
}

export default App;
