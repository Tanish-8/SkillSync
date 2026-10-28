import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatMissingFieldName } from '../../utils/matchingHelpers';

/**
 * Standard Incomplete Profile Banner for recommendation pages.
 * Tells students why recommendations cannot be calculated and links directly to /profile.
 *
 * @param {{ trackName: string, missingFields?: string[] }} props
 */
export function IncompleteProfileBanner({
  trackName = 'Recommendations',
  missingFields = [],
}) {
  return (
    <Card className="p-6 border-l-4 border-l-amber-500 bg-bg-card space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-text-amber shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-serif text-base font-medium text-text-main">
            {trackName} Unavailable — Incomplete Profile Inputs
          </h3>
          <p className="text-xs text-text-muted leading-relaxed">
            SkillSync computes compatibility deterministically from your declared profile inputs without fabricating estimates. To receive ranked recommendations, please complete the following required fields:
          </p>
        </div>
      </div>

      {missingFields && missingFields.length > 0 && (
        <div className="flex flex-wrap gap-2 pl-8">
          {missingFields.map((field) => (
            <span
              key={field}
              className="px-2.5 py-1 rounded-md text-[11px] bg-bg-section border border-border text-text-main font-medium"
            >
              {formatMissingFieldName(field)}
            </span>
          ))}
        </div>
      )}

      <div className="pl-8 pt-1">
        <Button size="sm" asChild>
          <Link to="/profile" className="inline-flex items-center gap-1.5">
            <span>Complete Inputs in Profile</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}

export default IncompleteProfileBanner;
