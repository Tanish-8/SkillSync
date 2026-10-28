import React from 'react';

export function Footer() {
  return (
    <footer className="border-t border-border bg-bg-section mt-20 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
        <div>
          <span className="font-serif font-medium text-text-main">SkillSync</span>
          <span className="mx-2">—</span>
          <span>Higher Education Student Collaboration Platform</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="hover:text-text-main transition-colors cursor-pointer">
            Code of Conduct
          </span>
          <span className="hover:text-text-main transition-colors cursor-pointer">
            Academic Honor Policy
          </span>
          <span className="hover:text-text-main transition-colors cursor-pointer">
            Privacy & Terms
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

