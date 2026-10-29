import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Code2,
  Calendar,
  Target,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Eye,
  RefreshCw,
  Lock,
  Unlock,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  Briefcase,
  Layers,
  GraduationCap,
  Sparkles,
  Send,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  getProfile,
  getProjects,
  getMyProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectRecommendations,
  getSentCollaborationRequests,
} from '../api/client';
import { SendCollaborationRequestModal } from '../components/matching/SendCollaborationRequestModal';
import { FactorBreakdown } from '../components/matching/FactorBreakdown';
import { WhyThisMatch } from '../components/matching/WhyThisMatch';
import { IncompleteProfileBanner } from '../components/matching/IncompleteProfileBanner';
import { getScoreTier, formatTimeSlot } from '../utils/matchingHelpers';
import { useAuth } from '../context/AuthContext';

const COMMON_TIME_SLOTS = [
  { id: 'mon_morning', label: 'Mon Morning' },
  { id: 'mon_afternoon', label: 'Mon Afternoon' },
  { id: 'mon_evening', label: 'Mon Evening' },
  { id: 'tue_morning', label: 'Tue Morning' },
  { id: 'tue_afternoon', label: 'Tue Afternoon' },
  { id: 'tue_evening', label: 'Tue Evening' },
  { id: 'wed_morning', label: 'Wed Morning' },
  { id: 'wed_afternoon', label: 'Wed Afternoon' },
  { id: 'wed_evening', label: 'Wed Evening' },
  { id: 'thu_morning', label: 'Thu Morning' },
  { id: 'thu_afternoon', label: 'Thu Afternoon' },
  { id: 'thu_evening', label: 'Thu Evening' },
  { id: 'fri_morning', label: 'Fri Morning' },
  { id: 'fri_afternoon', label: 'Fri Afternoon' },
  { id: 'fri_evening', label: 'Fri Evening' },
  { id: 'sat_morning', label: 'Sat Morning' },
  { id: 'sat_afternoon', label: 'Sat Afternoon' },
  { id: 'sat_evening', label: 'Sat Evening' },
  { id: 'sun_morning', label: 'Sun Morning' },
  { id: 'sun_afternoon', label: 'Sun Afternoon' },
  { id: 'sun_evening', label: 'Sun Evening' },
];

const WORKING_STYLE_OPTIONS = [
  {
    value: 'synchronous',
    label: 'Synchronous',
    desc: 'Real-time pair programming, live meetings, and immediate collaboration',
  },
  {
    value: 'asynchronous',
    label: 'Asynchronous',
    desc: 'Independent task ownership, GitHub PRs, and written async updates',
  },
  {
    value: 'mixed',
    label: 'Mixed / Hybrid',
    desc: 'Balanced checkpoints with flexible autonomous work',
  },
];

const PROFICIENCY_LABELS = {
  1: 'Novice (1)',
  2: 'Beginner (2)',
  3: 'Intermediate (3)',
  4: 'Advanced (4)',
  5: 'Expert (5)',
};

const SUGGESTED_GOALS = [
  'portfolio',
  'capstone',
  'hackathon',
  'research_paper',
  'open_source',
  'startup_mvp',
  'course_assignment',
];

const SUGGESTED_TIMELINES = [
  'Spring 2026 semester',
  'Full Academic Year',
  '3-4 Months',
  'Sprint (2-4 Weeks)',
  'Flexible / Ongoing',
];

const LEARNING_STYLE_OPTIONS = [
  { value: 'visual', label: 'Visual (Diagrams & Architecture)' },
  { value: 'reading', label: 'Reading / Writing (Specs & Documentation)' },
  { value: 'hands_on', label: 'Hands-on (Interactive Prototyping)' },
  { value: 'discussion', label: 'Discussion (Brainstorming & Pairing)' },
  { value: 'mixed', label: 'Mixed / Flexible' },
];

