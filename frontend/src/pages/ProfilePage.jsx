import React, { useState, useEffect } from 'react';
import {
  User,
  BookOpen,
  ArrowLeftRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Sparkles,
  HelpCircle,
  GraduationCap,
  Award,
  FolderGit2,
  Lightbulb,
  MessageSquare,
  X,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getProfile, updateProfile } from '../api/client';

const COMMON_TIME_SLOTS = [
  'mon_morning',
  'mon_afternoon',
  'mon_evening',
  'tue_morning',
  'tue_afternoon',
  'tue_evening',
  'wed_morning',
  'wed_afternoon',
  'wed_evening',
  'thu_morning',
  'thu_afternoon',
  'thu_evening',
  'fri_morning',
  'fri_afternoon',
  'fri_evening',
  'sat_morning',
  'sat_afternoon',
  'sat_evening',
  'sun_morning',
  'sun_afternoon',
  'sun_evening',
];

const WORKING_STYLE_OPTIONS = [
  { value: 'synchronous', label: 'Synchronous', desc: 'Real-time meetings, live pairing, and immediate collaboration' },
  { value: 'asynchronous', label: 'Asynchronous', desc: 'Independent tasks, written updates, and self-scheduled milestones' },
  { value: 'mixed', label: 'Mixed / Hybrid', desc: 'Balance of scheduled checkpoints and autonomous work' },
];

const LEARNING_STYLE_OPTIONS = [
  { value: 'visual', label: 'Visual', desc: 'Architecture diagrams, visual flows, conceptual mindmaps, and graphical models' },
  { value: 'reading', label: 'Reading & Writing', desc: 'Technical specifications, documentation, written walkthroughs, and code comments' },
  { value: 'hands_on', label: 'Hands-on Practice', desc: 'Live coding, test-driven implementations, interactive debugging, and code labs' },
  { value: 'discussion', label: 'Discussion & Verbal', desc: 'Pair programming, brainstorming debates, oral design reviews, and study circles' },
  { value: 'mixed', label: 'Mixed / Adaptable', desc: 'Versatile combination of practical exercises, documentation, and verbal syncs' },
];

const GRADE_SCALE_OPTIONS = [
  { value: '', label: 'Not specified (Optional)' },
  { value: 'percentage', label: 'Percentage (0 - 100%)' },
  { value: 'gpa_10', label: 'GPA (Scale of 10.0)' },
  { value: 'gpa_4', label: 'GPA (Scale of 4.0)' },
];

const TIMELINE_OPTIONS = [
  { value: 'short_term', label: 'Short Term (Sprint / Hackathon)' },
  { value: 'full_semester', label: 'Full Semester (Course project / Capstone)' },
  { value: 'flexible', label: 'Flexible / Ongoing' },
];

const PROFICIENCY_LABELS = {
  1: 'Novice (1)',
  2: 'Beginner (2)',
  3: 'Intermediate (3)',
  4: 'Advanced (4)',
  5: 'Expert (5)',
};

