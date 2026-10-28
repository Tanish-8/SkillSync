import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders } from 'lucide-react';

/**
 * Accessible Factor Breakdown component.
 * Displays each compatibility factor with label, weight percentage, and score.
 *
 * @param {{ factors: Array<{ name: string, label: string, weight: number, score: number }>, defaultOpen?: boolean }} props
 */
export function FactorBreakdown({ factors = [], defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (!factors || factors.length === 0) {
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
        <span className="inline-flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-accent" />
          <span>Factor Breakdown ({factors.length} weighted factors)</span>
        </span>
        <span className="text-[11px] inline-flex items-center gap-0.5 text-text-muted">
          <span>{isOpen ? 'Hide' : 'Show details'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 pt-1.5 bg-bg-section/40 rounded-lg p-3 border border-border/50">
          {factors.map((f, idx) => {
            const factorScore = Math.min(100, Math.max(0, f.score || 0));
            return (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-text-main font-medium">{f.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted text-[10px]">
                      Weight: {f.weight}%
                    </span>
                    <span className="font-semibold text-text-amber min-w-[3rem] text-right">
                      {factorScore}/100
                    </span>
                  </div>
                </div>
                {/* Visual Progress Bar */}
                <div
                  className="h-1.5 w-full bg-bg-card rounded-full overflow-hidden border border-border/40"
                  role="progressbar"
                  aria-label={`${f.label} factor score`}
                  aria-valuenow={factorScore}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-300"
                    style={{ width: `${factorScore}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FactorBreakdown;
