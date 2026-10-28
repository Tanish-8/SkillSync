import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeftRight,
  Sparkles,
  BookMarked,
  Clock,
  ArrowRight,
  Sliders,
  AlertCircle,
  Target,
  Calendar,
  Layers,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  GraduationCap,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getProfile, getSkillSwapRecommendations } from '../api/client';
import { FactorBreakdown } from '../components/matching/FactorBreakdown';
import { WhyThisMatch } from '../components/matching/WhyThisMatch';
import { IncompleteProfileBanner } from '../components/matching/IncompleteProfileBanner';
import { getScoreTier, formatTimeSlot } from '../utils/matchingHelpers';

export function SkillSwapPage() {
  // 1. Profile inputs context
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // 2. Recommendations state
  const [partners, setPartners] = useState([]);
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

  // Load user profile inventory
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await getProfile();
        if (isMounted) {
          setProfile(res.profile);
        }
      } catch {
        // Handled gracefully as unconfigured profile
      } finally {
        if (isMounted) setLoadingProfile(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch real reciprocal SkillSwap recommendations from backend
  const fetchRecommendations = useCallback(async (page = 1) => {
    try {
      setLoadingRecs(true);
      setRecError(null);
      const res = await getSkillSwapRecommendations({ page, limit: 6 });
      setPartners(res.recommendations || []);
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
      setRecError(err.message || 'Failed to load SkillSwap recommendations');
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations(1);
  }, [fetchRecommendations]);

  return (
    <div className="space-y-8">
      {/* 1. HEADER & EXPLANATION */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
            Phase 6B Reciprocal Matching
          </span>
          <Badge variant="outline" className="text-[10px]">
            Strict Bilateral Reciprocity
          </Badge>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
          SkillSwap Reciprocal Tutoring
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Peer-to-peer reciprocal knowledge exchange. Teach subjects you excel in; receive personalized tutoring in skills you want to develop. Matching strictly requires bidirectional exchange: both students must offer what the other desires.
        </p>
      </section>

      {/* 2. ARCHITECTURAL STATUS BANNER */}
      <section className="rounded-lg border border-border bg-bg-section p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-accent" />
          <h2 className="font-serif text-sm font-medium text-text-main">
            Status: Database-Backed Reciprocal SkillSwap Operational
          </h2>
        </div>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          SkillSync calculates reciprocal learning partnerships deterministically at{' '}
          <code className="text-[11px] bg-bg-card px-1.5 py-0.5 rounded border border-border text-text-main">
            GET /api/matching/recommendations/skillswap
          </code>
          . Bilateral reciprocity is strictly enforced: one-way matches earn 0% for reciprocal teach/want and are filtered out. Scores evaluate Reciprocal Exchange (40%), Skill Depth (20%), Goals (15%), Availability (15%), and Learning Style (10%).
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
                    <span className="text-[11px] font-semibold text-text-amber bg-bg-card px-2 py-0.5 rounded border border-border">
                      Level {s.level}/5
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-2">
                No offered skills declared. Add your strengths in profile to enable reciprocal pairings.
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
                    <span className="text-[11px] font-semibold text-text-amber bg-bg-card px-2 py-0.5 rounded border border-border">
                      Target Level {d.targetLevel}/5
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted py-2">
                No desired skills declared. Add topics you wish to learn in your profile.
              </p>
            )}
          </Card>
        </div>
      </section>

      {/* 5. REAL RECIPROCAL RECOMMENDATIONS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-serif text-lg font-medium text-text-main">
              Reciprocal Learning Recommendations
            </h2>
            <Badge variant="outline" className="text-[10px]">
              {pagination.totalRecommendations} Partners
            </Badge>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchRecommendations(pagination.page)}
            title="Refresh SkillSwap recommendations"
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
            trackName="SkillSwap Reciprocal Matching"
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
                <div className="h-14 bg-border/30 rounded" />
                <div className="flex gap-2">
                  <div className="h-5 bg-border/40 rounded w-20" />
                  <div className="h-5 bg-border/40 rounded w-24" />
                </div>
              </Card>
            ))}
          </div>
        ) : partners.length === 0 ? (
          /* Empty State */
          <Card className="p-12 text-center border-dashed space-y-4">
            <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
              <ArrowLeftRight className="w-6 h-6 text-primary dark:text-accent" />
            </div>
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-serif text-base font-medium text-text-main">
                No Reciprocal Matches Found Yet
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                SkillSwap strictly requires mutual skill exchange: both you and your partner must offer skills the other is looking to learn. One-way matches are never presented as valid swaps. Check back as more students join or declare additional skills in your profile.
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
                <span>Refresh Recommendations</span>
              </Button>
              <Button size="sm" asChild>
                <Link to="/profile">Update Skill Inventory</Link>
              </Button>
            </div>
          </Card>
        ) : (
          /* Reciprocal Partner Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partners.map((rec) => {
              const student = rec.student;
              const tier = getScoreTier(rec.score);

              // Derive bilateral exchange pairs between current user and candidate
              const matchedLearn = (student.offeredSkills || []).filter((offered) =>
                (profile?.desiredSkills || []).some(
                  (des) => des.name.trim().toLowerCase() === offered.name.trim().toLowerCase()
                )
              ).map((offered) => {
                const desired = profile?.desiredSkills?.find(
                  (d) => d.name.trim().toLowerCase() === offered.name.trim().toLowerCase()
                );
                return {
                  name: offered.name,
                  teacherLevel: offered.level,
                  targetLevel: desired?.targetLevel || 3,
                };
              });

              const matchedTeach = (profile?.skills || []).filter((offered) =>
                (student.desiredSkills || []).some(
                  (des) => des.name.trim().toLowerCase() === offered.name.trim().toLowerCase()
                )
              ).map((offered) => {
                const desired = student.desiredSkills?.find(
                  (d) => d.name.trim().toLowerCase() === offered.name.trim().toLowerCase()
                );
                return {
                  name: offered.name,
                  myLevel: offered.level,
                  partnerTarget: desired?.targetLevel || 3,
                };
              });

              return (
                <Card
                  key={student.id}
                  className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-primary dark:border-l-accent"
                >
                  <div className="space-y-3">
                    {/* Header: Name & Compatibility Score Pill */}
                    <div className="space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <h3 className="font-serif text-base font-medium text-text-main">
                            {student.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-text-muted">
                            <span className="inline-flex items-center gap-1 font-medium text-text-main">
                              <Clock className="w-3 h-3 text-accent" />
                              <span>{student.weeklyHours || 0} hrs/week</span>
                            </span>
                            {student.learningStyle && (
                              <span>· Style: <span className="capitalize">{student.learningStyle.replace(/_/g, ' ')}</span></span>
                            )}
                          </div>
                        </div>

                        {/* Prominent Score Pill */}
                        <span
                          className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${tier.badgeClass}`}
                        >
                          {rec.score}% Reciprocal · {tier.label}
                        </span>
                      </div>

                      {/* Bio */}
                      {student.bio && (
                        <p className="text-xs text-text-muted leading-relaxed line-clamp-2 pt-0.5">
                          {student.bio}
                        </p>
                      )}
                    </div>

                    {/* BILATERAL EXCHANGE HIGHLIGHT BOX */}
                    <div className="p-3 rounded-lg bg-bg-section/60 border border-border space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-text-amber font-semibold text-[11px] uppercase tracking-wider border-b border-border/50 pb-1.5">
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                        <span>Bilateral Skill Exchange</span>
                      </div>

                      {/* What You Can Learn */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block">
                          You Learn from {student.name}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedLearn.length > 0 ? (
                            matchedLearn.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-500/10 border border-emerald-500/30 text-text-main"
                              >
                                <span>{item.name}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
                                  Partner L{item.teacherLevel} (You want L{item.targetLevel})
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-text-muted italic">
                              Matching skills
                            </span>
                          )}
                        </div>
                      </div>

                      {/* What You Can Teach */}
                      <div className="space-y-1 pt-1 border-t border-border/40">
                        <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider block">
                          You Teach to {student.name}:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {matchedTeach.length > 0 ? (
                            matchedTeach.map((item, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-accent/10 border border-accent/30 text-text-main"
                              >
                                <span>{item.name}</span>
                                <span className="text-text-amber font-semibold text-[10px]">
                                  Your L{item.myLevel} (Partner wants L{item.partnerTarget})
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-text-muted italic">
                              Matching skills
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* All Candidate Offered & Desired Skills */}
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">
                          Offers ({student.offeredSkills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {student.offeredSkills?.map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-bg-card border border-border text-text-muted"
                            >
                              {s.name} <span className="font-semibold text-text-main">L{s.level}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-text-muted block mb-1">
                          Seeks ({student.desiredSkills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {student.desiredSkills?.map((d, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-bg-card border border-border text-text-muted"
                            >
                              {d.name} <span className="font-semibold text-text-main">L{d.targetLevel}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Schedule Windows */}
                    {student.timeSlots && student.timeSlots.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-border/40">
                        <span className="text-[10px] uppercase tracking-wider text-text-muted block">
                          Available Windows ({student.timeSlots.length})
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {student.timeSlots.slice(0, 4).map((slot) => (
                            <span
                              key={slot}
                              className="px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-muted"
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

                    {/* Factor Breakdown */}
                    <FactorBreakdown factors={rec.factors} />

                    {/* Grounded Explanations */}
                    <WhyThisMatch reasons={rec.reasons} />
                  </div>

                  {/* Card Safe Footer */}
                  <div className="pt-3 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Verified Bilateral Reciprocal Match</span>
                    </span>
                    <span className="text-[10px]">Skill exchange candidate</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* SkillSwap Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
            <span>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalRecommendations} reciprocal partners)
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
    </div>
  );
}

export default SkillSwapPage;