export function ProjectsPage() {
  const { user } = useAuth();

  // 1. Live Profile Matching Context
  const [profile, setProfile] = useState(null);
  const [completeness, setCompleteness] = useState(null);

  // 2. Active Tab: 'recommended' | 'browse' | 'mine' | 'create'
  const [activeTab, setActiveTab] = useState('recommended');

  // 2b. Recommended Projects State (Phase 6B)
  const [recommendedProjects, setRecommendedProjects] = useState([]);
  const [recPagination, setRecPagination] = useState({
    page: 1,
    limit: 6,
    totalRecommendations: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [recError, setRecError] = useState(null);
  const [recCompleteness, setRecCompleteness] = useState(null);

  // 2c. Collaboration Request State (Phase 7)
  const [sentRequestProjectIds, setSentRequestProjectIds] = useState(new Set());
  const [collabModalTarget, setCollabModalTarget] = useState(null);

  useEffect(() => {
    if (user) {
      getSentCollaborationRequests({ status: 'pending' })
        .then((res) => {
          if (res?.requests) {
            const ids = new Set(
              res.requests
                .filter((r) => r.mode === 'project' && r.projectId)
                .map((r) =>
                  typeof r.projectId === 'object'
                    ? r.projectId.id || r.projectId._id
                    : r.projectId
                )
            );
            setSentRequestProjectIds(ids);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // 3. Open Projects State
  const [openProjects, setOpenProjects] = useState([]);
  const [openPagination, setOpenPagination] = useState({
    page: 1,
    limit: 6,
    totalProjects: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loadingOpen, setLoadingOpen] = useState(true);
  const [openError, setOpenError] = useState(null);

  // 4. My Projects State
  const [myProjects, setMyProjects] = useState([]);
  const [myPagination, setMyPagination] = useState({
    page: 1,
    limit: 6,
    totalProjects: 0,
    totalPages: 1,
    hasMore: false,
  });
  const [loadingMy, setLoadingMy] = useState(true);
  const [myError, setMyError] = useState(null);

  // 5. Create Form State
  const [createTitle, setCreateTitle] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createSkills, setCreateSkills] = useState([{ name: '', minLevel: 3 }]);
  const [createTimeSlots, setCreateTimeSlots] = useState([]);
  const [createGoals, setCreateGoals] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [createTimeline, setCreateTimeline] = useState('Spring 2026 semester');
  const [createWorkingStyle, setCreateWorkingStyle] = useState('mixed');
  const [createRelevantSubjects, setCreateRelevantSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState('');
  const [createPreferredLearningStyle, setCreatePreferredLearningStyle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);

  // 6. Project Detail Modal State
  const [selectedProject, setSelectedProject] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // 7. Edit Modal State
  const [editingProject, setEditingProject] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSkills, setEditSkills] = useState([]);
  const [editTimeSlots, setEditTimeSlots] = useState([]);
  const [editGoals, setEditGoals] = useState([]);
  const [editGoalInput, setEditGoalInput] = useState('');
  const [editTimeline, setEditTimeline] = useState('');
  const [editWorkingStyle, setEditWorkingStyle] = useState('mixed');
  const [editStatus, setEditStatus] = useState('open');
  const [editRelevantSubjects, setEditRelevantSubjects] = useState([]);
  const [editSubjectInput, setEditSubjectInput] = useState('');
  const [editPreferredLearningStyle, setEditPreferredLearningStyle] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState(null);

  // 8. Delete Confirmation Modal State
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // Load live student profile inputs
  useEffect(() => {
    let isMounted = true;
    async function loadProfileData() {
      try {
        const res = await getProfile();
        if (isMounted) {
          setProfile(res.profile);
          setCompleteness(res.completeness);
        }
      } catch {
        // Fallback: profile unconfigured
      }
    }
    loadProfileData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Recommended Projects (Phase 6B)
  const fetchRecommendedProjects = useCallback(async (page = 1) => {
    try {
      setLoadingRecs(true);
      setRecError(null);
      const res = await getProjectRecommendations({ page, limit: 6 });
      setRecommendedProjects(res.recommendations || []);
      setRecCompleteness(res.completeness || null);
      setRecPagination(
        res.pagination || { page: 1, limit: 6, totalRecommendations: 0, totalPages: 1, hasMore: false }
      );
    } catch (err) {
      setRecError(err.message || 'Failed to load project recommendations');
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  // Fetch Open Projects
  const fetchOpenProjects = useCallback(async (page = 1) => {
    try {
      setLoadingOpen(true);
      setOpenError(null);
      const res = await getProjects({ page, limit: 6 });
      setOpenProjects(res.projects || []);
      setOpenPagination(res.pagination || { page: 1, limit: 6, totalProjects: 0, totalPages: 1, hasMore: false });
    } catch (err) {
      setOpenError(err.message || 'Failed to load open projects');
    } finally {
      setLoadingOpen(false);
    }
  }, []);

  // Fetch My Projects
  const fetchMyProjects = useCallback(async (page = 1) => {
    try {
      setLoadingMy(true);
      setMyError(null);
      const res = await getMyProjects({ page, limit: 6 });
      setMyProjects(res.projects || []);
      setMyPagination(res.pagination || { page: 1, limit: 6, totalProjects: 0, totalPages: 1, hasMore: false });
    } catch (err) {
      setMyError(err.message || 'Failed to load your projects');
    } finally {
      setLoadingMy(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchRecommendedProjects(1);
    fetchOpenProjects(1);
    fetchMyProjects(1);
  }, [fetchRecommendedProjects, fetchOpenProjects, fetchMyProjects]);

  // Handle escape key to dismiss modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedProject(null);
        setEditingProject(null);
        setProjectToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Open Project Details modal
  const handleOpenDetails = async (projectId) => {
    try {
      setLoadingDetail(true);
      setDetailError(null);
      const res = await getProject(projectId);
      setSelectedProject(res.project);
    } catch (err) {
      setDetailError(err.message || 'Failed to load project details');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Open Edit Modal with prefilled project data
  const handleStartEdit = (proj) => {
    setEditingProject(proj);
    setEditTitle(proj.title || '');
    setEditDesc(proj.description || '');
    setEditSkills(
      Array.isArray(proj.requiredSkills) && proj.requiredSkills.length > 0
        ? proj.requiredSkills.map((s) => ({ name: s.name, minLevel: s.minLevel }))
        : [{ name: '', minLevel: 3 }]
    );
    setEditTimeSlots(Array.isArray(proj.timeSlots) ? [...proj.timeSlots] : []);
    setEditGoals(Array.isArray(proj.goals) ? [...proj.goals] : []);
    setEditGoalInput('');
    setEditTimeline(proj.timeline || '');
    setEditWorkingStyle(proj.workingStyle || 'mixed');
    setEditStatus(proj.status || 'open');
    setEditRelevantSubjects(Array.isArray(proj.relevantSubjects) ? [...proj.relevantSubjects] : []);
    setEditSubjectInput('');
    setEditPreferredLearningStyle(proj.preferredLearningStyle || '');
    setEditError(null);
  };

  // Submit Project Creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Frontend validation
    const trimmedTitle = createTitle.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 100) {
      setFormError('Project title must be between 5 and 100 characters.');
      return;
    }

    const trimmedDesc = createDesc.trim();
    if (trimmedDesc.length < 20 || trimmedDesc.length > 2000) {
      setFormError('Project description must be between 20 and 2000 characters.');
      return;
    }

    // Filter valid skills
    const validSkills = createSkills
      .map((s) => ({ name: s.name.trim(), minLevel: Number(s.minLevel) }))
      .filter((s) => s.name.length > 0);

    if (validSkills.length === 0) {
      setFormError('Please specify at least one required skill with proficiency level.');
      return;
    }

    for (const sk of validSkills) {
      if (sk.name.length > 70) {
        setFormError(`Skill name "${sk.name}" exceeds 70 characters.`);
        return;
      }
      if (!Number.isInteger(sk.minLevel) || sk.minLevel < 1 || sk.minLevel > 5) {
        setFormError('Proficiency level must be an integer between 1 and 5.');
        return;
      }
    }

    const trimmedTimeline = createTimeline.trim();
    if (!trimmedTimeline) {
      setFormError('Please declare a project timeline.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: trimmedTitle,
        description: trimmedDesc,
        requiredSkills: validSkills,
        timeSlots: createTimeSlots,
        goals: createGoals,
        timeline: trimmedTimeline,
        workingStyle: createWorkingStyle,
        relevantSubjects: createRelevantSubjects.length > 0 ? createRelevantSubjects : undefined,
        preferredLearningStyle: createPreferredLearningStyle || undefined,
      };

      const res = await createProject(payload);
      setFormSuccess(`Project "${res.project.title}" created successfully!`);

      // Reset form
      setCreateTitle('');
      setCreateDesc('');
      setCreateSkills([{ name: '', minLevel: 3 }]);
      setCreateTimeSlots([]);
      setCreateGoals([]);
      setGoalInput('');
      setCreateTimeline('Spring 2026 semester');
      setCreateWorkingStyle('mixed');
      setCreateRelevantSubjects([]);
      setSubjectInput('');
      setCreatePreferredLearningStyle('');

      // Refresh listings and switch to My Projects
      await fetchOpenProjects(1);
      await fetchMyProjects(1);
      setTimeout(() => {
        setActiveTab('mine');
        setFormSuccess(null);
      }, 1200);
    } catch (err) {
      setFormError(err.message || 'Failed to create project. Please review your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Project Update
  const handleUpdateProject = async (e) => {
    e.preventDefault();
    if (!editingProject) return;
    setEditError(null);

    const trimmedTitle = editTitle.trim();
    if (trimmedTitle.length < 5 || trimmedTitle.length > 100) {
      setEditError('Project title must be between 5 and 100 characters.');
      return;
    }

    const trimmedDesc = editDesc.trim();
    if (trimmedDesc.length < 20 || trimmedDesc.length > 2000) {
      setEditError('Project description must be between 20 and 2000 characters.');
      return;
    }

    const validSkills = editSkills
      .map((s) => ({ name: s.name.trim(), minLevel: Number(s.minLevel) }))
      .filter((s) => s.name.length > 0);

    for (const sk of validSkills) {
      if (sk.name.length > 70) {
        setEditError(`Skill name "${sk.name}" exceeds 70 characters.`);
        return;
      }
      if (!Number.isInteger(sk.minLevel) || sk.minLevel < 1 || sk.minLevel > 5) {
        setEditError('Proficiency level must be an integer between 1 and 5.');
        return;
      }
    }

    try {
      setIsUpdating(true);
      const payload = {
        title: trimmedTitle,
        description: trimmedDesc,
        requiredSkills: validSkills,
        timeSlots: editTimeSlots,
        goals: editGoals,
        timeline: editTimeline.trim(),
        workingStyle: editWorkingStyle,
        status: editStatus,
        relevantSubjects: editRelevantSubjects,
        preferredLearningStyle: editPreferredLearningStyle || undefined,
      };

      const res = await updateProject(editingProject.id, payload);

      // Update in-memory lists
      setOpenProjects((prev) =>
        prev
          .map((p) => (p.id === res.project.id ? res.project : p))
          .filter((p) => p.status === 'open')
      );
      setMyProjects((prev) =>
        prev.map((p) => (p.id === res.project.id ? res.project : p))
      );

      if (selectedProject?.id === res.project.id) {
        setSelectedProject(res.project);
      }

      setEditingProject(null);
      await fetchOpenProjects(openPagination.page);
      await fetchMyProjects(myPagination.page);
    } catch (err) {
      setEditError(err.message || 'Failed to update project.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Quick Status Toggle (Open/Close)
  const handleToggleStatus = async (proj) => {
    const nextStatus = proj.status === 'open' ? 'closed' : 'open';
    try {
      const res = await updateProject(proj.id, { status: nextStatus });
      setMyProjects((prev) =>
        prev.map((p) => (p.id === res.project.id ? res.project : p))
      );
      if (selectedProject?.id === res.project.id) {
        setSelectedProject(res.project);
      }
      await fetchOpenProjects(openPagination.page);
      await fetchMyProjects(myPagination.page);
    } catch (err) {
      alert(err.message || 'Failed to update project status.');
    }
  };

  // Confirm Delete Project
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      await deleteProject(projectToDelete.id);

      setOpenProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setMyProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));

      if (selectedProject?.id === projectToDelete.id) {
        setSelectedProject(null);
      }
      setProjectToDelete(null);

      await fetchOpenProjects(1);
      await fetchMyProjects(1);
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete project.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. PAGE HEADER */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
            Project Collaboration
          </span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
          Project Teammates & Capstones
        </h1>
        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Create student projects, browse open collaboration opportunities, and manage project technical requirements, schedules, and team commitments.
        </p>
      </section>

      {/* 2. YOUR PROJECT MATCHING INPUTS (Live Profile Context) */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Factor 1: Skills Alignment (30%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Skills (30%)
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

          {/* Factor 2: Goals Alignment (20%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Goals (20%)
              </span>
              <Target className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.timeline ? profile.timeline.replace(/_/g, ' ') : 'Timeline not set'}
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.goals && profile.goals.length > 0
                  ? `Goals: ${profile.goals.map((g) => g.replace(/_/g, ' ')).join(', ')}`
                  : 'No project goals declared'}
              </p>
              <p className="text-[10px] text-text-muted pt-0.5">
                Goal focus similarity (60%) and timeline compatibility (40%)
              </p>
            </div>
          </Card>

          {/* Factor 3: Relevant Project Experience (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Experience (15%)
              </span>
              <Briefcase className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.previousProjects?.length || 0} Past Projects
              </span>
              <p className="text-[11px] text-text-muted">
                {profile?.previousProjects?.length
                  ? `${profile.previousProjects.length} completed project(s) backing technical competencies`
                  : 'No past projects declared (0% experience score)'}
              </p>
            </div>
          </Card>

          {/* Factor 4: Academic Relevance (15%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Academic Fit (15%)
              </span>
              <GraduationCap className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.academicBackground?.degree || profile?.academicBackground?.branch || 'Academic Profile'}
              </span>
              <p className="text-[11px] text-text-muted line-clamp-2">
                {profile?.academicBackground?.relevantSubjects?.length
                  ? `Coursework: ${profile.academicBackground.relevantSubjects.join(', ')}`
                  : 'Never penalizes projects without academic prerequisites'}
              </p>
            </div>
          </Card>

          {/* Factor 5: Availability Compatibility (10%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Availability (10%)
              </span>
              <Calendar className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block">
                {profile?.timeSlots?.length || 0} Time Windows
              </span>
              <p className="text-[11px] text-text-muted">
                {profile?.timeSlots?.length
                  ? `${profile.timeSlots.length} weekly recurring windows`
                  : 'No slots configured'}
              </p>
            </div>
          </Card>

          {/* Factor 6: Learning-Style Compatibility (10%) */}
          <Card className="p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
                Learning Style (10%)
              </span>
              <Sparkles className="w-3.5 h-3.5 text-accent" />
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium text-text-main block capitalize">
                {profile?.learningStyle ? profile.learningStyle.replace(/_/g, ' ') : 'Hands on'}
              </span>
              <p className="text-[11px] text-text-muted">
                Student learning preference alignment with project collaboration style
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. WORKSPACE TABS */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('recommended')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'recommended'
                  ? 'bg-primary text-bg-page dark:bg-accent dark:text-primary font-semibold'
                  : 'text-text-muted hover:text-text-main hover:bg-bg-section'
              }`}
            >
              Recommended for You ({recPagination.totalRecommendations})
            </button>
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'browse'
                  ? 'bg-primary text-bg-page dark:bg-accent dark:text-primary font-semibold'
                  : 'text-text-muted hover:text-text-main hover:bg-bg-section'
              }`}
            >
              Browse Open Projects ({openPagination.totalProjects})
            </button>
            <button
              onClick={() => setActiveTab('mine')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'mine'
                  ? 'bg-primary text-bg-page dark:bg-accent dark:text-primary font-semibold'
                  : 'text-text-muted hover:text-text-main hover:bg-bg-section'
              }`}
            >
              My Projects ({myPagination.totalProjects})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={activeTab === 'create' ? 'primary' : 'outline'}
              onClick={() => setActiveTab('create')}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Post New Project</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (activeTab === 'recommended') fetchRecommendedProjects(recPagination.page);
                if (activeTab === 'browse') fetchOpenProjects(openPagination.page);
                if (activeTab === 'mine') fetchMyProjects(myPagination.page);
              }}
              title="Refresh project listings"
              className="px-2.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 0: RECOMMENDED FOR YOU (Phase 6B)                                   */}
        {/* ========================================================================= */}
        {activeTab === 'recommended' && (
          <div className="space-y-6">
            {recError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{recError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => fetchRecommendedProjects(recPagination.page)}>
                  Retry
                </Button>
              </div>
            )}

            {recCompleteness && !recCompleteness.isComplete ? (
              <IncompleteProfileBanner
                trackName="Project Recommendations"
                missingFields={recCompleteness.missingFields}
              />
            ) : loadingRecs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="p-5 space-y-4 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-border/50 rounded w-1/2" />
                      <div className="h-5 bg-border/40 rounded w-20" />
                    </div>
                    <div className="h-12 bg-border/30 rounded" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-border/40 rounded w-16" />
                      <div className="h-5 bg-border/40 rounded w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : recommendedProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed space-y-4">
                <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
                  <Sparkles className="w-6 h-6 text-text-amber" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    No Matching Projects Found
                  </h3>
                  <p className="text-xs text-text-muted">
                    No open collaboration projects currently match your declared technical skills, timeline, and schedule.
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchRecommendedProjects(1)}
                    className="inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setActiveTab('browse')}
                  >
                    Browse All Open Projects
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommendedProjects.map((rec) => {
                  const proj = rec.project;
                  const tier = getScoreTier(rec.score);
                  return (
                    <Card
                      key={proj.id}
                      className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-accent"
                    >
                      <div className="space-y-3">
                        {/* Title & Score Pill */}
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-serif text-base font-medium text-text-main line-clamp-1">
                              {proj.title}
                            </h3>
                            <span
                              className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border ${tier.badgeClass}`}
                            >
                              {rec.score}% Match · {tier.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-text-muted">
                            Posted by <span className="text-text-main font-medium">{proj.owner?.name || 'Project Owner'}</span>
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                          {proj.description}
                        </p>

                        {/* Required Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted block">
                            Required Technical Skills ({proj.requiredSkills?.length || 0})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {proj.requiredSkills && proj.requiredSkills.length > 0 ? (
                              proj.requiredSkills.map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-main font-medium"
                                >
                                  <span>{sk.name}</span>
                                  <span className="text-text-amber font-semibold">
                                    L{sk.minLevel}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-text-muted italic">None declared</span>
                            )}
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
                          <div>
                            <span className="font-medium text-text-main">Timeline:</span> {proj.timeline}
                          </div>
                          <div>
                            <span className="font-medium text-text-main">Working Style:</span>{' '}
                            <span className="capitalize">{proj.workingStyle}</span>
                          </div>
                          {proj.preferredLearningStyle && (
                            <div>
                              <span className="font-medium text-text-main">Learning Style:</span>{' '}
                              <span className="capitalize">{proj.preferredLearningStyle.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                          {proj.relevantSubjects && proj.relevantSubjects.length > 0 && (
                            <div className="col-span-2">
                              <span className="font-medium text-text-main">Relevant Coursework:</span>{' '}
                              <span>{proj.relevantSubjects.join(', ')}</span>
                            </div>
                          )}
                        </div>

                        {/* Factor breakdown */}
                        <FactorBreakdown factors={rec.factors} />

                        {/* Why this match? */}
                        <WhyThisMatch reasons={rec.reasons} />
                      </div>

                      {/* Card Action */}
                      <div className="pt-3 border-t border-border flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetails(proj.id)}
                          className="text-xs inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                        </Button>

                        {sentRequestProjectIds.has(proj.id) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            <Clock className="w-3 h-3" />
                            <span>Request Pending</span>
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() =>
                              setCollabModalTarget({
                                projectId: proj.id,
                                projectTitle: proj.title,
                                ownerName: proj.owner?.name,
                                score: rec.score,
                              })
                            }
                            className="text-xs inline-flex items-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Request to Collaborate</span>
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Recommendations Pagination */}
            {recPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
                <span>
                  Showing page {recPagination.page} of {recPagination.totalPages} ({recPagination.totalRecommendations} recommendations)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={recPagination.page <= 1}
                    onClick={() => fetchRecommendedProjects(recPagination.page - 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!recPagination.hasMore}
                    onClick={() => fetchRecommendedProjects(recPagination.page + 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW A: BROWSE OPEN PROJECTS                                             */}
        {/* ========================================================================= */}
        {activeTab === 'browse' && (
          <div className="space-y-6">
            {openError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{openError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => fetchOpenProjects(openPagination.page)}>
                  Retry
                </Button>
              </div>
            )}

            {loadingOpen ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <Card key={n} className="p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-border/50 rounded w-2/3" />
                    <div className="h-12 bg-border/30 rounded" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-border/40 rounded w-16" />
                      <div className="h-5 bg-border/40 rounded w-20" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : openProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed space-y-4">
                <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    No Open Projects Available
                  </h3>
                  <p className="text-xs text-text-muted">
                    There are currently no open student projects. Post the first project to start building your team!
                  </p>
                </div>
                <Button size="sm" onClick={() => setActiveTab('create')} className="inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Post a Project</span>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openProjects.map((proj) => {
                  const isOwner = user?.id && proj.ownerId && user.id === proj.ownerId;
                  return (
                    <Card
                      key={proj.id}
                      className="p-5 flex flex-col justify-between space-y-4 hover:border-accent/40 transition-colors"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-serif text-base font-medium text-text-main line-clamp-1">
                            {proj.title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isOwner && (
                              <Badge variant="outline" className="text-[10px] border-accent/60 text-text-amber">
                                Yours
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                proj.status === 'open'
                                  ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                                  : 'border-border text-text-muted'
                              }`}
                            >
                              {proj.status}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                          {proj.description}
                        </p>

                        {/* Required Skills */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted block">
                            Required Skills
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {proj.requiredSkills && proj.requiredSkills.length > 0 ? (
                              proj.requiredSkills.map((sk, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-main font-medium"
                                >
                                  <span>{sk.name}</span>
                                  <span className="text-text-amber font-semibold">
                                    L{sk.minLevel}
                                  </span>
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-text-muted italic">None declared</span>
                            )}
                          </div>
                        </div>

                        {/* Metadata row */}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
                          <div>
                            <span className="font-medium text-text-main">Timeline:</span>{' '}
                            <span>{proj.timeline}</span>
                          </div>
                          <div>
                            <span className="font-medium text-text-main">Style:</span>{' '}
                            <span className="capitalize">{proj.workingStyle}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="pt-3 border-t border-border flex items-center justify-between">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenDetails(proj.id)}
                          className="text-xs inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </Button>

                        {isOwner && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStartEdit(proj)}
                              title="Edit project"
                              className="px-2.5 text-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleStatus(proj)}
                              title={proj.status === 'open' ? 'Close project' : 'Reopen project'}
                              className="px-2.5 text-xs text-text-muted"
                            >
                              {proj.status === 'open' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {openPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
                <span>
                  Showing page {openPagination.page} of {openPagination.totalPages} ({openPagination.totalProjects} open projects)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={openPagination.page <= 1}
                    onClick={() => fetchOpenProjects(openPagination.page - 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!openPagination.hasMore}
                    onClick={() => fetchOpenProjects(openPagination.page + 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW B: MY PROJECTS                                                      */}
        {/* ========================================================================= */}
        {activeTab === 'mine' && (
          <div className="space-y-6">
            {myError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{myError}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => fetchMyProjects(myPagination.page)}>
                  Retry
                </Button>
              </div>
            )}

            {loadingMy ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((n) => (
                  <Card key={n} className="p-5 space-y-4 animate-pulse">
                    <div className="h-4 bg-border/50 rounded w-2/3" />
                    <div className="h-12 bg-border/30 rounded" />
                  </Card>
                ))}
              </div>
            ) : myProjects.length === 0 ? (
              <Card className="p-12 text-center border-dashed space-y-4">
                <div className="w-12 h-12 rounded-full bg-bg-section border border-border flex items-center justify-center mx-auto text-text-muted">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-sm mx-auto">
                  <h3 className="font-serif text-base font-medium text-text-main">
                    You haven't posted any projects yet
                  </h3>
                  <p className="text-xs text-text-muted">
                    Create a project to declare your technical requirements and find student teammates.
                  </p>
                </div>
                <Button size="sm" onClick={() => setActiveTab('create')} className="inline-flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Your First Project</span>
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myProjects.map((proj) => (
                  <Card
                    key={proj.id}
                    className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-accent"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-base font-medium text-text-main line-clamp-1">
                          {proj.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            proj.status === 'open'
                              ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                              : 'border-border text-text-muted'
                          }`}
                        >
                          {proj.status}
                        </Badge>
                      </div>

                      <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                        {proj.description}
                      </p>

                      <div className="space-y-1.5">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted block">
                          Skills Required ({proj.requiredSkills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {proj.requiredSkills?.map((sk, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-main"
                            >
                              <span>{sk.name}</span>
                              <span className="text-text-amber font-semibold">L{sk.minLevel}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-[11px] text-text-muted">
                        <div>
                          <span className="font-medium text-text-main">Timeline:</span> {proj.timeline}
                        </div>
                        <div>
                          <span className="font-medium text-text-main">Style:</span>{' '}
                          <span className="capitalize">{proj.workingStyle}</span>
                        </div>
                      </div>
                    </div>

                    {/* Owner Action Buttons */}
                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetails(proj.id)}
                        className="text-xs inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </Button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(proj)}
                          className="text-xs inline-flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(proj)}
                          className="text-xs inline-flex items-center gap-1 text-text-muted"
                          title={proj.status === 'open' ? 'Close project to new applicants' : 'Reopen project'}
                        >
                          {proj.status === 'open' ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Close</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Reopen</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setProjectToDelete(proj)}
                          className="text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5"
                          title="Delete project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* My Projects Pagination */}
            {myPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-muted">
                <span>
                  Showing page {myPagination.page} of {myPagination.totalPages} ({myPagination.totalProjects} your projects)
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={myPagination.page <= 1}
                    onClick={() => fetchMyProjects(myPagination.page - 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Previous</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!myPagination.hasMore}
                    onClick={() => fetchMyProjects(myPagination.page + 1)}
                    className="inline-flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW C: CREATE PROJECT FORM                                              */}
        {/* ========================================================================= */}
        {activeTab === 'create' && (
          <Card className="p-6 sm:p-8 space-y-6 max-w-3xl mx-auto">
            <div className="space-y-1 border-b border-border pb-4">
              <h2 className="font-serif text-xl font-medium text-text-main">
                Create a New Collaboration Project
              </h2>
              <p className="text-xs text-text-muted leading-relaxed">
                Define your project goals, technical skill requirements, and working preferences so teammates can find you.
              </p>
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-6">
              {/* Title */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="create-title" className="text-xs font-medium text-text-main">
                    Project Title <span className="text-text-amber">*</span>
                  </label>
                  <span className="text-[11px] text-text-muted">{createTitle.length}/100</span>
                </div>
                <Input
                  id="create-title"
                  placeholder="e.g. Distributed Database Consensus Visualizer"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  maxLength={100}
                  required
                />
                <p className="text-[10px] text-text-muted">Must be between 5 and 100 characters.</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="create-desc" className="text-xs font-medium text-text-main">
                    Detailed Project Description <span className="text-text-amber">*</span>
                  </label>
                  <span className="text-[11px] text-text-muted">{createDesc.length}/2000</span>
                </div>
                <textarea
                  id="create-desc"
                  rows={4}
                  placeholder="Explain what problem your project solves, the architectural roadmap, and the specific responsibilities of prospective teammates..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  maxLength={2000}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-card text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent"
                />
                <p className="text-[10px] text-text-muted">Must be between 20 and 2000 characters.</p>
              </div>

              {/* Dynamic Required Skills */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-main">
                    Required Skills & Min Proficiency Levels <span className="text-text-amber">*</span>
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCreateSkills((prev) => [...prev, { name: '', minLevel: 3 }])
                    }
                    className="text-xs py-1 h-7 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Skill</span>
                  </Button>
                </div>

                <div className="space-y-2">
                  {createSkills.map((sk, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Skill (e.g. Go, React, PyTorch)"
                        value={sk.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCreateSkills((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, name: val } : s))
                          );
                        }}
                        className="flex-1"
                      />
                      <select
                        value={sk.minLevel}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCreateSkills((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, minLevel: val } : s))
                          );
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-border bg-bg-card text-text-main focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {PROFICIENCY_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                      {createSkills.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCreateSkills((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="p-1.5 text-text-muted hover:text-red-500 rounded"
                          title="Remove skill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Working Style */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-main">
                  Preferred Working Style <span className="text-text-amber">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {WORKING_STYLE_OPTIONS.map((style) => (
                    <label
                      key={style.value}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-colors block ${
                        createWorkingStyle === style.value
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-bg-card hover:bg-bg-section'
                      }`}
                    >
                      <input
                        type="radio"
                        name="createWorkingStyle"
                        value={style.value}
                        checked={createWorkingStyle === style.value}
                        onChange={() => setCreateWorkingStyle(style.value)}
                        className="sr-only"
                      />
                      <span className="text-xs font-medium text-text-main block">
                        {style.label}
                      </span>
                      <span className="text-[10px] text-text-muted leading-relaxed block mt-1">
                        {style.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Timeline */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-main">
                  Project Timeline <span className="text-text-amber">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUGGESTED_TIMELINES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCreateTimeline(t)}
                      className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                        createTimeline === t
                          ? 'bg-accent/20 border-accent text-text-main font-medium'
                          : 'bg-bg-section border-border text-text-muted hover:text-text-main'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <Input
                  value={createTimeline}
                  onChange={(e) => setCreateTimeline(e.target.value)}
                  placeholder="e.g. Spring 2026 semester"
                  maxLength={100}
                  required
                />
              </div>

              {/* Optional Relevant Coursework / Subjects */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-main">
                  Relevant Subjects / Coursework <span className="text-[10px] text-text-muted font-normal">(Optional)</span>
                </label>
                <p className="text-[10px] text-text-muted">
                  Add target subjects or course codes to match candidate academic relevance:
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add subject (e.g. Distributed Systems)..."
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const subj = subjectInput.trim();
                        if (subj && !createRelevantSubjects.includes(subj)) {
                          setCreateRelevantSubjects((prev) => [...prev, subj]);
                          setSubjectInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const subj = subjectInput.trim();
                      if (subj && !createRelevantSubjects.includes(subj)) {
                        setCreateRelevantSubjects((prev) => [...prev, subj]);
                        setSubjectInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {createRelevantSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {createRelevantSubjects.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-accent/10 border border-accent/30 text-text-main"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => setCreateRelevantSubjects((prev) => prev.filter((item) => item !== s))}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Learning Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-main">
                  Preferred Learning / Collaboration Style <span className="text-[10px] text-text-muted font-normal">(Optional)</span>
                </label>
                <select
                  value={createPreferredLearningStyle}
                  onChange={(e) => setCreatePreferredLearningStyle(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-md border border-border bg-bg-card text-text-main focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Any / Flexible (No specific preference)</option>
                  {LEARNING_STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Goals */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-main">Project Goals</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {SUGGESTED_GOALS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        if (!createGoals.includes(g)) {
                          setCreateGoals((prev) => [...prev, g]);
                        }
                      }}
                      className="text-[10px] px-2 py-0.5 rounded border border-border bg-bg-section text-text-muted hover:text-text-main"
                    >
                      + {g.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom goal tag..."
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const tag = goalInput.trim().toLowerCase().replace(/\s+/g, '_');
                        if (tag && !createGoals.includes(tag)) {
                          setCreateGoals((prev) => [...prev, tag]);
                          setGoalInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const tag = goalInput.trim().toLowerCase().replace(/\s+/g, '_');
                      if (tag && !createGoals.includes(tag)) {
                        setCreateGoals((prev) => [...prev, tag]);
                        setGoalInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {createGoals.map((g) => (
                    <span
                      key={g}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-accent/10 border border-accent/30 text-text-main"
                    >
                      <span>{g.replace(/_/g, ' ')}</span>
                      <button
                        type="button"
                        onClick={() => setCreateGoals((prev) => prev.filter((item) => item !== g))}
                        className="hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Schedule Windows (Time Slots) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-main">
                    Expected Meeting / Working Windows
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreateTimeSlots([])}
                    className="text-[11px] text-text-muted hover:underline"
                  >
                    Clear All
                  </button>
                </div>
                <p className="text-[10px] text-text-muted">
                  Select common slots when your team coordinates checkpoints:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto p-2 border border-border rounded-md bg-bg-card">
                  {COMMON_TIME_SLOTS.map((slot) => {
                    const isSelected = createTimeSlots.includes(slot.id);
                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => {
                          setCreateTimeSlots((prev) =>
                            isSelected ? prev.filter((s) => s !== slot.id) : [...prev, slot.id]
                          );
                        }}
                        className={`text-[10px] p-1.5 rounded text-left border transition-colors ${
                          isSelected
                            ? 'bg-accent/20 border-accent text-text-main font-medium'
                            : 'bg-bg-section/50 border-border/60 text-text-muted hover:border-border'
                        }`}
                      >
                        {slot.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab('browse')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-1.5">
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Project...</span>
                    </>
                  ) : (
                    <span>Publish Project</span>
                  )}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 5. PROJECT DETAILS MODAL                                                 */}
      {/* ========================================================================= */}
      {selectedProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={`text-[10px] ${
                      selectedProject.status === 'open'
                        ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                        : 'border-border text-text-muted'
                    }`}
                  >
                    {selectedProject.status}
                  </Badge>
                  {user?.id === selectedProject.ownerId && (
                    <Badge variant="outline" className="text-[10px] border-accent/60 text-text-amber">
                      Your Project
                    </Badge>
                  )}
                </div>
                <h2 className="font-serif text-xl font-medium text-text-main">
                  {selectedProject.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-bg-section"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
                Project Overview & Roadmap
              </span>
              <p className="text-xs text-text-main leading-relaxed whitespace-pre-line bg-bg-section/50 p-4 rounded-lg border border-border">
                {selectedProject.description}
              </p>
            </div>

            {/* Required Skills */}
            <div className="space-y-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
                Required Technical Competencies
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedProject.requiredSkills?.map((sk, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg border border-border bg-bg-section flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-text-main">{sk.name}</span>
                    <span className="text-[11px] font-semibold text-text-amber bg-bg-card px-2 py-0.5 rounded border border-border">
                      {PROFICIENCY_LABELS[sk.minLevel] || `Level ${sk.minLevel}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline & Working Style */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border border-border bg-bg-section/40 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted block">Timeline</span>
                <span className="font-medium text-text-main mt-0.5 block">{selectedProject.timeline}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-text-muted block">Working Style</span>
                <span className="font-medium text-text-main capitalize mt-0.5 block">
                  {selectedProject.workingStyle}
                </span>
              </div>
            </div>

            {/* Preferred Learning Style & Relevant Subjects */}
            {(selectedProject.preferredLearningStyle || (selectedProject.relevantSubjects && selectedProject.relevantSubjects.length > 0)) && (
              <div className="space-y-3 p-4 rounded-lg border border-border bg-bg-section/40 text-xs">
                {selectedProject.preferredLearningStyle && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted block">Preferred Learning Style</span>
                    <span className="font-medium text-text-main capitalize mt-0.5 block">
                      {selectedProject.preferredLearningStyle.replace(/_/g, ' ')}
                    </span>
                  </div>
                )}
                {selectedProject.relevantSubjects && selectedProject.relevantSubjects.length > 0 && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-text-muted block">Relevant Coursework / Subjects</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {selectedProject.relevantSubjects.map((subj, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border text-text-main">
                          {subj}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Goals */}
            {selectedProject.goals && selectedProject.goals.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
                  Declared Objectives
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.goals.map((g, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded text-xs bg-accent/10 border border-accent/30 text-text-main"
                    >
                      {g.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slots */}
            {selectedProject.timeSlots && selectedProject.timeSlots.length > 0 && (
              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-text-muted block">
                  Meeting Windows ({selectedProject.timeSlots.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProject.timeSlots.map((slot) => {
                    const label = COMMON_TIME_SLOTS.find((s) => s.id === slot)?.label || slot;
                    return (
                      <span
                        key={slot}
                        className="px-2 py-0.5 rounded text-[10px] bg-bg-section border border-border text-text-muted"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <span className="text-[10px] text-text-muted">
                Created: {new Date(selectedProject.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-2">
                {user?.id === selectedProject.ownerId && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleStartEdit(selectedProject);
                      }}
                      className="text-xs"
                    >
                      Edit Project
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleStatus(selectedProject)}
                      className="text-xs text-text-muted"
                    >
                      {selectedProject.status === 'open' ? 'Close Project' : 'Reopen Project'}
                    </Button>
                  </>
                )}
                {user?.id !== selectedProject.ownerId && selectedProject.status === 'open' && (
                  sentRequestProjectIds.has(selectedProject.id) ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                      <Clock className="w-3 h-3" />
                      <span>Request Pending</span>
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() =>
                        setCollabModalTarget({
                          projectId: selectedProject.id,
                          projectTitle: selectedProject.title,
                          ownerName: selectedProject.owner?.name,
                        })
                      }
                      className="text-xs inline-flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request to Collaborate</span>
                    </Button>
                  )
                )}
                <Button
                  size="sm"
                  onClick={() => setSelectedProject(null)}
                  className="text-xs"
                  aria-label="Close dialog"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collaboration Request Modal (Phase 7) */}
      <SendCollaborationRequestModal
        isOpen={Boolean(collabModalTarget)}
        onClose={() => setCollabModalTarget(null)}
        onSuccess={(newReq) => {
          if (newReq?.projectId) {
            setSentRequestProjectIds((prev) => new Set([...prev, newReq.projectId]));
          }
        }}
        mode="project"
        target={collabModalTarget}
      />

      {/* ========================================================================= */}
      {/* 6. EDIT PROJECT MODAL                                                    */}
      {/* ========================================================================= */}
      {editingProject && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setEditingProject(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border pb-4">
              <div className="space-y-1">
                <h2 className="font-serif text-xl font-medium text-text-main">Edit Project</h2>
                <p className="text-xs text-text-muted">Update requirements and availability for prospective teammates.</p>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                aria-label="Close dialog"
                className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-bg-section"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 flex items-center gap-2 text-red-700 dark:text-red-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProject} className="space-y-5">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-main">Project Status</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-text-main cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="open"
                      checked={editStatus === 'open'}
                      onChange={() => setEditStatus('open')}
                    />
                    <span>Open (Accepting Teammates)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-text-main cursor-pointer">
                    <input
                      type="radio"
                      name="editStatus"
                      value="closed"
                      checked={editStatus === 'closed'}
                      onChange={() => setEditStatus('closed')}
                    />
                    <span>Closed (Filled / Archived)</span>
                  </label>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-main">Title (5-100 characters)</label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={100}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-main">
                  Description (20-2000 characters)
                </label>
                <textarea
                  rows={4}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  maxLength={2000}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-border bg-bg-card text-text-main placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-text-main">Required Skills</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setEditSkills((prev) => [...prev, { name: '', minLevel: 3 }])
                    }
                    className="text-xs py-1 h-7 inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Skill</span>
                  </Button>
                </div>
                <div className="space-y-2">
                  {editSkills.map((sk, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Skill name"
                        value={sk.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditSkills((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, name: val } : s))
                          );
                        }}
                        className="flex-1"
                      />
                      <select
                        value={sk.minLevel}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditSkills((prev) =>
                            prev.map((s, i) => (i === index ? { ...s, minLevel: val } : s))
                          );
                        }}
                        className="px-2.5 py-1.5 text-xs rounded-md border border-border bg-bg-card text-text-main focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {PROFICIENCY_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setEditSkills((prev) => prev.filter((_, i) => i !== index))
                        }
                        className="p-1.5 text-text-muted hover:text-red-500 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline & Working Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-main">Timeline</label>
                  <Input
                    value={editTimeline}
                    onChange={(e) => setEditTimeline(e.target.value)}
                    placeholder="e.g. 4 Months"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-text-main">Working Style</label>
                  <select
                    value={editWorkingStyle}
                    onChange={(e) => setEditWorkingStyle(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs rounded-md border border-border bg-bg-card text-text-main focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="synchronous">Synchronous (Live meetings / pairing)</option>
                    <option value="asynchronous">Asynchronous (Task-based / async PRs)</option>
                    <option value="mixed">Mixed (Hybrid checkpoints)</option>
                  </select>
                </div>
              </div>

              {/* Optional Relevant Subjects */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-text-main">
                  Relevant Subjects / Coursework <span className="text-[10px] text-text-muted font-normal">(Optional)</span>
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add subject (e.g. Distributed Systems)..."
                    value={editSubjectInput}
                    onChange={(e) => setEditSubjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const subj = editSubjectInput.trim();
                        if (subj && !editRelevantSubjects.includes(subj)) {
                          setEditRelevantSubjects((prev) => [...prev, subj]);
                          setEditSubjectInput('');
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const subj = editSubjectInput.trim();
                      if (subj && !editRelevantSubjects.includes(subj)) {
                        setEditRelevantSubjects((prev) => [...prev, subj]);
                        setEditSubjectInput('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                {editRelevantSubjects.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editRelevantSubjects.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-accent/10 border border-accent/30 text-text-main"
                      >
                        <span>{s}</span>
                        <button
                          type="button"
                          onClick={() => setEditRelevantSubjects((prev) => prev.filter((item) => item !== s))}
                          className="hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Learning Style */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-main">
                  Preferred Learning Style <span className="text-[10px] text-text-muted font-normal">(Optional)</span>
                </label>
                <select
                  value={editPreferredLearningStyle}
                  onChange={(e) => setEditPreferredLearningStyle(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs rounded-md border border-border bg-bg-card text-text-main focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Any / Flexible (No specific preference)</option>
                  {LEARNING_STYLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingProject(null)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating} className="inline-flex items-center gap-1.5">
                  {isUpdating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. DELETE CONFIRMATION MODAL                                             */}
      {/* ========================================================================= */}
      {projectToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
          onClick={() => setProjectToDelete(null)}
        >
          <div
            className="bg-bg-card border border-border rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h3 className="font-serif text-lg font-medium text-text-main">Confirm Project Deletion</h3>
            </div>

            <p className="text-xs text-text-muted leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-text-main">"{projectToDelete.title}"</span>? This action is permanent and cannot be undone.
            </p>

            {deleteError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-3 text-red-700 dark:text-red-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setProjectToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? 'Deleting...' : 'Delete Project'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
