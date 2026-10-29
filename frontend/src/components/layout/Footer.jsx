import React from 'react';
import { scrollToSection } from '../../utils/scroll';

export function Footer() {
  const handleScroll = (e, id) => {
    e.preventDefault();
    scrollToSection(id);
  };

  return (
    <footer className="border-t border-border bg-bg-section mt-24 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Identity */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-xl font-semibold tracking-tight text-text-main">
                SkillSync
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
            </div>
            <p className="text-sm text-text-muted leading-relaxed max-w-md">
              A university collaboration platform connecting students for term projects, course study groups, and reciprocal skill exchange through independent compatibility models.
            </p>
          </div>

          {/* Navigation to the three modes */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main">
              Collaboration Modes
            </h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a
                  href="#projects"
                  onClick={(e) => handleScroll(e, 'projects')}
                  className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  Project Collaboration
                </a>
              </li>
              <li>
                <a
                  href="#study"
                  onClick={(e) => handleScroll(e, 'study')}
                  className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  Study Buddies
                </a>
              </li>
              <li>
                <a
                  href="#skillswap"
                  onClick={(e) => handleScroll(e, 'skillswap')}
                  className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  Reciprocal SkillSwap
                </a>
              </li>
            </ul>
          </div>

          {/* Information & Architecture */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main">
              Platform Architecture
            </h4>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a
                  href="#demo"
                  onClick={(e) => handleScroll(e, 'demo')}
                  className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  Interactive Demonstration
                </a>
              </li>
              <li>
                <a
                  href="#scoring"
                  onClick={(e) => handleScroll(e, 'scoring')}
                  className="hover:text-text-main transition-colors focus:outline-none focus:ring-1 focus:ring-primary rounded"
                >
                  Scoring Philosophy
                </a>
              </li>
              <li>
                <span className="text-text-muted/80">
                  Full-stack MERN Implementation
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Concise Privacy Statement & Copyright */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-text-muted">
          <p className="max-w-2xl leading-relaxed">
            <strong className="text-text-main font-medium">Matching Privacy:</strong> SkillSync calculates compatibility using only self-declared student skills, schedules, and academic interests to facilitate peer collaboration within the workspace.
          </p>

          <div className="shrink-0">
            <span>SkillSync © 2026. Built with React & Express.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
