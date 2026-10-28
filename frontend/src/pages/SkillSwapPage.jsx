import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Sparkles,
  BookMarked,
  Clock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getProfile } from '../api/client';

export function SkillSwapPage() {
  const [profile, setProfile] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await getProfile();
        if (isMounted) {
          setProfile(res.profile);
          setCompleteness(res.completeness);
        }
      } catch {
        // Handled gracefully as unconfigured profile
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const isSkillSwapReady = completeness?.skillswap?.isComplete;

  return (
    <div className="space-y-8">
      {/* 1. PAGE HEADER */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
            Collaboration Track
          </span>
          <Badge variant="outline" className="text-[10px]">
            Preview API Available
          </Badge>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
          SkillSwap Reciprocal Tutoring
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Peer-to-peer reciprocal knowledge exchange. Teach subjects you excel in; receive personalized tutoring in subjects you want to develop.
        </p>
      </section>

      {/* 2. ARCHITECTURAL STATUS BANNER */}
      <section className="rounded-lg border border-border bg-bg-section p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-sm font-medium text-text-main">
            Implementation Status: Preview API Operational · Exchange Directory In Progress
          </h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          The backend reciprocal matching engine is operational at{' '}
          <code className="text-[11px] bg-bg-card px-1.5 py-0.5 rounded border border-border text-text-main">
            POST /api/matching/preview/skillswap
          </code>
          . It strictly requires bidirectional reciprocation (60% weight: both students must offer what the other desires). Student directory listings and swap request transactions will be enabled in future discovery phases.
        </p>
      </section>

      {/* 3. YOUR CONFIGURED SKILLSWAP INVENTORY (Offered vs Desired) */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Your Exchange Inventory & Commitment
          </h2>
          <Link
            to="/profile"
            className="text-xs text-text-amber hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Edit Inventory</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card A: Skills You Offer */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-text-amber" />
                <h3 className="font-serif text-base font-medium text-text-main">
                  Skills You Offer (Teach)
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {profile?.skills?.length || 0} Competencies
              </Badge>
            </div>

            {profile?.skills && profile.skills.length > 0 ? (
              <div className="space-y-2">
                {profile.skills.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-bg-section/60 border border-border"
                  >
                    <span className="font-medium text-text-main">{s.name}</span>
                    <span className="text-[11px] text-text-muted">Level {s.level}/5</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-2">
                No offered skills declared. Add your strengths to enable reciprocal pairings.
              </p>
            )}
          </Card>

          {/* Card B: Skills You Seek */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-text-amber" />
                <h3 className="font-serif text-base font-medium text-text-main">
                  Skills You Seek (Learn)
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                {profile?.desiredSkills?.length || 0} Desired
              </Badge>
            </div>

            {profile?.desiredSkills && profile.desiredSkills.length > 0 ? (
              <div className="space-y-2">
                {profile.desiredSkills.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-bg-section/60 border border-border"
                  >
                    <span className="font-medium text-text-main">{d.name}</span>
                    <span className="text-[11px] text-text-muted">Target Level {d.targetLevel}/5</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-2">
                No desired skills declared. Add topics you wish to master.
              </p>
            )}
          </Card>

          {/* Card C: Weekly Availability & Cadence */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-amber" />
                <h3 className="font-serif text-base font-medium text-text-main">
                  Exchange Cadence
                </h3>
              </div>
              <Badge variant="outline" className="text-[10px]">
                Cadence (20%)
              </Badge>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-text-muted block text-[11px] uppercase tracking-wider">
                  Weekly Committed Hours
                </span>
                <span className="text-base font-semibold text-text-main">
                  {profile?.weeklyHours !== undefined && profile.weeklyHours !== null
                    ? `${profile.weeklyHours} hrs / week`
                    : 'Not declared'}
                </span>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Calculates weekly workload balance with partners
                </p>
              </div>

              <div className="pt-2 border-t border-border">
                <span className="text-text-muted block text-[11px] uppercase tracking-wider mb-1">
                  Available Windows
                </span>
                <span className="font-medium text-text-main">
                  {profile?.timeSlots?.length || 0} active slots chosen
                </span>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. HONEST EMPTY STATE (No fake tutoring partners or mock transactions) */}
      <section className="rounded-lg border border-dashed border-border bg-bg-card p-8 sm:p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center text-primary dark:text-accent mx-auto">
          <ArrowLeftRight className="w-6 h-6" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="font-serif text-lg font-medium text-text-main">
            SkillSwap Directory Discovery In Progress
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            The SkillSwap reciprocal scoring algorithm is running on the backend. Public student exchange listings and tutoring requests will be connected once matching discovery is deployed. Ensure your offered and desired skills are up to date so other students can reciprocate.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link to="/profile" className="inline-flex items-center gap-1.5">
              <span>{isSkillSwapReady ? 'Review Exchange Inventory' : 'Configure Exchange Skills'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link to="/dashboard">Return to Dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

export default SkillSwapPage;

