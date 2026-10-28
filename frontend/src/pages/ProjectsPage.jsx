import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Code2,
  Calendar,
  Target,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getProfile } from '../api/client';

export function ProjectsPage() {
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

  const isProjectReady = completeness?.project?.isComplete;

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
          Project Teammates & Capstones
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Match with students on technical skills, schedule symmetry, and balanced workload commitments for academic and capstone projects.
        </p>
      </section>

      {/* 2. ARCHITECTURAL STATUS BANNER */}
      <section className="rounded-lg border border-border bg-bg-section p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-sm font-medium text-text-main">
            Implementation Status: Preview API Operational · Project Persistence In Progress
          </h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          The backend deterministic compatibility engine for project matching is implemented at{' '}
          <code className="text-[11px] bg-bg-card px-1.5 py-0.5 rounded border border-border text-text-main">
            POST /api/matching/preview/project
          </code>
          . Database-backed project team persistence and group invitations are currently in development for Phase 5B.
        </p>
      </section>

      {/* 3. YOUR PROJECT MATCHING INPUTS (Live Profile Context) */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Your Project Matching Inputs
          </h2>
          <Link
            to="/profile"
            className="text-xs text-text-amber hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Update Inputs</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Factor 1: Skills Alignment (40%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Skills (40%)
              </span>
              <Code2 className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.skills?.length || 0} Declared
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.skills && profile.skills.length > 0
                  ? profile.skills.map((s) => s.name).join(', ')
                  : 'No skills declared yet'}
              </p>
            </div>
          </Card>

          {/* Factor 2: Schedule Overlap (25%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Schedule (25%)
              </span>
              <Calendar className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.timeSlots?.length || 0} Time Windows
              </span>
              <p className="text-[11px] text-text-muted">
                {profile?.timeSlots?.length
                  ? `${profile.timeSlots.length} weekly slots chosen`
                  : 'No slots configured'}
              </p>
            </div>
          </Card>

          {/* Factor 3: Goals & Urgency (20%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Goals & Urgency (20%)
              </span>
              <Target className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.timeline ? profile.timeline.replace('_', ' ') : 'Timeline not set'}
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.goals && profile.goals.length > 0
                  ? `Goals: ${profile.goals.map((g) => g.replace(/_/g, ' ')).join(', ')}`
                  : 'No project goals declared'}
              </p>
              <p className="text-[10px] text-text-muted pt-0.5">
                Combines goal similarity (60% of factor) and timeline compatibility (40%)
              </p>
            </div>
          </Card>

          {/* Factor 4: Working Style (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Style (15%)
              </span>
              <Users className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.workingStyle || 'Not set'}
              </span>
              <p className="text-[11px] text-text-muted">
                Sync vs async cadence alignment
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. VISUALLY CONSISTENT EMPTY STATE (No fake projects or nonfunctional buttons) */}
      <section className="rounded-lg border border-dashed border-border bg-bg-card p-8 sm:p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center text-primary dark:text-accent mx-auto">
          <Users className="w-6 h-6" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Project Persistence Workspace Coming in Phase 5B
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            Project team listings and group applications are not yet persisted in the database. When Phase 5B connects project models, your declared technical skills, schedule, goals, timeline, and working style will be used to automatically score compatibility with project openings.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link to="/profile" className="inline-flex items-center gap-1.5">
              <span>{isProjectReady ? 'Review Profile Inputs' : 'Complete Project Inputs'}</span>
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

export default ProjectsPage;

