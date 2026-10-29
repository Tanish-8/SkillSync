import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  ArrowLeftRight,
  User,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getProfile } from '../api/client';
import { formatMissingFieldName } from '../utils/matchingHelpers';

export function DashboardPage() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [completeness, setCompleteness] = useState(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStudentProfile() {
      try {
        setLoadingProfile(true);
        setProfileError(null);
        const res = await getProfile();
        if (isMounted) {
          setProfileData(res.profile);
          setCompleteness(res.completeness);
          setIsNewProfile(false);
        }
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 404) {
          // New student profile not yet created
          setIsNewProfile(true);
          setProfileData(null);
          setCompleteness(null);
        } else {
          setProfileError(err.message || 'Unable to load profile completeness.');
        }
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }

    loadStudentProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const formattedDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Active Session';

  return (
    <div className="space-y-8">
      {/* 1. HERO / STUDENT PROFILE HEADER */}
      <section className="rounded-lg border border-border bg-bg-card p-6 sm:p-8 space-y-4 shadow-restrained transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
                Student Workspace
              </span>
              <Badge variant="outline" className="text-[10px] py-0.5 px-2">
                Authenticated
              </Badge>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
              Welcome back, {user?.name || 'Student'}
            </h1>
            <p className="text-xs text-text-muted">
              Signed in as <span className="font-medium text-text-main">{user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-text-muted border-t sm:border-t-0 sm:border-l border-border pt-3 sm:pt-0 sm:pl-6">
            <Calendar className="w-4 h-4 text-text-muted shrink-0" aria-hidden="true" />
            <div>
              <span className="block text-[10px] uppercase tracking-wider text-text-muted">
                Member Since
              </span>
              <span className="font-medium text-text-main">{formattedDate}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROFILE COMPLETENESS BY MODE (Deterministic, No Global Artificial Score) */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Mode Readiness & Completeness
          </h2>
          <Link
            to="/profile"
            className="text-xs text-text-amber hover:underline font-medium inline-flex items-center gap-1"
          >
            <span>Edit Profile</span>
            <ArrowRight className="w-3 h-3" aria-hidden="true" />
          </Link>
        </div>

        {loadingProfile ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 text-xs text-text-muted text-center animate-pulse">
            Checking profile completeness across collaboration modes...
          </div>
        ) : profileError ? (
          <div className="rounded-lg border border-border bg-bg-section p-4 text-xs text-text-main flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" />
            <div>
              <span className="font-medium">Profile completeness notice:</span>
              <p className="text-text-muted mt-0.5">{profileError}</p>
            </div>
          </div>
        ) : isNewProfile ? (
          <div className="rounded-lg border border-border bg-bg-card p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-md bg-bg-section border border-border flex items-center justify-center text-text-amber shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-medium text-text-main">
                  Profile Setup Needed for Compatibility Matching
                </h3>
                <p className="text-xs text-text-muted leading-relaxed max-w-2xl">
                  You have not created a student profile yet. The SkillSync matching engine requires declared skills, schedules, and learning preferences to calculate compatibility without guessing.
                </p>
              </div>
            </div>
            <div className="pt-2">
              <Button size="sm" asChild>
                <Link to="/profile" className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Configure Student Profile</span>
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Project Mode Completeness */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-main">Project Mode</span>
                {completeness?.project?.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-text-amber">
                    Incomplete
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {completeness?.project?.isComplete
                  ? 'All 6 required project inputs declared (skills, timeSlots, goals, timeline, workingStyle, learningStyle).'
                  : `Missing: ${completeness?.project?.missingFields?.map(formatMissingFieldName).join(', ') || 'required fields'}`}
              </p>
            </div>

            {/* Study Mode Completeness */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-main">Study Squads</span>
                {completeness?.study?.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-text-amber">
                    Incomplete
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {completeness?.study?.isComplete
                  ? 'All 5 study inputs declared (courseCode, topics, timeSlots, learningPreferences, learningStyle).'
                  : `Missing: ${completeness?.study?.missingFields?.map(formatMissingFieldName).join(', ') || 'required fields'}`}
              </p>
            </div>

            {/* SkillSwap Mode Completeness */}
            <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-text-main">SkillSwap</span>
                {completeness?.skillswap?.isComplete ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium text-text-amber">
                    Incomplete
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                {completeness?.skillswap?.isComplete
                  ? 'All 5 SkillSwap inputs declared (offered skills, desiredSkills, timeSlots, weeklyHours, learningStyle).'
                  : `Missing: ${completeness?.skillswap?.missingFields?.map(formatMissingFieldName).join(', ') || 'required fields'}`}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 3. FOUR WORKSPACE NAVIGATION CARDS */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-lg font-medium text-text-main">
            Collaboration Tracks
          </h2>
          <span className="text-xs text-text-muted">
            Recommendations & Requests Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: My Profile */}
          <Card className="flex flex-col justify-between p-5 space-y-5">
            <div className="space-y-3.5">
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                <User className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    My Profile
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    {isNewProfile ? 'Setup Needed' : 'Configured'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Manage your academic background, skills, learning style, goals, project experience, and availability.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-muted">Profile Management</span>
              <Link
                to="/profile"
                className="font-medium text-text-main hover:text-text-amber transition-colors inline-flex items-center gap-1"
              >
                <span>Edit Profile</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          {/* Card 2: Project Teammates */}
          <Card className="flex flex-col justify-between p-5 space-y-5">
            <div className="space-y-3.5">
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                <Users className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    Project Teammates
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Recommendations available
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Browse open project opportunities ranked against your saved profile, inspect compatibility factors, and send collaboration requests.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Project management available</span>
              <Link
                to="/projects"
                className="font-medium text-text-main hover:text-text-amber transition-colors inline-flex items-center gap-1"
              >
                <span>View Track</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          {/* Card 3: Study Buddies */}
          <Card className="flex flex-col justify-between p-5 space-y-5">
            <div className="space-y-3.5">
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                <BookOpen className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    Study Buddies
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Recommendations available
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Discover study partners based on course overlap, learning style, schedule, academic level, and goals. Send and track study requests.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Requests available</span>
              <Link
                to="/study-buddies"
                className="font-medium text-text-main hover:text-text-amber transition-colors inline-flex items-center gap-1"
              >
                <span>View Track</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>

          {/* Card 4: SkillSwap */}
          <Card className="flex flex-col justify-between p-5 space-y-5">
            <div className="space-y-3.5">
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center text-primary dark:text-accent">
                <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    SkillSwap
                  </h3>
                  <Badge variant="outline" className="text-[10px]">
                    Recommendations available
                  </Badge>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Find partners with genuinely reciprocal teach-and-learn skills, review compatibility explanations, and propose a SkillSwap.
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="text-text-muted font-medium">Requests available</span>
              <Link
                to="/skillswap"
                className="font-medium text-text-main hover:text-text-amber transition-colors inline-flex items-center gap-1"
              >
                <span>View Track</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. SECURITY & SESSION VERIFICATION PANEL */}
      <section className="rounded-lg border border-border bg-bg-section p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-accent" aria-hidden="true" />
          <h3 className="font-serif text-sm font-medium text-text-main">
            Session & Cookie Security
          </h3>
        </div>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Your session is secured with an HTTP-only, SameSite=Lax signed JSON Web Token issued directly by the SkillSync backend. JavaScript code running in the browser cannot read or extract this session token.
        </p>
      </section>
    </div>
  );
}

export default DashboardPage;
