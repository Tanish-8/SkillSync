import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Users,
  BookOpen,
  ArrowLeftRight,
  Inbox,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';

const WORKSPACE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/profile', label: 'My Profile', icon: User },
  { path: '/projects', label: 'Projects', icon: Users },
  { path: '/study-buddies', label: 'Study Buddies', icon: BookOpen },
  { path: '/skillswap', label: 'SkillSwap', icon: ArrowLeftRight },
  { path: '/requests', label: 'Requests', icon: Inbox },
];

export function WorkspaceLayout({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState(null);

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      setLogoutError(null);
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setLogoutError(
        err.message || 'Logout encountered an error. Session may still be active on server.'
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col justify-between transition-colors duration-200">
      {/* 1. AUTHENTICATED WORKSPACE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-bg-page transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Wordmark */}
          <Link
            to="/dashboard"
            className="flex items-baseline gap-1 focus:outline-none focus:ring-1 focus:ring-primary rounded shrink-0"
            aria-label="SkillSync Workspace Dashboard"
          >
            <span className="font-serif text-2xl font-semibold tracking-tight text-text-main">
              SkillSync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </Link>

          {/* Desktop Navigation Links (lg and above) */}
          <nav
            aria-label="Workspace Navigation"
            className="hidden lg:flex items-center gap-1 text-sm font-sans"
          >
            {WORKSPACE_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                    isActive
                      ? 'border-border bg-bg-card text-text-main shadow-xs'
                      : 'border-transparent text-text-muted hover:text-text-main hover:bg-bg-section/70'
                  } focus:outline-none focus:ring-1 focus:ring-primary`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Desktop Right Action Bar (lg and above) */}
          <div className="hidden lg:flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Sign Out Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              disabled={logoutLoading}
              className="flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{logoutLoading ? 'Signing out...' : 'Sign out'}</span>
            </Button>
          </div>

          {/* Mobile/Tablet Menu & Theme Toggle (below lg) */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close workspace menu' : 'Open workspace menu'}
              className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Menu className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Navigation Dropdown (below lg) */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border bg-bg-card px-4 py-3 space-y-2 transition-colors">
            <div className="pb-2 border-b border-border text-xs text-text-muted">
              Signed in as <span className="font-medium text-text-main">{user?.email}</span>
            </div>

            <nav aria-label="Mobile Workspace Navigation" className="space-y-1">
              {WORKSPACE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors border ${
                      isActive
                        ? 'border-border bg-bg-section text-text-main'
                        : 'border-transparent text-text-muted hover:text-text-main hover:bg-bg-section/50'
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-hidden="true" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-2 border-t border-border">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                disabled={logoutLoading}
                className="w-full flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{logoutLoading ? 'Signing out...' : 'Sign out'}</span>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Global Logout Error Notice */}
      {logoutError && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 w-full">
          <div
            role="alert"
            className="rounded-md border border-border bg-bg-section p-3 text-xs text-text-main flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-medium">Sign-out notice</span>
              <p className="text-text-muted">{logoutError}</p>
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN NESTED WORKSPACE CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Outlet />
      </main>

      {/* 3. MINIMAL WORKSPACE FOOTER */}
      <footer className="w-full border-t border-border bg-bg-page py-6 text-center text-xs text-text-muted transition-colors">
        <span>SkillSync © 2026. Higher Education Student Collaboration Platform.</span>
      </footer>
    </div>
  );
}

export default WorkspaceLayout;

