import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  GraduationCap,
  Calendar,
  ArrowRight,
  Sparkles,
  Target,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  User,
  Clock,
  Send,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  getProfile,
  getStudyBuddyRecommendations,
  getSentCollaborationRequests,
} from '../api/client';
import { FactorBreakdown } from '../components/matching/FactorBreakdown';
import { WhyThisMatch } from '../components/matching/WhyThisMatch';
import { IncompleteProfileBanner } from '../components/matching/IncompleteProfileBanner';
import { SendCollaborationRequestModal } from '../components/matching/SendCollaborationRequestModal';
import { getScoreTier, formatTimeSlot } from '../utils/matchingHelpers';
import { useAuth } from '../context/AuthContext';

export function StudyBuddiesPage() {
  const { user } = useAuth();

  // 1. Profile inputs context
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // 2. Recommendations state
  const [candidates, setCandidates] = useState([]);
  const [recCompleteness, setRecCompleteness] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 6,
    totalRecommendations: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recError, setRecError] = useState(null);

  // 3. Collaboration Request State (Phase 7)
  const [sentRequestStudentIds, setSentRequestStudentIds] = useState(new Set());
  const [collabModalTarget, setCollabModalTarget] = useState(null);

  useEffect(() => {
    if (user) {
      getSentCollaborationRequests({ status: 'pending' })
        .then((res) => {
          if (res?.requests) {
            const ids = new Set(
              res.requests
                .filter((r) => r.mode === 'study_buddy' && r.recipientId)
                .map((r) =>
                  typeof r.recipientId === 'object'
                    ? r.recipientId.id || r.recipientId._id
                    : r.recipientId
                )
            );
            setSentRequestStudentIds(ids);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Load user profile inputs
  useEffect(() => {
    let isMounted = true;
    async function loadProfileData() {
      try {
        const res = await getProfile();
        if (isMounted) {
          setProfile(res.profile);
        }
      } catch {
        // Fallback: profile unconfigured
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }
    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real study buddy recommendations from backend
  const fetchRecommendations = useCallback(async (page = 1) => {
    try {
      setLoadingRecs(true);
      setRecError(null);
      const res = await getStudyBuddyRecommendations({ page, limit: 6 });
      setCandidates(res.recommendations || []);
      setRecCompleteness(res.completeness || null);
      setPagination(
        res.pagination || {
          page: 1,
          limit: 6,
          totalRecommendations: 0,
          totalPages: 1,
          hasMore: false,
        }
      );
    } catch (err) {
      setRecError(err.message || 'Failed to load study partner recommendations');
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(1);
  }, [fetchRecommendations]);

  return (
    <div className="space-y-8">
      {/* 1. PAGE HEADER */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
            Study Partner Matching
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
          Course Study Partners & Exam Prep
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Connect with classmates in identical courses who share your active study topics, learning preferences, and mutual study hours for collaborative homework and exam preparation.
        </p>
      </section>

      {/* 2. YOUR STUDY MATCHING INPUTS (Live Profile Context) */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Factor 1: Subject/Course Overlap (30%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Course & Topics (30%)
              </span>
              <BookOpen className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block uppercase">
                {profile?.courseCode || 'Not specified'}
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.topics && profile.topics.length > 0
                  ? `Active topics: ${profile.topics.join(', ')}`
                  : 'Course code match (70%) and topic overlap (30%)'}
              </p>
            </div>
          </Card>

          {/* Factor 2: Learning-Style Compatibility (25%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Learning Style (25%)
              </span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.learningStyle ? profile.learningStyle.replace(/_/g, ' ') : 'Not declared'}
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.learningPreferences && profile.learningPreferences.length > 0
                  ? `Formats: ${profile.learningPreferences.join(', ')}`
                  : 'Cognitive learning style and study preferences'}
              </p>
            </div>
          </Card>

          {/* Factor 3: Shared Schedule (20%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Schedule (20%)
              </span>
              <Calendar className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.timeSlots?.length || 0} Weekly Windows
              </span>
              <p className="text-[11px] text-text-muted">
                Calculates direct overlap in weekly study times
              </p>
            </div>
          </Card>

          {/* Factor 4: Academic-Level Compatibility (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Academic Level (15%)
              </span>
              <GraduationCap className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.academicBackground?.yearOfStudy
                  ? `Year ${profile.academicBackground.yearOfStudy}`
                  : profile?.academicBackground?.degree || 'Academic Cohort'}
              </span>
              <p className="text-[11px] text-text-muted">
                Cohort alignment and peer tutoring stage affinity
              </p>
            </div>
          </Card>

          {/* Factor 5: Goals Alignment (10%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Goals (10%)
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
                  : 'Shared exam preparation and study goals'}
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. REAL STUDY BUDDY RECOMMENDATIONS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-medium text-text-main">
              Recommended Study Partners
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {pagination.totalRecommendations} Candidates
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchRecommendations(pagination.page)}
            title="Refresh candidate listings"
            className="px-2.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-text-muted ${loadingRecs ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Error State */}
        {recError && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{recError}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => fetchRecommendations(pagination.page)}>
              Retry
            </Button>
          </div>
        )}

        {/* Incomplete Profile State */}
        {recCompleteness && !recCompleteness.isComplete ? (
          <IncompleteProfileBanner
            trackName="Study Buddy Matching"
            missingFields={recCompleteness.missingFields}
          />
        ) : loadingRecs ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((n) => (
              <Card key={n} className="p-5 space-y-4 animate-pulse">
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-border/50 rounded w-1/3" />
                  <div className="h-5 bg-border/40 rounded w-20" />
                </div>
                <div className="h-10 bg-border/30 rounded" />
                <div className="flex gap-2">
                  <div className="h-5 bg-border/40 rounded w-16" />
                  <div className="h-5 bg-border/40 rounded w-24" />
                </div>
              </Card>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          /* Empty State */
          <Card className="p-12 text-center border-dashed space-y-4">
            <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
              <BookOpen className="w-6 h-6 text-primary dark:text-accent" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-serif text-base font-medium text-text-main">
                No Compatible Study Partners Found
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                No active classmates currently match your course code ({profile?.courseCode || 'course'}) and study schedule. Check back as more students join your cohort or update your availability in profile settings.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fetchRecommendations(1)}
                className="inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Directory</span>
              </Button>
              <Button size="sm" asChild>
                <Link to="/profile">Update Study Inputs</Link>
              </Button>
            </div>
          </Card>
        ) : (
          /* Candidate Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {candidates.map((rec) => {
              const student = rec.student;
              const tier = getScoreTier(rec.score);
              const acad = student.academicBackground;

              return (
                <Card
                  key={student.id}
                  className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-primary dark:border-l-accent"
                >
                  <div className="space-y-3">
                    {/* Header: Name, Course Code & Score Badge */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h3 className="font-serif text-base font-medium text-text-main">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-text-muted">
                            <span className="font-semibold text-text-main uppercase bg-bg-section px-1.5 py-0.5 rounded border border-border">
                              {student.courseCode}
                            </span>
                            {acad?.yearOfStudy && (
                              <span>Year {acad.yearOfStudy} Student</span>
                            )}
                            {acad?.branch && (
                              <span>· {acad.branch}</span>
                            )}
                          </div>
                        </div>

                        {/* Prominent Compatibility Score Pill */}
                        <span
                          className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${tier.badgeClass}`}
                        >
                          {rec.score}% Match · {tier.label}
                        </span>
                      </div>

                      {/* Bio */}
                      {student.bio && (
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2 pt-0.5">
                          {student.bio}
                        </p>
                      )}
                    </div>

                    {/* Active Topics */}
                    {student.topics && student.topics.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted block">
                          Active Study Topics ({student.topics.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {student.topics.map((t, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-main font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Learning Style & Preferences */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
                      <div>
                        <span className="font-medium text-text-main">Learning Style:</span>{' '}
                        <span className="capitalize">{student.learningStyle ? student.learningStyle.replace(/_/g, ' ') : 'Undeclared'}</span>
                      </div>
                      <div>
                        <span className="font-medium text-text-main">Format:</span>{' '}
                        <span className="capitalize">
                          {student.learningPreferences && student.learningPreferences.length > 0
                            ? student.learningPreferences.join(', ')
                            : 'Flexible'}
                        </span>
                      </div>
                    </div>

                    {/* Available Schedule Windows */}
                    {student.timeSlots && student.timeSlots.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span className="font-medium uppercase tracking-wider">
                            Available Windows ({student.timeSlots.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {student.timeSlots.slice(0, 4).map((slot) => (
                            <span
                              key={slot}
                              className="px-2 py-0.5 rounded text-[10px] bg-bg-section/70 border border-border/70 text-text-muted"
                            >
                              {formatTimeSlot(slot)}
                            </span>
                          ))}
                          {student.timeSlots.length > 4 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-bg-section text-text-muted">
                              +{student.timeSlots.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Calibrated Factor Breakdown */}
                    <FactorBreakdown factors={rec.factors} />

                    {/* Grounded Explanations */}
                    <WhyThisMatch reasons={rec.reasons} />
                  </div>

                  {/* Candidate Actions Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-muted">
                      <User className="w-3 h-3 text-text-muted" />
                      <span>Verified Candidate</span>
                    </span>

                    {sentRequestStudentIds.has(student.userId) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        <span>Request Pending</span>
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() =>
                          setCollabModalTarget({
                            recipientId: student.userId,
                            studentName: student.name,
                            score: rec.score,
                            courseCode: student.courseCode,
                          })
                        }
                        className="text-xs inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Study Buddy Request</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Study Buddies Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalRecommendations} candidates)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page <= 1}
                onClick={() => fetchRecommendations(pagination.page - 1)}
                className="inline-flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!pagination.hasMore}
                onClick={() => fetchRecommendations(pagination.page + 1)}
                className="inline-flex items-center gap-1"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Collaboration Request Modal (Phase 7) */}
      <SendCollaborationRequestModal
        isOpen={Boolean(collabModalTarget)}
        onClose={() => setCollabModalTarget(null)}
        onSuccess={(newReq) => {
          if (newReq?.recipientId) {
            setSentRequestStudentIds((prev) => new Set([...prev, newReq.recipientId]));
          }
        }}
        mode="study_buddy"
        target={collabModalTarget}
      />
    </div>
  );
}

export default StudyBuddiesPage;
