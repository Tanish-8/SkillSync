import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Button } from '../ui/Button';

export function Header({ theme, toggleTheme }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg-page/95 backdrop-blur-none transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="group flex items-baseline gap-1 focus:outline-none focus:ring-1 focus:ring-primary rounded"
          >
            <span className="font-serif text-2xl font-semibold tracking-tight text-text-main">
              SkillSync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </a>
        </div>

        {/* Minimal Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-sm text-text-muted"
        >
          <a
            href="#projects"
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Project Collaboration
          </a>
          <a
            href="#study"
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Study Matching
          </a>
          <a
            href="#skillswap"
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            SkillSwap
          </a>
        </nav>

        {/* Right Actions: Theme Toggle & Primary Button */}
        <div className="flex items-center gap-3">
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

          <Button variant="primary" size="sm">
            Sign In
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Header;

