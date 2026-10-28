import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  ArrowLeftRight,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  Calendar,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export function DashboardPage({ theme, toggleTheme }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
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
        err.message || 'Logout encountered a network error. Session may still be active on server.'
      );
    } finally {
      setLogoutLoading(false);
    }
  };

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div className="min-h-screen bg-bg-page text-text-main flex flex-col justify-between transition-colors duration-200">
      {/* 1. DASHBOARD TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-30 w-full border-b border-border bg-bg-page transition-colors">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link
            to="/"
            className="flex items-baseline gap-1 focus:outline-none focus:ring-1 focus:ring-primary rounded"
          >
            <span className="font-serif text-2xl font-semibold tracking-tight text-text-main">
              SkillSync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </Link>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
              }
              className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Logout Button */}
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
        </div>
      </header>

      {/* 2. MAIN DASHBOARD CONTENT */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        {/* Error notification if logout fails */}
        {logoutError && (
          <div
            role="alert"
            className="rounded-md border border-border bg-bg-section p-4 text-xs text-text-main flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-medium">Logout Notice</span>
              <p className="text-text-muted leading-relaxed">{logoutError}</p>
            </div>
          </div>
        )}

        {/* HERO / STUDENT PROFILE HEADER */}
        <section className="rounded-lg border border-border bg-bg-card p-6 sm:p-8 space-y-4 shadow-restrained transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
                  Student Workspace
                </span>
                <Badge variant="outline" className="text-[10px] py-0.5 px-2">
                  Authenticated
                </Badge>
              </div>
              <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
                Welcome back, {user?.name || 'Student'}
              </h1>
              <p className="text-xs text-text-muted">
                Signed in as <span className="font-medium text-text-main">{user?.email}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs text-text-muted border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6">
              <Calendar className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
              <div>
                <span className="block text-[10px] uppercase tracking-wider text-text-muted">
                  Member Since
                </span>
                <span className="font-medium text-text-main">{formattedDate}</span>
              </div>
            </div>
          </div>
        </section>

        {/* THREE COLLABORATION WORKFLOWS (Preview APIs Implemented · Workspace Integration In Progress) */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-lg font-medium text-text-main">
              Collaboration Tracks
            </h2>
            <span className="text-xs text-text-muted">
              Matching APIs Implemented · Workspace Integration In Progress
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Capstone & Project Collaboration */}
            <Card className="flex flex-col justify-between p-6 space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-text-main">
                      Project Teammates
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      Preview API Available
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Deterministic compatibility scoring engine evaluates technical skills, schedules, and working styles via authenticated preview endpoints. In-dashboard team creation and project matching are in progress.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Matching Engine</span>
                <span className="font-medium text-text-amber">Project Persistence Pending</span>
              </div>
            </Card>

            {/* 2. Course Study Buddies */}
            <Card className="flex flex-col justify-between p-6 space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                  <BookOpen className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-text-main">
                      Study Buddies
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      Preview API Available
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Curriculum alignment and study cadence scoring are active via backend preview endpoints. Interactive peer discovery and study squad formation within the dashboard are in progress.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Course Pairing</span>
                <span className="font-medium text-text-amber">Discovery Integration Pending</span>
              </div>
            </Card>

            {/* 3. SkillSwap */}
            <Card className="flex flex-col justify-between p-6 space-y-6">
              <div className="space-y-4">
                <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                  <ArrowLeftRight className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-medium text-text-main">
                      SkillSwap
                    </h3>
                    <Badge variant="outline" className="text-[10px]">
                      Preview API Available
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Reciprocal skill-exchange and availability scoring are available via authenticated preview endpoints. In-dashboard peer directory discovery and exchange coordination are in progress.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>Exchange Directory</span>
                <span className="font-medium text-text-amber">Discovery Integration Pending</span>
              </div>
            </Card>
          </div>
        </section>

        {/* SECURITY & SESSION VERIFICATION PANEL */}
        <section className="rounded-lg border border-border bg-bg-section p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
            <h3 className="font-serif text-sm font-medium text-text-main">
              Session & Cookie Security
            </h3>
          </div>
          <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
            Your session is secured with an HTTP-only, SameSite=Lax signed JSON Web Token issued directly by the SkillSync backend. JavaScript code running in the browser cannot read or extract this session token.
          </p>
        </section>
      </main>

      {/* 3. MINIMAL DASHBOARD FOOTER */}
      <footer className="w-full border-t border-border bg-bg-page py-6 text-center text-xs text-text-muted">
        <span>SkillSync © 2026. Higher Education Student Collaboration Platform.</span>
      </footer>
    </div>
  );
}

export default DashboardPage;

