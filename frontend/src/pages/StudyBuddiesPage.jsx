import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  Compass,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getProfile } from '../api/client';

export function StudyBuddiesPage() {
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

  const isStudyReady = completeness?.study?.isComplete;

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
          Course Study Squads & Exam Prep
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Form course-specific homework squads and exam study circles based on current curriculum, active study topics, and mutual study hours.
        </p>
      </section>

      {/* 2. ARCHITECTURAL STATUS BANNER */}
      <section className="rounded-lg border border-border bg-bg-section p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-sm font-medium text-text-main">
            Implementation Status: Preview API Operational · Peer Discovery Directory In Progress
          </h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          The backend study compatibility engine is implemented and authenticated at{' '}
          <code className="text-[11px] bg-bg-card px-1.5 py-0.5 rounded border border-border text-text-main">
            POST /api/matching/preview/study
          </code>
          . Database-backed peer search, candidate indexing, and squad invitation workflows will be integrated in upcoming discovery updates.
        </p>
      </section>

      {/* 3. YOUR STUDY MATCHING INPUTS (Live Profile Context) */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Your Study Pairing Inputs
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
          {/* Factor 1: Course Code (Accounts for 70% of Course/Topic factor) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Course Code
              </span>
              <GraduationCap className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block uppercase">
                {profile?.courseCode || 'Not specified'}
              </span>
              <p className="text-[11px] text-text-muted">
                Exact course code alignment is required for high affinity
              </p>
            </div>
          </Card>

          {/* Factor 2: Topics Jaccard Similarity (30% of Course/Topic factor) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Topics
              </span>
              <BookOpen className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.topics?.length || 0} Topics
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.topics && profile.topics.length > 0
                  ? profile.topics.join(', ')
                  : 'No topics added'}
              </p>
            </div>
          </Card>

          {/* Factor 3: Shared Availability (35% weight) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Availability (35%)
              </span>
              <Calendar className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.timeSlots?.length || 0} Weekly Windows
              </span>
              <p className="text-[11px] text-text-muted">
                Calculates direct overlap in weekly study slots
              </p>
            </div>
          </Card>

          {/* Factor 4: Learning Preferences (25% weight) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Preferences (25%)
              </span>
              <Compass className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.learningPreferences?.length || 0} Formats
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.learningPreferences && profile.learningPreferences.length > 0
                  ? profile.learningPreferences.join(', ')
                  : 'No formats added'}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. HONEST EMPTY STATE (No fake recommendations or mock peer cards) */}
      <section className="rounded-lg border border-dashed border-border bg-bg-card p-8 sm:p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center text-primary dark:text-accent mx-auto">
          <BookOpen className="w-6 h-6" />
        </div>

        <div className="space-y-2 max-w-lg mx-auto">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Study Buddy Directory Integration Pending
          </h2>
          <p className="text-xs text-text-muted leading-relaxed">
            The study compatibility engine is fully calibrated, but peer discovery across the student database has not yet been connected. When peer discovery launches, you will be paired with classmates in identical courses who share your active study topics.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild size="sm">
            <Link to="/profile" className="inline-flex items-center gap-1.5">
              <span>{isStudyReady ? 'Review Study Inputs' : 'Configure Study Preferences'}</span>
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

export default StudyBuddiesPage;

