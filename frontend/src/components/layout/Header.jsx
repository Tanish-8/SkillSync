import React, { useState } from 'react';
import { Sun, Moon, Menu, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { scrollToSection } from '../../utils/scroll';

export function Header({ theme, toggleTheme, onOpenAuth }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (e, targetId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    requestAnimationFrame(() => {
      scrollToSection(targetId);
    });
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-bg-page transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="group flex items-baseline gap-1 focus:outline-none focus:ring-1 focus:ring-primary rounded"
          >
            <span className="font-serif text-2xl font-semibold tracking-tight text-text-main">
              SkillSync
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
          </a>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          className="hidden md:flex items-center gap-6 text-sm text-text-muted font-sans"
        >
          <a
            href="#projects"
            onClick={(e) => handleNavClick(e, 'projects')}
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Projects
          </a>
          <a
            href="#study"
            onClick={(e) => handleNavClick(e, 'study')}
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Study Buddies
          </a>
          <a
            href="#skillswap"
            onClick={(e) => handleNavClick(e, 'skillswap')}
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            SkillSwap
          </a>
          <a
            href="#demo"
            onClick={(e) => handleNavClick(e, 'demo')}
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Demonstration
          </a>
          <a
            href="#scoring"
            onClick={(e) => handleNavClick(e, 'scoring')}
            className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
          >
            Scoring Philosophy
          </a>
        </nav>

        {/* Actions: Theme Toggle, Sign In, and Get Started */}
        <div className="hidden sm:flex items-center gap-3">
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

          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenAuth('sign-in')}
          >
            Sign in
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={(e) => handleNavClick(e, 'demo')}
          >
            Get started
          </Button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex sm:hidden items-center gap-2">
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
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle mobile menu"
            className="p-2 rounded-md border border-border bg-bg-card text-text-main hover:bg-bg-section transition-colors focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Menu className="w-5 h-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-b border-border bg-bg-page px-4 pt-3 pb-5 space-y-3">
          <nav className="flex flex-col space-y-2 text-sm text-text-muted">
            <a
              href="#projects"
              onClick={(e) => handleNavClick(e, 'projects')}
              className="py-1.5 hover:text-text-main transition-colors"
            >
              Projects
            </a>
            <a
              href="#study"
              onClick={(e) => handleNavClick(e, 'study')}
              className="py-1.5 hover:text-text-main transition-colors"
            >
              Study Buddies
            </a>
            <a
              href="#skillswap"
              onClick={(e) => handleNavClick(e, 'skillswap')}
              className="py-1.5 hover:text-text-main transition-colors"
            >
              SkillSwap
            </a>
            <a
              href="#demo"
              onClick={(e) => handleNavClick(e, 'demo')}
              className="py-1.5 hover:text-text-main transition-colors"
            >
              Demonstration
            </a>
            <a
              href="#scoring"
              onClick={(e) => handleNavClick(e, 'scoring')}
              className="py-1.5 hover:text-text-main transition-colors"
            >
              Scoring Philosophy
            </a>
          </nav>
          <div className="pt-3 border-t border-border flex flex-col gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('sign-in');
              }}
            >
              Sign in
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="w-full"
              onClick={(e) => handleNavClick(e, 'demo')}
            >
              Get started
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
