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

  // Form State
  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [goals, setGoals] = useState([]);
  const [goalInput, setGoalInput] = useState('');
  const [timeline, setTimeline] = useState('full_semester');
  const [workingStyle, setWorkingStyle] = useState('mixed');

  // Study Preferences
  const [courseCode, setCourseCode] = useState('');
  const [topics, setTopics] = useState([]);
  const [topicInput, setTopicInput] = useState('');
  const [learningPreferences, setLearningPreferences] = useState([]);
  const [prefInput, setPrefInput] = useState('');

  // SkillSwap Preferences
  const [desiredSkills, setDesiredSkills] = useState([]);
  const [weeklyHours, setWeeklyHours] = useState('5');

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
        setCourseCode(p.courseCode || '');
        setTopics(Array.isArray(p.topics) ? p.topics : []);
        setLearningPreferences(Array.isArray(p.learningPreferences) ? p.learningPreferences : []);
        setDesiredSkills(Array.isArray(p.desiredSkills) ? p.desiredSkills : []);
        setWeeklyHours(p.weeklyHours !== undefined && p.weeklyHours !== null ? String(p.weeklyHours) : '5');

        setCompleteness(res.completeness);
        setIsNewProfile(false);
      } catch (err) {
        if (!isMounted) return;
        if (err.status === 404) {
          // Fresh profile onboarding
          setIsNewProfile(true);
          setSkills([
            { name: 'JavaScript', level: 3 },
            { name: 'React', level: 3 },
          ]);
          setTimeSlots(['mon_afternoon', 'wed_afternoon', 'fri_afternoon']);
          setGoals(['portfolio', 'capstone']);
          setDesiredSkills([{ name: 'Python', targetLevel: 3 }]);
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
    }
  };

  // Save Profile Handler
  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    // Frontend validations aligning with backend
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

    // Construct clean payload matching schema
    const payload = {
      bio: bio.trim() || undefined,
      skills: skills.map((s) => ({ name: s.name.trim(), level: s.level })),
      timeSlots,
      goals,
      timeline,
      workingStyle,
      courseCode: courseCode.trim() || undefined,
      topics,
      learningPreferences,
      desiredSkills: desiredSkills.map((d) => ({ name: d.name.trim(), targetLevel: d.targetLevel })),
      weeklyHours: hoursNum,
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
          Configure your technical skills, study preferences, and reciprocal tutoring commitments. The SkillSync compatibility engine evaluates these exact inputs deterministically to compute matches without guessing.
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
              Your profile and mode readiness have been updated in the database.
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
                : `Missing: ${completeness?.project?.missingFields?.join(', ') || 'skills, timeSlots, goals, timeline, workingStyle'}`}
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
                : `Missing: ${completeness?.study?.missingFields?.join(', ') || 'courseCode, topics, timeSlots, learningPreferences'}`}
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
                : `Missing: ${completeness?.skillswap?.missingFields?.join(', ') || 'skills, desiredSkills, timeSlots, weeklyHours'}`}
            </p>
          </div>
        </div>
      </section>

      {/* 3. PROFILE EDITING FORM */}
      <form id="profile-form" noValidate onSubmit={handleSave} className="space-y-8">
        {/* SECTION 1: GENERAL PROFILE & PROJECT INPUTS */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <User className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">1. General Profile & Project Collaboration</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              General bio, technical competencies, schedule availability, and project goals.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="bio-input" className="block text-xs font-medium text-text-main tracking-wide">
                Student Bio
              </label>
              <span className={`text-[10px] ${bio.length > 500 ? 'text-text-amber font-semibold' : 'text-text-muted'}`}>
                {bio.length}/500
              </span>
            </div>
            <textarea
              id="bio-input"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              placeholder="e.g., Computer science junior focusing on web application architecture, databases, and UI development."
              className="w-full rounded-md border border-border bg-bg-card px-3.5 py-2 text-sm text-text-main placeholder:text-text-muted transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Offered Skills List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-medium text-text-main tracking-wide">
                  Skills & Proficiency Levels (1-5)
                </label>
                <p className="text-[11px] text-text-muted">
                  Used for Project matching (40% weight) and offered skills in SkillSwap.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddSkill} className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Skill</span>
              </Button>
            </div>

            {skills.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-text-muted">
                No skills added yet. Click &quot;Add Skill&quot; to declare your competencies.
              </div>
            ) : (
              <div className="space-y-2">
                {skills.map((s, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md border border-border bg-bg-section/50 p-2.5">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={s.name}
                        onChange={(e) => handleUpdateSkill(index, 'name', e.target.value)}
                        placeholder="e.g., React, Node.js, Python, Figma"
                        className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <select
                        value={s.level}
                        onChange={(e) => handleUpdateSkill(index, 'level', e.target.value)}
                        className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            {PROFICIENCY_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(index)}
                      className="p-1.5 rounded text-text-muted hover:text-text-amber hover:bg-bg-section transition-colors self-end sm:self-center"
                      title="Remove skill"
                      aria-label={`Remove skill ${s.name || index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Slots Toggle Matrix */}
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium text-text-main tracking-wide">
                Available Time Slots
              </label>
              <p className="text-[11px] text-text-muted">
                Select your general weekly availability windows ({timeSlots.length} active).
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COMMON_TIME_SLOTS.map((slot) => {
                const active = timeSlots.includes(slot);
                const readable = slot.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => handleToggleTimeSlot(slot)}
                    className={`px-2.5 py-1 rounded text-[11px] font-sans border transition-colors cursor-pointer ${
                      active
                        ? 'border-primary bg-primary text-primary-foreground font-medium'
                        : 'border-border bg-bg-card text-text-muted hover:text-text-main hover:bg-bg-section'
                    }`}
                  >
                    {readable}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Goals Tag Manager */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-main tracking-wide">
              Project Goals
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag('goal');
                  }
                }}
                placeholder="Type a goal (e.g., portfolio, hackathon, capstone) and press Enter"
                className="flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => handleAddTag('goal')}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {goals.map((g) => (
                <span
                  key={g}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-bg-section border border-border text-text-main"
                >
                  <span>{g}</span>
                  <button
                    type="button"
                    onClick={() => setGoals((prev) => prev.filter((item) => item !== g))}
                    className="text-text-muted hover:text-text-amber"
                    aria-label={`Remove goal ${g}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Timeline and Working Style Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Preferred Timeline */}
            <div className="space-y-1.5">
              <label htmlFor="timeline-select" className="block text-xs font-medium text-text-main tracking-wide">
                Preferred Project Timeline
              </label>
              <select
                id="timeline-select"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIMELINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Working Style */}
            <div className="space-y-1.5">
              <label htmlFor="working-style-select" className="block text-xs font-medium text-text-main tracking-wide">
                Preferred Working Style
              </label>
              <select
                id="working-style-select"
                value={workingStyle}
                onChange={(e) => setWorkingStyle(e.target.value)}
                className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {WORKING_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.desc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* SECTION 2: STUDY BUDDY PREFERENCES */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <BookOpen className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">2. Course Study Squad Preferences</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Active academic course code, study topics, and preferred learning formats.
            </p>
          </div>

          {/* Course Code */}
          <div className="space-y-1.5 max-w-sm">
            <Input
              id="course-code"
              label="Primary Course Code"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              placeholder="e.g., CS101, MATH240, PHYS201"
              maxLength={30}
              hint="Exact course match accounts for 70% of study alignment factor."
            />
          </div>

          {/* Topics Tag Manager */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-main tracking-wide">
              Active Course Topics
            </label>
            <p className="text-[11px] text-text-muted">
              Topics are compared using Jaccard similarity to calculate content overlap.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag('topic');
                  }
                }}
                placeholder="e.g., algorithms, dynamic_programming, binary_trees"
                className="flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => handleAddTag('topic')}>
                Add Topic
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {topics.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-bg-section border border-border text-text-main"
                >
                  <span>{t}</span>
                  <button
                    type="button"
                    onClick={() => setTopics((prev) => prev.filter((item) => item !== t))}
                    className="text-text-muted hover:text-text-amber"
                    aria-label={`Remove topic ${t}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Learning Preferences Tag Manager */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-text-main tracking-wide">
              Learning Preferences
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prefInput}
                onChange={(e) => setPrefInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag('pref');
                  }
                }}
                placeholder="e.g., problem_solving, discussion, exam_review"
                className="flex-1 rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => handleAddTag('pref')}>
                Add Preference
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {learningPreferences.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs bg-bg-section border border-border text-text-main"
                >
                  <span>{p}</span>
                  <button
                    type="button"
                    onClick={() => setLearningPreferences((prev) => prev.filter((item) => item !== p))}
                    className="text-text-muted hover:text-text-amber"
                    aria-label={`Remove preference ${p}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </Card>

        {/* SECTION 3: SKILLSWAP PREFERENCES */}
        <Card className="p-6 space-y-6">
          <div className="border-b border-border pb-4">
            <div className="flex items-center gap-2 text-text-main">
              <ArrowLeftRight className="w-4 h-4 text-text-amber" />
              <h2 className="font-serif text-lg font-medium">3. SkillSwap Reciprocal Tutoring</h2>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Skills you wish to learn and weekly hours available for tutoring exchanges.
            </p>
          </div>

          {/* Desired Skills List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-medium text-text-main tracking-wide">
                  Desired Skills & Target Levels (1-5)
                </label>
                <p className="text-[11px] text-text-muted">
                  Skills you want a peer to teach you. Matching requires bidirectional reciprocation.
                </p>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={handleAddDesiredSkill} className="flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Desired Skill</span>
              </Button>
            </div>

            {desiredSkills.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-xs text-text-muted">
                No desired skills added yet. Click &quot;Add Desired Skill&quot; to declare what you want to learn.
              </div>
            ) : (
              <div className="space-y-2">
                {desiredSkills.map((d, index) => (
                  <div key={index} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 rounded-md border border-border bg-bg-section/50 p-2.5">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={d.name}
                        onChange={(e) => handleUpdateDesiredSkill(index, 'name', e.target.value)}
                        placeholder="e.g., Python, Rust, Docker, Machine Learning"
                        className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <select
                        value={d.targetLevel}
                        onChange={(e) => handleUpdateDesiredSkill(index, 'targetLevel', e.target.value)}
                        className="w-full rounded-md border border-border bg-bg-card px-3 py-1.5 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <option key={lvl} value={lvl}>
                            Target: {PROFICIENCY_LABELS[lvl]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDesiredSkill(index)}
                      className="p-1.5 rounded text-text-muted hover:text-text-amber hover:bg-bg-section transition-colors self-end sm:self-center"
                      title="Remove desired skill"
                      aria-label={`Remove desired skill ${d.name || index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Weekly Hours Input */}
          <div className="space-y-1.5 max-w-sm">
            <Input
              id="weekly-hours"
              type="number"
              step="0.5"
              min="0.5"
              max="168"
              label="Weekly Available Hours"
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              placeholder="e.g., 5"
              hint="Committed hours per week for tutoring (0.5 to 168 hours)."
            />
          </div>
        </Card>

        {/* BOTTOM SAVE BAR */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <p className="text-xs text-text-muted">
            All updates are saved directly to your authenticated MongoDB profile.
          </p>
          <Button type="submit" disabled={saving} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Profile'}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ProfilePage;

