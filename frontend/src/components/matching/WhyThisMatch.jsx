import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle2, HelpCircle } from 'lucide-react';

/**
 * Accessible "Why this match?" disclosure component.
 * Renders the deterministic, grounded explanation strings returned by the backend engine.
 *
 * @param {{ reasons: string[], defaultOpen?: boolean }} props
 */
export function WhyThisMatch({ reasons = [], defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!reasons || reasons.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/60">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between text-left text-xs font-medium text-text-muted hover:text-text-main transition-colors py-1 focus:outline-none focus:ring-1 focus:ring-accent rounded px-1 -mx-1"
      >
        <span className="inline-flex items-center gap-1.5 text-text-amber font-semibold">
          <HelpCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Why this match? ({reasons.length} grounded reasons)</span>
        </span>
        <span className="text-[11px] inline-flex items-center gap-0.5 text-text-muted">
          <span>{isOpen ? 'Collapse' : 'Explain'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <ul className="space-y-1.5 p-3 rounded-lg bg-bg-section/50 border border-border/60 text-xs text-text-main leading-relaxed">
          {reasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-[11px] text-text-muted">{reason}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default WhyThisMatch;