export function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [completeness, setCompleteness] = useState(null);

  // General & Technical Skills
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [timeline, setTimeline] = useState('full_semester');
  const [workingStyle, setWorkingStyle] = useState('mixed');

  // Academic Background
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('3');
  const [semester, setSemester] = useState('5');
  const [relevantSubjects, setRelevantSubjects] = useState([]);
  const [subjectInput, setSubjectInput] = useState('');

  // Academic Performance (Optional)
  const [performanceScale, setPerformanceScale] = useState('');
  const [performanceScore, setPerformanceScore] = useState('');

  // Learning Style
  const [learningStyle, setLearningStyle] = useState('hands_on');

  // Study Squad Preferences
  const [courseCode, setCourseCode] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicInput, setTopicInput] = useState('');
  const [learningPreferences, setLearningPreferences] = useState([]);
  const [prefInput, setPrefInput] = useState('');

  // SkillSwap Preferences
  const [desiredSkills, setDesiredSkills] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState('5');

  // Project Ideas & Portfolio
  const [projectIdeas, setProjectIdeas] = useState([]);
  const [previousProjects, setPreviousProjects] = useState([]);

  // Achievements & Collaboration Preferences
  const [achievements, setAchievements] = useState([]);
  const [achievementInput, setAchievementInput] = useState('');
  const [collaborationPreferences, setCollaborationPreferences] = useState([]);
  const [collabInput, setCollabInput] = useState('');

  // Load existing profile from backend
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setLoadError(null);
        const res = await getProfile();

        if (!isMounted) return;
        const p = res.profile || {};
        setBio(p.bio || '');
        setSkills(Array.isArray(p.skills) ? p.skills : []);
        setTimeSlots(Array.isArray(p.timeSlots) ? p.timeSlots : []);
        setGoals(Array.isArray(p.goals) ? p.goals : []);
        setTimeline(p.timeline || 'full_semester');
        setWorkingStyle(p.workingStyle || 'mixed');

        // Academic background
        const acad = p.academicBackground || {};
        setDegree(acad.degree || '');
        setBranch(acad.branch || '');
        setYearOfStudy(acad.yearOfStudy !== undefined && acad.yearOfStudy !== null ? String(acad.yearOfStudy) : '3');
        setSemester(acad.semester !== undefined && acad.semester !== null ? String(acad.semester) : '5');
        setRelevantSubjects(Array.isArray(acad.relevantSubjects) ? acad.relevantSubjects : []);

        // Academic performance
        const perf = p.academicPerformance || {};
        setPerformanceScale(perf.scale || '');
        setPerformanceScore(perf.score !== undefined && perf.score !== null ? String(perf.score) : '');

        // Learning style
        setLearningStyle(p.learningStyle || 'hands_on');

        // Study squad
        setCourseCode(p.courseCode || '');
        setTopics(Array.isArray(p.topics) ? p.topics : []);
        setLearningPreferences(Array.isArray(p.learningPreferences) ? p.learningPreferences : []);

        // SkillSwap
        setDesiredSkills(Array.isArray(p.desiredSkills) ? p.desiredSkills : []);
        setWeeklyHours(p.weeklyHours !== undefined && p.weeklyHours !== null ? String(p.weeklyHours) : '5');

        // Extended Phase 5D
        setProjectIdeas(Array.isArray(p.projectIdeas) ? p.projectIdeas : []);
        setPreviousProjects(Array.isArray(p.previousProjects) ? p.previousProjects : []);
        setAchievements(Array.isArray(p.achievements) ? p.achievements : []);
        setCollaborationPreferences(Array.isArray(p.collaborationPreferences) ? p.collaborationPreferences : []);

        setCompleteness(res.completeness);
        setIsNewProfile(false);
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 404) {
          // Fresh profile onboarding defaults
          setIsNewProfile(true);
          setSkills([
            { name: 'JavaScript', level: 3 },
            { name: 'React', level: 3 },
          ]);
          setTimeSlots(['mon_afternoon', 'wed_afternoon', 'fri_afternoon']);
          setGoals(['portfolio', 'capstone']);
          setDesiredSkills([{ name: 'Python', targetLevel: 3 }]);
          setDegree('Bachelor of Science / B.Tech');
          setBranch('Computer Science');
          setYearOfStudy('3');
          setSemester('5');
          setRelevantSubjects(['Data Structures', 'Web Development']);
          setLearningStyle('hands_on');
        } else {
          setLoadError(err.message || 'Failed to load profile. Please verify your connection.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  // Skill Handlers
  const handleAddSkill = () => {
    setSkills((prev) => [...prev, { name: '', level: 3 }]);
  };

  const handleUpdateSkill = (index, field, value) => {
    setSkills((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'level' ? Number(value) : value,
      };
      return updated;
    });
  };

  const handleRemoveSkill = (index) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  // Desired Skill Handlers
  const handleAddDesiredSkill = () => {
    setDesiredSkills((prev) => [...prev, { name: '', targetLevel: 3 }]);
  };

  const handleUpdateDesiredSkill = (index, field, value) => {
    setDesiredSkills((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: field === 'targetLevel' ? Number(value) : value,
      };
      return updated;
    });
  };

  const handleRemoveDesiredSkill = (index) => {
    setDesiredSkills((prev) => prev.filter((_, i) => i !== index));
  };

  // Time Slot Toggle
  const handleToggleTimeSlot = (slot) => {
    setTimeSlots((prev) =>
      prev.includes(slot) ? prev.filter((s) => s !== slot) : [...prev, slot]
    );
  };

  // Project Ideas Handlers
  const handleAddProjectIdea = () => {
    setProjectIdeas((prev) => [...prev, { title: '', description: '', tags: [] }]);
  };

  const handleUpdateProjectIdea = (index, field, value) => {
    setProjectIdeas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemoveProjectIdea = (index) => {
    setProjectIdeas((prev) => prev.filter((_, i) => i !== index));
  };

  // Previous Projects Handlers
  const handleAddPreviousProject = () => {
    setPreviousProjects((prev) => [
      ...prev,
      { title: '', role: '', skills: [], domain: [], achievements: '' },
    ]);
  };

  const handleUpdatePreviousProject = (index, field, value) => {
    setPreviousProjects((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleRemovePreviousProject = (index) => {
    setPreviousProjects((prev) => prev.filter((_, i) => i !== index));
  };

  // Tag Adders
  const handleAddTag = (type) => {
    if (type === 'goal' && goalInput.trim()) {
      const clean = goalInput.trim().toLowerCase().replace(/\s+/g, '_');
      if (!goals.includes(clean)) setGoals((prev) => [...prev, clean]);
      setGoalInput('');
    } else if (type === 'topic' && topicInput.trim()) {
      const clean = topicInput.trim().toLowerCase().replace(/\s+/g, '_');
      if (!topics.includes(clean)) setTopics((prev) => [...prev, clean]);
      setTopicInput('');
    } else if (type === 'pref' && prefInput.trim()) {
      const clean = prefInput.trim().toLowerCase().replace(/\s+/g, '_');
      if (!learningPreferences.includes(clean)) setLearningPreferences((prev) => [...prev, clean]);
      setPrefInput('');
    } else if (type === 'subject' && subjectInput.trim()) {
      const clean = subjectInput.trim();
      if (!relevantSubjects.includes(clean)) setRelevantSubjects((prev) => [...prev, clean]);
      setSubjectInput('');
    } else if (type === 'achievement' && achievementInput.trim()) {
      const clean = achievementInput.trim();
      if (!achievements.includes(clean)) setAchievements((prev) => [...prev, clean]);
      setAchievementInput('');
    } else if (type === 'collab' && collabInput.trim()) {
      const clean = collabInput.trim();
      if (!collaborationPreferences.includes(clean)) setCollaborationPreferences((prev) => [...prev, clean]);
      setCollabInput('');
    }
  };

  // Save Profile Handler
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    // Validations
    if (bio && bio.length > 500) {
      setSaveError('Bio cannot exceed 500 characters.');
      setSaving(false);
      return;
    }

    for (let i = 0; i < skills.length; i++) {
      const s = skills[i];
      if (!s.name || !s.name.trim()) {
        setSaveError(`Skill #${i + 1} requires a valid name.`);
        setSaving(false);
        return;
      }
      if (!Number.isInteger(s.level) || s.level < 1 || s.level > 5) {
        setSaveError(`Skill "${s.name}" level must be an integer between 1 and 5.`);
        setSaving(false);
        return;
      }
    }

    for (let i = 0; i < desiredSkills.length; i++) {
      const d = desiredSkills[i];
      if (!d.name || !d.name.trim()) {
        setSaveError(`Desired skill #${i + 1} requires a valid name.`);
        setSaving(false);
        return;
      }
      if (!Number.isInteger(d.targetLevel) || d.targetLevel < 1 || d.targetLevel > 5) {
        setSaveError(`Desired skill "${d.name}" targetLevel must be between 1 and 5.`);
        setSaving(false);
        return;
      }
    }

    const hoursNum = parseFloat(weeklyHours);
    if (isNaN(hoursNum) || hoursNum < 0.5 || hoursNum > 168) {
      setSaveError('Weekly hours must be a number between 0.5 and 168.');
      setSaving(false);
      return;
    }

    // Validate academic performance score if scale is chosen
    if (performanceScale) {
      const scoreVal = parseFloat(performanceScore);
      if (isNaN(scoreVal) || !Number.isFinite(scoreVal)) {
        setSaveError('Please enter a valid numeric academic score or select "Not specified".');
        setSaving(false);
        return;
      }
      if (performanceScale === 'percentage' && (scoreVal < 0 || scoreVal > 100)) {
        setSaveError('Percentage marks must be between 0 and 100.');
        setSaving(false);
        return;
      }
      if (performanceScale === 'gpa_10' && (scoreVal < 0 || scoreVal > 10)) {
        setSaveError('GPA (out of 10.0) must be between 0 and 10.');
        setSaving(false);
        return;
      }
      if (performanceScale === 'gpa_4' && (scoreVal < 0 || scoreVal > 4)) {
        setSaveError('GPA (out of 4.0) must be between 0 and 4.');
        setSaving(false);
        return;
      }
    }

    // Construct clean payload matching schema
    const payload = {
      bio: bio.trim() || undefined,
      skills: skills.map((s) => ({ name: s.name.trim(), level: s.level })),
      timeSlots,
      goals,
      timeline,
      workingStyle,
      learningStyle,
      academicBackground: {
        degree: degree.trim() || undefined,
        branch: branch.trim() || undefined,
        yearOfStudy: yearOfStudy ? parseInt(yearOfStudy, 10) : undefined,
        semester: semester ? parseInt(semester, 10) : undefined,
        relevantSubjects: relevantSubjects.length > 0 ? relevantSubjects : undefined,
      },
      academicPerformance:
        performanceScale && performanceScore !== ''
          ? {
              scale: performanceScale,
              score: parseFloat(performanceScore),
            }
          : null, // explicit null clears academic performance in MongoDB
      courseCode: courseCode.trim() || undefined,
      topics,
      learningPreferences,
      desiredSkills: desiredSkills.map((d) => ({ name: d.name.trim(), targetLevel: d.targetLevel })),
      weeklyHours: hoursNum,
      projectIdeas: projectIdeas
        .map((idea) => ({
          title: idea.title.trim(),
          description: idea.description?.trim() || undefined,
          tags: Array.isArray(idea.tags) && idea.tags.length > 0 ? idea.tags : undefined,
        }))
        .filter((idea) => idea.title.length > 0),
      previousProjects: previousProjects
        .map((proj) => ({
          title: proj.title.trim(),
          skills: Array.isArray(proj.skills) && proj.skills.length > 0 ? proj.skills : undefined,
          domain: Array.isArray(proj.domain) && proj.domain.length > 0 ? proj.domain : undefined,
          role: proj.role?.trim() || undefined,
          achievements: proj.achievements?.trim() || undefined,
        }))
        .filter((proj) => proj.title.length > 0),
      achievements: achievements.length > 0 ? achievements : undefined,
      collaborationPreferences: collaborationPreferences.length > 0 ? collaborationPreferences : undefined,
    };

    try {
      const res = await updateProfile(payload);
      setCompleteness(res.completeness);
      setIsNewProfile(false);
      setSaveSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile. Please check all fields.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-12 text-center text-text-muted space-y-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs">Loading student profile data from SkillSync backend...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-border bg-bg-card p-8 space-y-4 max-w-xl mx-auto text-center">
        <AlertCircle className="w-8 h-8 text-text-amber mx-auto" />
        <h2 className="font-serif text-lg font-medium text-text-main">Unable to Load Profile</h2>
        <p className="text-xs text-text-muted leading-relaxed">{loadError}</p>
        <Button onClick={() => window.location.reload()} size="sm">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. HEADER & EXPLANATION */}
      <section className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-text-amber">
                Self-Service Profile
              </span>
              <Badge variant="outline" className="text-[10px]">
                {isNewProfile ? 'New Profile' : 'Persisted in MongoDB'}
              </Badge>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-text-main">
              Student Profile Configuration
            </h1>
          </div>

          <Button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </Button>
        </div>

        <p className="text-xs text-text-muted leading-relaxed max-w-3xl">
          Configure your technical background, learning style, and collaboration goals. The SkillSync compatibility engine evaluates these exact inputs deterministically across Project, Study Buddy, and SkillSwap modes without guessing or inventing scores.
        </p>
      </section>

      {/* FEEDBACK BANNERS */}
      {saveSuccess && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Profile saved successfully.</span>
            <p className="mt-0.5 text-text-muted">
              Your profile, learning preferences, and mode readiness have been updated in the database.
            </p>
          </div>
        </div>
      )}

      {saveError && (
        <div
          role="alert"
          className="rounded-lg border border-border bg-bg-section p-4 text-xs text-text-main flex items-start gap-2.5"
        >
          <AlertCircle className="w-4 h-4 text-text-amber shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Profile could not be saved:</span>
            <p className="mt-0.5 text-text-muted">{saveError}</p>
          </div>
        </div>
      )}

      {/* 2. MODE READINESS OVERVIEW */}
      <section className="space-y-3">
        <h2 className="font-serif text-base font-medium text-text-main flex items-center gap-2">
          <span>Mode Readiness Summary</span>
          <span className="text-xs text-text-muted font-sans font-normal">
            (Independent Per-Mode Calculation)
          </span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-main">Project Mode</span>
              {completeness?.project?.isComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-amber">Incomplete</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {completeness?.project?.isComplete
                ? 'All required inputs declared.'
                : `Missing: ${completeness?.project?.missingFields?.join(', ') || 'skills, timeSlots, goals, timeline, workingStyle, learningStyle'}`}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-main">Study Squads</span>
              {completeness?.study?.isComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-amber">Incomplete</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {completeness?.study?.isComplete
                ? 'All required inputs declared.'
                : `Missing: ${completeness?.study?.missingFields?.join(', ') || 'courseCode, topics, timeSlots, learningPreferences, learningStyle'}`}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-bg-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-text-main">SkillSwap</span>
              {completeness?.skillswap?.isComplete ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready</span>
                </span>
              ) : (
                <span className="text-[11px] font-medium text-text-amber">Incomplete</span>
              )}
            </div>
            <p className="text-[11px] text-text-muted leading-relaxed">
              {completeness?.skillswap?.isComplete
                ? 'All required inputs declared.'
                : `Missing: ${completeness?.skillswap?.missingFields?.join(', ') || 'skills, desiredSkills, timeSlots, weeklyHours, learningStyle'}`}
            </p>
          </div>
        </div>
      </section>

      {/* 3. PROFILE EDITING FORM */}
      <form id="profile-form" noValidate onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: ACADEMIC BACKGROUND & LEARNING STYLE */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <GraduationCap className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">1. Academic Background & Learning Style</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Your degree program, discipline, active subjects, and cognitive collaboration style.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="degree" className="text-xs font-medium text-text-main">Degree / Program</label>
              <Input
                id="degree"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Tech, B.S., M.S., BCA"
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="branch" className="text-xs font-medium text-text-main">Branch / Discipline</label>
              <Input
                id="branch"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science & Engineering, Data Science"
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="yearOfStudy" className="text-xs font-medium text-text-main">Year of Study</label>
              <select
                id="yearOfStudy"
                value={yearOfStudy}
                onChange={(e) => setYearOfStudy(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="1">1st Year (Freshman)</option>
                <option value="2">2nd Year (Sophomore)</option>
                <option value="3">3rd Year (Junior)</option>
                <option value="4">4th Year (Senior)</option>
                <option value="5">5th Year / Dual Degree</option>
                <option value="6">Graduate / Masters</option>
                <option value="7">Doctoral / PhD</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="semester" className="text-xs font-medium text-text-main">Current Semester</label>
              <select
                id="semester"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {[...Array(10)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>
                    Semester {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Relevant Subjects */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">
              Relevant Academic Subjects & Coursework
            </label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('subject'))}
                  placeholder="e.g. Algorithms, Distributed Systems, Database Systems"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('subject')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Subject
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {relevantSubjects.map((sub, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setRelevantSubjects((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{sub}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
              {relevantSubjects.length === 0 && (
                <span className="text-[11px] text-text-muted italic">No specific coursework added yet.</span>
              )}
            </div>
          </div>

          {/* Academic Performance (Optional) */}
          <div className="rounded-lg border border-border bg-bg-section p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-text-main block">
                  Self-Reported Academic Performance (Optional)
                </span>
                <span className="text-[11px] text-text-muted">
                  Optional self-reported metric. Missing marks are never penalized and mismatched scales are never compared.
                </span>
              </div>
              {performanceScale && (
                <button
                  type="button"
                  onClick={() => {
                    setPerformanceScale('');
                    setPerformanceScore('');
                  }}
                  className="text-[11px] text-text-amber hover:underline"
                >
                  Clear Metric
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label htmlFor="perf-scale" className="text-[11px] font-medium text-text-muted">Grading Scale</label>
                <select
                  id="perf-scale"
                  value={performanceScale}
                  onChange={(e) => setPerformanceScale(e.target.value)}
                  className="w-full text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main"
                >
                  {GRADE_SCALE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {performanceScale && (
                <div className="space-y-1">
                  <label htmlFor="perf-score" className="text-[11px] font-medium text-text-muted">
                    {performanceScale === 'percentage'
                      ? 'Percentage (0 - 100)'
                      : performanceScale === 'gpa_10'
                      ? 'GPA (0.0 - 10.0)'
                      : 'GPA (0.0 - 4.0)'}
                  </label>
                  <Input
                    id="perf-score"
                    type="number"
                    step="0.01"
                    value={performanceScore}
                    onChange={(e) => setPerformanceScore(e.target.value)}
                    placeholder={
                      performanceScale === 'percentage'
                        ? 'e.g. 88.5'
                        : performanceScale === 'gpa_10'
                        ? 'e.g. 9.1'
                        : 'e.g. 3.75'
                    }
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Learning Style Preference */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-medium text-text-main block">
                Preferred Learning & Collaboration Style (Required for Compatibility)
              </label>
              <p className="text-[11px] text-text-muted">
                Used to pair you with classmates and project teams who share or complement your working approach.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {LEARNING_STYLE_OPTIONS.map((style) => (
                <div
                  key={style.value}
                  onClick={() => setLearningStyle(style.value)}
                  className={`rounded-lg border p-3 cursor-pointer transition-all ${
                    learningStyle === style.value
                      ? 'border-primary bg-primary/5 text-text-main ring-1 ring-primary'
                      : 'border-border bg-bg-card text-text-muted hover:border-text-muted'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-main">{style.label}</span>
                    {learningStyle === style.value && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 leading-snug">{style.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* SECTION 2: TECHNICAL SKILLS & TIME SLOTS */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <User className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">2. Technical Skills & Availability</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Your core technical capabilities and weekly schedule windows.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="bio" className="text-xs font-medium text-text-main">Short Academic Bio</label>
              <span className="text-[11px] text-text-muted">{bio.length}/500</span>
            </div>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell collaborators about your technical passions, active research, or semester objectives..."
              className="w-full text-xs rounded-md border border-border bg-bg-card p-3 text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Declared Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-text-main block">Offered Skills & Proficiency</span>
                <span className="text-[11px] text-text-muted">
                  Used for Project matching (30%) and SkillSwap teaching coverage (40%).
                </span>
              </div>
              <Button type="button" onClick={handleAddSkill} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Skill
              </Button>
            </div>

            <div className="space-y-2">
              {skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={skill.name}
                      onChange={(e) => handleUpdateSkill(index, 'name', e.target.value)}
                      placeholder="Skill name (e.g. Python, React, PyTorch)"
                      className="text-xs"
                    />
                  </div>
                  <select
                    value={skill.level}
                    onChange={(e) => handleUpdateSkill(index, 'level', e.target.value)}
                    className="text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main w-36 sm:w-44 shrink-0"
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {PROFICIENCY_LABELS[lvl]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(index)}
                    className="p-2 text-text-muted hover:text-red-500 rounded shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-xs text-text-muted italic py-2">
                  No skills declared. Click "Add Skill" to declare your strengths.
                </p>
              )}
            </div>
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <div>
              <span className="text-xs font-medium text-text-main block">Weekly Availability Windows</span>
              <span className="text-[11px] text-text-muted">
                Select recurring times when you are free for live sprint syncs or study sessions.
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5 pt-1">
              {COMMON_TIME_SLOTS.map((slot) => {
                const isSelected = timeSlots.includes(slot);
                const parts = slot.split('_');
                const day = parts[0].toUpperCase();
                const period = parts[1];
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleToggleTimeSlot(slot)}
                    className={`py-1.5 px-2 rounded text-[11px] font-medium border text-center transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-bg-card text-text-muted hover:border-text-muted'
                    }`}
                  >
                    <div>{day}</div>
                    <div className="text-[9px] opacity-80 capitalize">{period}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals and Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <label htmlFor="timeline" className="text-xs font-medium text-text-main">Target Timeline</label>
              <select
                id="timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main"
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="workingStyle" className="text-xs font-medium text-text-main">Working Style</label>
              <select
                id="workingStyle"
                value={workingStyle}
                onChange={(e) => setWorkingStyle(e.target.value)}
                className="w-full text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main"
              >
                {WORKING_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Goals Tags */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">Project & Collaboration Goals</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('goal'))}
                  placeholder="e.g. portfolio, capstone, hackathon, publication"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('goal')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Goal
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {goals.map((g, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setGoals((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{g.replace(/_/g, ' ')}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* SECTION 3: STUDY SQUAD & EXAM PREP PREFERENCES */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <BookOpen className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">3. Course Study Squad Preferences</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Course enrollments and active homework/exam topics for study circles.
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="courseCode" className="text-xs font-medium text-text-main">Primary Enrolled Course Code</label>
            <Input
              id="courseCode"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g. CS101, EECS-280, MATH-214"
              className="text-xs"
            />
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">Active Study Topics</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('topic'))}
                  placeholder="e.g. binary_trees, dynamic_programming, sql_indexing"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('topic')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Topic
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topics.map((t, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setTopics((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{t.replace(/_/g, ' ')}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Learning Preferences */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">Study Method Preferences</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={prefInput}
                  onChange={(e) => setPrefInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('pref'))}
                  placeholder="e.g. problem_solving, whiteboard_sessions, mock_quizzes"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('pref')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Method
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {learningPreferences.map((p, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setLearningPreferences((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{p.replace(/_/g, ' ')}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* SECTION 4: SKILLSWAP RECIPROCAL TUTORING */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <ArrowLeftRight className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">4. SkillSwap Reciprocal Tutoring</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Skills you wish to learn and weekly hours available for mutual peer exchanges.
            </p>
          </div>

          {/* Desired Skills */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-text-main block">Skills You Want to Learn</span>
                <span className="text-[11px] text-text-muted">
                  SkillSwap strictly requires mutual reciprocation: you teach what your peer wants, and they teach what you want.
                </span>
              </div>
              <Button type="button" onClick={handleAddDesiredSkill} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Desired Skill
              </Button>
            </div>

            <div className="space-y-2">
              {desiredSkills.map((desired, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      value={desired.name}
                      onChange={(e) => handleUpdateDesiredSkill(index, 'name', e.target.value)}
                      placeholder="Desired skill (e.g. Flutter, Docker, Figma)"
                      className="text-xs"
                    />
                  </div>
                  <select
                    value={desired.targetLevel}
                    onChange={(e) => handleUpdateDesiredSkill(index, 'targetLevel', e.target.value)}
                    className="text-xs rounded-md border border-border bg-bg-card px-3 py-2 text-text-main w-36 sm:w-44 shrink-0"
                  >
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <option key={lvl} value={lvl}>
                        Target: {PROFICIENCY_LABELS[lvl]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveDesiredSkill(index)}
                    className="p-2 text-text-muted hover:text-red-500 rounded shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {desiredSkills.length === 0 && (
                <p className="text-xs text-text-muted italic py-2">
                  No desired skills configured yet. Add subjects you want personalized peer tutoring in.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5 max-w-xs">
            <label htmlFor="weeklyHours" className="text-xs font-medium text-text-main">
              Weekly Exchange Commitment (Hours/Week)
            </label>
            <Input
              id="weeklyHours"
              type="number"
              step="0.5"
              min="0.5"
              max="168"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              className="text-xs"
            />
          </div>
        </Card>

        {/* SECTION 5: PROJECT IDEAS & PREVIOUS EXPERIENCE */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <FolderGit2 className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">5. Project Ideas & Experience</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Past completed projects (15% project experience factor) and ideas you want to build.
            </p>
          </div>

          {/* Past Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-text-main block">Previous Projects & Experience</span>
                <span className="text-[11px] text-text-muted">
                  Used directly in Project Compatibility (15%) to assess practical experience in required technologies.
                </span>
              </div>
              <Button type="button" onClick={handleAddPreviousProject} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Past Project
              </Button>
            </div>

            <div className="space-y-3">
              {previousProjects.map((proj, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-amber">Project #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePreviousProject(idx)}
                      className="p-1 text-text-muted hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      value={proj.title}
                      onChange={(e) => handleUpdatePreviousProject(idx, 'title', e.target.value)}
                      placeholder="Project title (e.g. Distributed Key-Value Store)"
                      className="text-xs"
                    />
                    <Input
                      value={proj.role || ''}
                      onChange={(e) => handleUpdatePreviousProject(idx, 'role', e.target.value)}
                      placeholder="Your role (e.g. Systems Engineer, Fullstack Lead)"
                      className="text-xs"
                    />
                  </div>
                  <Input
                    value={Array.isArray(proj.skills) ? proj.skills.join(', ') : ''}
                    onChange={(e) =>
                      handleUpdatePreviousProject(
                        idx,
                        'skills',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    placeholder="Technologies used (comma-separated: e.g. Rust, Raft, Docker)"
                    className="text-xs"
                  />
                  <textarea
                    rows={2}
                    value={proj.achievements || ''}
                    onChange={(e) => handleUpdatePreviousProject(idx, 'achievements', e.target.value)}
                    placeholder="Outcomes, metrics, or achievements (e.g. Handled 5k req/s with 99th percentile < 10ms)..."
                    className="w-full text-xs rounded-md border border-border bg-bg-card p-2 text-text-main"
                  />
                </div>
              ))}
              {previousProjects.length === 0 && (
                <p className="text-xs text-text-muted italic py-1">
                  No past projects added. Adding past projects demonstrates hands-on experience for team matching.
                </p>
              )}
            </div>
          </div>

          {/* Project Ideas */}
          <div className="space-y-3 pt-4 border-t border-border">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-text-main block">Project Ideas & Pitches</span>
                <span className="text-[11px] text-text-muted">
                  Proposals and concepts you are looking to recruit classmates or teammates for.
                </span>
              </div>
              <Button type="button" onClick={handleAddProjectIdea} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Idea
              </Button>
            </div>

            <div className="space-y-3">
              {projectIdeas.map((idea, idx) => (
                <div key={idx} className="rounded-lg border border-border bg-bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-amber">Idea #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveProjectIdea(idx)}
                      className="p-1 text-text-muted hover:text-red-500 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <Input
                    value={idea.title}
                    onChange={(e) => handleUpdateProjectIdea(idx, 'title', e.target.value)}
                    placeholder="Idea title (e.g. Campus Peer Tutoring Micro-App)"
                    className="text-xs"
                  />
                  <textarea
                    rows={2}
                    value={idea.description || ''}
                    onChange={(e) => handleUpdateProjectIdea(idx, 'description', e.target.value)}
                    placeholder="Short description of the problem and intended tech stack..."
                    className="w-full text-xs rounded-md border border-border bg-bg-card p-2 text-text-main"
                  />
                </div>
              ))}
              {projectIdeas.length === 0 && (
                <p className="text-xs text-text-muted italic py-1">
                  No project ideas added yet.
                </p>
              )}
            </div>
          </div>
        </Card>

        {/* SECTION 6: ACHIEVEMENTS & COLLABORATION PREFERENCES */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <Award className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">6. Achievements & Collaboration Preferences</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Honors, hackathons, certifications, and communication constraints.
            </p>
          </div>

          {/* Achievements */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">Achievements & Honors</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={achievementInput}
                  onChange={(e) => setAchievementInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('achievement'))}
                  placeholder="e.g. 1st Place Hackathon, Dean's Honor Roll, AWS Certified Developer"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('achievement')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Achievement
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {achievements.map((ach, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setAchievements((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{ach}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Collaboration Preferences */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-main">Communication & Workflow Preferences</label>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <Input
                  value={collabInput}
                  onChange={(e) => setCollabInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag('collab'))}
                  placeholder="e.g. Slack-first, Async code reviews, Weekend pairing only, UTC-5"
                  className="text-xs"
                />
              </div>
              <Button type="button" onClick={() => handleAddTag('collab')} size="sm" variant="outline" className="shrink-0 whitespace-nowrap">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Preference
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {collaborationPreferences.map((pref, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs flex items-center gap-1 cursor-pointer"
                  onClick={() => setCollaborationPreferences((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  <span>{pref}</span>
                  <X className="w-3 h-3 hover:text-red-500" />
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* BOTTOM SAVE BAR */}
        <div className="flex items-center justify-between border-t border-border pt-4">
          <span className="text-xs text-text-muted">
            All fields are saved securely in MongoDB and evaluated deterministically by the scoring engine.
          </span>
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
export default ProfilePage;
