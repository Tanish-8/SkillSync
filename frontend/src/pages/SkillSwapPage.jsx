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
  Target,
  Calendar,
  Layers,
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

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-text-muted space-y-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading SkillSwap configuration from SkillSync backend...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. HEADER & EXPLANATION */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
            Phase 5D Compatibility Model
          </span>
          <Badge variant="outline" className="text-[10px]">
            Strict Bilateral Reciprocity
          </Badge>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
          SkillSwap Reciprocal Tutoring
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Peer-to-peer reciprocal knowledge exchange. Teach subjects you excel in; receive personalized tutoring in subjects you want to develop. Matching strictly requires bidirectional exchange: both students must offer what the other desires.
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
          . It evaluates 5 calibrated factors: Reciprocal Teach/Want (40%), Skill-Level Compatibility (20%), Goals Alignment (15%), Availability Compatibility (15%), and Learning-Style Compatibility (10%). Student directory listings and swap transactions will be enabled in future discovery phases.
        </p>
      </section>

      {/* 3. COMPATIBILITY FACTORS SUMMARY */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            SkillSwap Compatibility Factors (100% Model)
          </h2>
          <Link
            to="/profile"
            className="text-xs text-text-amber hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Edit Inventory</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Factor 1: Reciprocal Teach/Want (40%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Reciprocal Teach/Want (40%)
              </span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.skills?.length || 0} Offered · {profile?.desiredSkills?.length || 0} Desired
              </span>
              <p className="text-[11px] text-text-muted">
                Strict bilateral exchange: one-way matches earn 0% reciprocal score
              </p>
            </div>
          </Card>

          {/* Factor 2: Skill-Level Compatibility (20%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Skill Level (20%)
              </span>
              <Layers className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                Proficiency Depth
              </span>
              <p className="text-[11px] text-text-muted">
                Evaluates whether teaching level meets or exceeds requested learner target level
              </p>
            </div>
          </Card>

          {/* Factor 3: Goals Alignment (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Goals (15%)
              </span>
              <Target className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.goals?.length || 0} Declared Goals
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.goals && profile.goals.length > 0
                  ? profile.goals.map((g) => g.replace(/_/g, ' ')).join(', ')
                  : 'Shared skill development and career goals'}
              </p>
            </div>
          </Card>

          {/* Factor 4: Availability Compatibility (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Availability (15%)
              </span>
              <Calendar className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.weeklyHours !== undefined && profile.weeklyHours !== null
                  ? `${profile.weeklyHours} hrs/wk`
                  : 'Commitment not set'}
              </span>
              <p className="text-[11px] text-text-muted">
                Shared time windows (70%) and weekly hour cadence match (30%)
              </p>
            </div>
          </Card>

          {/* Factor 5: Learning-Style Compatibility (10%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Learning Style (10%)
              </span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.learningStyle ? profile.learningStyle.replace(/_/g, ' ') : 'Not declared'}
              </span>
              <p className="text-[11px] text-text-muted">
                Cognitive alignment for effective reciprocal tutoring sessions
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. INVENTORY BREAKDOWN */}
      <section className="space-y-4">
        <h2 className="font-serif text-lg font-medium text-text-main">
          Your Exchange Inventory Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
      </section>

      {/* 5. HONEST EMPTY STATE */}
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
      </section>
    </div>
  );
}

export default SkillSwapPage;
