import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ArrowRight,
  FolderGit2,
  BookOpenCheck,
  ArrowLeftRight,
  ShieldCheck,
  Calendar,
  Sparkles,
  Info,
  Clock,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { ScoreBar } from '../components/ui/ScoreBar';
import { Badge } from '../components/ui/Badge';
import { scrollToSection } from '../utils/scroll';

// Coherent, realistic demonstration data for each matching context
const DEMO_CONTEXTS = {
  project: {
    id: 'project',
    title: 'Project Collaboration',
    score: 88,
    scoreLabel: 'Project Compatibility',
    candidate: {
      name: 'Marcus Vance',
      program: '3rd Year Computer Science',
      focus: 'Distributed Systems & Cloud Architecture',
      initials: 'MV',
    },
    contextDetails: {
      title: 'Distributed Systems Capstone (CS 452)',
      commitment: '8–10 hours/week',
      timing: 'Spring Semester Milestone Schedule',
      requiredStack: ['Node.js', 'PostgreSQL', 'Docker', 'REST API'],
    },
    factors: [
      { label: 'Technical Stack Alignment', value: 92 },
      { label: 'Schedule & Timezone Overlap', value: 84 },
      { label: 'Project Goal & Urgency Fit', value: 90 },
      { label: 'Working Style (Async / Sync)', value: 85 },
    ],
    reasons: [
      'Both seeking to build backend infrastructure with Node.js and PostgreSQL.',
      'Overlapping availability on Tuesday and Thursday evenings (5:00–8:00 PM).',
      'Complementary roles: Marcus focuses on data modeling and indexing; you lead client services.',
      'Matching target commitment of 8–10 hours per week through final milestone submission.',
    ],
    inputsExplained:
      'Calculated from tech stack overlap, weekly free hours, project scope, and preferred commit habits.',
  },
  study: {
    id: 'study',
    title: 'Study Buddies',
    score: 94,
    scoreLabel: 'Study Compatibility',
    candidate: {
      name: 'Elena Rostova',
      program: '2nd Year Data Science & Applied Math',
      focus: 'Linear Algebra & Optimization',
      initials: 'ER',
    },
    contextDetails: {
      title: 'Linear Algebra (MATH 214 — Prof. Chen)',
      commitment: '2 weekly study sessions',
      timing: 'Midterm 2 & Problem Set Deadlines',
      requiredStack: ['Vector Spaces', 'Eigenvalues', 'Proof Techniques'],
    },
    factors: [
      { label: 'Course & Section Overlap', value: 100 },
      { label: 'Study Schedule Overlap', value: 90 },
      { label: 'Learning Style Synergy', value: 92 },
      { label: 'Target Exam Pacing', value: 95 },
    ],
    reasons: [
      'Enrolled in the same course section (MATH 214) with identical problem set schedules.',
      'Matching study windows every Monday and Wednesday afternoon (3:00–5:30 PM).',
      'Compatible rhythm: individual problem attempts followed by collaborative proof verification.',
      'Shared academic target: mastering vector space proofs ahead of Midterm 2.',
    ],
    inputsExplained:
      'Calculated from exact university course codes, shared weekly study windows, and exam dates.',
  },
  skillswap: {
    id: 'skillswap',
    title: 'Reciprocal SkillSwap',
    score: 89,
    scoreLabel: 'SkillSwap Compatibility',
    candidate: {
      name: 'Aiden Chen',
      program: '4th Year Interactive Media & Design',
      focus: 'UI/UX Architecture & Design Systems',
      initials: 'AC',
    },
    contextDetails: {
      title: 'Bilateral Peer Knowledge Exchange',
      commitment: '1 hour weekly reciprocal exchange',
      timing: 'Flexible weekend cadence',
      requiredStack: ['Figma ↔ Python Automation'],
    },
    factors: [
      { label: 'Bidirectional Need Overlap', value: 95 },
      { label: 'Skill Depth & Symmetry', value: 88 },
      { label: 'Exchange Availability', value: 85 },
      { label: 'Peer Teaching Preference', value: 90 },
    ],
    reasons: [
      'Exact bilateral match: Aiden teaches Figma and UI systems; you teach Python fundamentals.',
      'Agreed 1-hour weekly reciprocal session (30 minutes per topic).',
      'Both free Saturday mornings between 10:00 AM and 11:30 AM.',
      'Shared practical focus: building portfolio projects rather than passive lecture reviews.',
    ],
    inputsExplained:
      'Calculated from two-way skill barter overlap: what you offer matches what they seek, and vice versa.',
  },
};

export function LandingPage() {
  const navigate = useNavigate();
  const [activeContext, setActiveContext] = useState('project');
  const [requestSent, setRequestSent] = useState(false);

  const currentData = DEMO_CONTEXTS[activeContext];

  const handleContextChange = (contextId) => {
    setActiveContext(contextId);
    setRequestSent(false);
  };

  const handleScrollTo = (id) => {
    scrollToSection(id);
  };

  return (
    <div className="space-y-24 sm:space-y-32 py-12 sm:py-20">
      {/* 1. HERO SECTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-2">
          <Badge variant="amber">Student Collaboration Platform</Badge>
          <span className="text-xs text-text-muted">Independent Compatibility Models</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-text-main leading-[1.15]">
          Find the right people to learn, build, and{' '}
          <span className="relative inline-block">
            exchange skills with.
            {/* Specified small amber underline */}
            <span
              className="absolute left-0 bottom-1 w-full h-[2px] bg-accent"
              aria-hidden="true"
            />
          </span>
        </h1>

        <p className="text-base sm:text-lg text-text-muted leading-relaxed font-sans max-w-2xl mx-auto">
          SkillSync uses students&apos; goals, skills, course enrollment, and schedule availability
          to suggest useful matches across three separate collaboration tracks.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate('/auth?mode=signup')}
          >
            Get started <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            onClick={() => handleScrollTo('workflows')}
          >
            Explore how it works
          </Button>
        </div>
      </section>

      {/* 2. INTERACTIVE PRODUCT DEMONSTRATION */}
      <section
        id="demo"
        className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-20 space-y-8"
      >
        <div className="border-t border-border pt-12 text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-bg-section border border-border text-xs text-text-muted font-sans">
            <Info className="w-3.5 h-3.5 text-text-amber shrink-0" aria-hidden="true" />
            <span>Interactive Simulator — Coherent Example Data</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
            How Compatibility Matching Works
          </h2>

          <p className="text-sm text-text-muted leading-relaxed">
            Select a collaboration context below to inspect how factor bars and plain-language
            reasons adjust to different student needs.
          </p>
        </div>

        {/* Context Tabs Switcher */}
        <div
          role="tablist"
          aria-label="Collaboration contexts"
          className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-lg border border-border bg-bg-section max-w-lg mx-auto"
        >
          <button
            type="button"
            role="tab"
            id="tab-project"
            aria-controls="panel-project"
            aria-selected={activeContext === 'project'}
            onClick={() => handleContextChange('project')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
              activeContext === 'project'
                ? 'bg-primary text-primary-foreground shadow-restrained'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            Project Collaboration
          </button>

          <button
            type="button"
            role="tab"
            id="tab-study"
            aria-controls="panel-study"
            aria-selected={activeContext === 'study'}
            onClick={() => handleContextChange('study')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
              activeContext === 'study'
                ? 'bg-primary text-primary-foreground shadow-restrained'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            Study Buddies
          </button>

          <button
            type="button"
            role="tab"
            id="tab-skillswap"
            aria-controls="panel-skillswap"
            aria-selected={activeContext === 'skillswap'}
            onClick={() => handleContextChange('skillswap')}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
              activeContext === 'skillswap'
                ? 'bg-primary text-primary-foreground shadow-restrained'
                : 'text-text-muted hover:text-text-main hover:bg-bg-card'
            }`}
          >
            SkillSwap
          </button>
        </div>

        {/* Match Card Demonstration */}
        <div
          role="tabpanel"
          id={`panel-${currentData.id}`}
          aria-labelledby={`tab-${currentData.id}`}
        >
          <Card className="border border-border">
            <CardHeader className="border-b border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Candidate & Academic Context */}
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-md border border-border bg-bg-section flex items-center justify-center font-serif text-sm font-semibold text-text-main shrink-0">
                    {currentData.candidate.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-lg font-medium text-text-main">
                        {currentData.candidate.name}
                      </h3>
                      <Badge variant="neutral">{currentData.candidate.program}</Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {currentData.contextDetails.title}
                    </p>
                  </div>
                </div>

                {/* Independent Score Display */}
                <div className="sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                  <div className="flex items-baseline sm:justify-end gap-1.5">
                    <span className="font-serif text-3xl font-semibold text-text-amber">
                      {currentData.score}%
                    </span>
                  </div>
                  <span className="text-[11px] uppercase tracking-wider font-medium text-text-muted block">
                    {currentData.scoreLabel}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Context Parameters Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-bg-section border border-border rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                  <span className="text-text-muted">
                    Commitment: <strong className="text-text-main font-medium">{currentData.contextDetails.commitment}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                  <span className="text-text-muted">
                    Cadence: <strong className="text-text-main font-medium">{currentData.contextDetails.timing}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-text-muted shrink-0" aria-hidden="true" />
                  <span className="text-text-muted truncate">
                    Focus: <strong className="text-text-main font-medium">{currentData.contextDetails.requiredStack.join(', ')}</strong>
                  </span>
                </div>
              </div>

              {/* Grid: Factor Bars & Reasons */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* Left: Thin Factor Bars */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-1 border-b border-border">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main">
                      Compatibility Factors
                    </h4>
                    <span className="text-[11px] text-text-muted">Thin Amber Bar / Navy Track</span>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    {currentData.factors.map((factor) => (
                      <ScoreBar
                        key={factor.label}
                        label={factor.label}
                        value={factor.value}
                      />
                    ))}
                  </div>

                  <p className="text-xs text-text-muted/90 italic pt-2">
                    {currentData.inputsExplained}
                  </p>
                </div>

                {/* Right: Why This Match Panel */}
                <div className="rounded-md border border-border bg-bg-section p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-1 border-b border-border/80">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main">
                      Why this match?
                    </h4>
                    <span className="text-[11px] text-text-amber font-medium">
                      Concrete criteria
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-text-muted">
                    {currentData.reasons.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                        <Check
                          className="w-4 h-4 text-text-amber shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex items-center gap-2">
                <Badge variant="amber">Demonstration Mode</Badge>
                <span className="text-xs text-text-muted hidden sm:inline">
                  Interactive state simulation
                </span>
              </div>

              <div className="flex items-center gap-3">
                {requestSent ? (
                  <span className="text-xs text-text-amber font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    Simulated request logged
                  </span>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setRequestSent(true)}
                  >
                    Simulate Connection
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* 3. EXPLAIN THE THREE WORKFLOWS */}
      <section
        id="workflows"
        className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-20 space-y-12"
      >
        <div className="border-t border-border pt-12 text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="neutral">Structured Workflows</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
            Three Distinct Collaboration Modes
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Students work together for different reasons. SkillSync collects specific input data
            for each purpose rather than forcing every collaboration into a generic team format.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode 1: Project Collaboration */}
          <Card id="projects" className="flex flex-col justify-between scroll-mt-20">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center">
                <FolderGit2 className="w-5 h-5 text-text-main" aria-hidden="true" />
              </div>

              <div>
                <CardTitle>Project Collaboration</CardTitle>
                <span className="text-[11px] font-medium text-text-amber uppercase tracking-wider">
                  For Capstones, Hackathons & Research
                </span>
              </div>

              <CardDescription className="text-xs sm:text-sm leading-relaxed">
                Assembles student teams based on complementary skill requirements, role division,
                and mutual time commitment.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs border-t border-border pt-4">
              <div>
                <strong className="text-text-main block mb-1">Distinct Input Data:</strong>
                <p className="text-text-muted leading-relaxed">
                  Required technology stack, defined roles (frontend, backend, design, data), weekly commitment hours, and deliverable deadlines.
                </p>
              </div>

              <div>
                <strong className="text-text-main block mb-1">Purpose:</strong>
                <p className="text-text-muted leading-relaxed">
                  Prevents uneven workloads and missing skills by verifying team balance prior to project kickoff.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mode 2: Study-Buddy Matching */}
          <Card id="study" className="flex flex-col justify-between scroll-mt-20">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center">
                <BookOpenCheck className="w-5 h-5 text-text-main" aria-hidden="true" />
              </div>

              <div>
                <CardTitle>Study Matching</CardTitle>
                <span className="text-[11px] font-medium text-text-amber uppercase tracking-wider">
                  For Coursework & Exam Preparation
                </span>
              </div>

              <CardDescription className="text-xs sm:text-sm leading-relaxed">
                Connects classmates registered in the same courses to coordinate problem set
                sessions and prepare for shared exams.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs border-t border-border pt-4">
              <div>
                <strong className="text-text-main block mb-1">Distinct Input Data:</strong>
                <p className="text-text-muted leading-relaxed">
                  Institutional course code, lecture section, midterm/final dates, recurring weekly free hours, and preferred study style (quiet vs interactive).
                </p>
              </div>

              <div>
                <strong className="text-text-main block mb-1">Purpose:</strong>
                <p className="text-text-muted leading-relaxed">
                  Ensures peers share identical curriculum requirements and realistic calendar availability for recurring study blocks.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mode 3: Reciprocal SkillSwap */}
          <Card id="skillswap" className="flex flex-col justify-between scroll-mt-20">
            <CardHeader className="space-y-3">
              <div className="w-10 h-10 rounded-md border border-border bg-bg-section flex items-center justify-center">
                <ArrowLeftRight className="w-5 h-5 text-text-main" aria-hidden="true" />
              </div>

              <div>
                <CardTitle>Reciprocal SkillSwap</CardTitle>
                <span className="text-[11px] font-medium text-text-amber uppercase tracking-wider">
                  For Bilateral Peer Exchange
                </span>
              </div>

              <CardDescription className="text-xs sm:text-sm leading-relaxed">
                Facilitates 1-on-1 peer exchange where two students trade knowledge directly
                without tuition, monetary payments, or commercial barriers.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs border-t border-border pt-4">
              <div>
                <strong className="text-text-main block mb-1">Distinct Input Data:</strong>
                <p className="text-text-muted leading-relaxed">
                  &ldquo;What I can teach&rdquo; inventory, &ldquo;What I want to learn&rdquo; goals, proficiency tier, and preferred session duration.
                </p>
              </div>

              <div>
                <strong className="text-text-main block mb-1">Purpose:</strong>
                <p className="text-text-muted leading-relaxed">
                  Guarantees mutual value: Student A teaches what Student B needs, and Student B teaches what Student A needs in return.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. SCORING PHILOSOPHY SECTION */}
      <section
        id="scoring"
        className="max-w-5xl mx-auto px-4 sm:px-6 scroll-mt-20 space-y-8"
      >
        <div className="border-t border-border pt-12 text-center max-w-2xl mx-auto space-y-3">
          <Badge variant="neutral">Ethical Architecture</Badge>
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
            Our Scoring Philosophy
          </h2>
          <p className="text-sm text-text-muted leading-relaxed">
            Compatibility calculations exist solely to assess logistical and functional fit.
            SkillSync never evaluates student intelligence, ability, or personal worth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-text-amber font-serif text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                <span>Independent Context Scores</span>
              </div>
              <CardTitle className="text-base sm:text-lg">No Overall Student Rating</CardTitle>
              <CardDescription className="leading-relaxed">
                You receive separate, context-specific percentages: Project Compatibility, Study Compatibility, and SkillSwap Compatibility. A student may have a 92% project match for a cloud computing term paper, but a 20% study match because they share no common lecture courses.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-text-amber font-serif text-sm font-semibold">
                <Check className="w-4 h-4" aria-hidden="true" />
                <span>Explainable Criteria</span>
              </div>
              <CardTitle className="text-base sm:text-lg">Concrete &apos;Why this match?&apos; Reasons</CardTitle>
              <CardDescription className="leading-relaxed">
                Scores are never opaque numbers. Every recommendation includes three or four plain-language reasons identifying the exact shared factors (such as matching evening hours, mutual course codes, or reciprocal skills) that generated the percentage.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-text-amber font-serif text-sm font-semibold">
                <Sparkles className="w-4 h-4" aria-hidden="true" />
                <span>Zero Academic Surveillance</span>
              </div>
              <CardTitle className="text-base sm:text-lg">Marks Are Optional & Private</CardTitle>
              <CardDescription className="leading-relaxed">
                Grades and GPAs are never required to find matches. Collaboration models evaluate logistical availability and self-declared goals. Academic history remains private and is never used to create leaderboards or rank peers.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <div className="flex items-center gap-2 text-text-amber font-serif text-sm font-semibold">
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>Symmetrical Peer Exchange</span>
              </div>
              <CardTitle className="text-base sm:text-lg">Equitable Collaboration</CardTitle>
              <CardDescription className="leading-relaxed">
                SkillSwap calculations verify bilateral balance before recommending an exchange, ensuring that both participants enter sessions with equal commitment and mutual learning objectives.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* 5. READY TO COLLABORATE CALL-TO-ACTION */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="rounded-lg border border-border bg-bg-section p-8 sm:p-12 text-center space-y-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-medium text-text-main">
            Ready to find your next collaboration partner?
          </h2>

          <p className="text-sm text-text-muted leading-relaxed max-w-xl mx-auto">
            SkillSync is launching across universities to simplify student teamwork, exam preparation, and peer skill swaps.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Create student profile
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={() => handleScrollTo('demo')}
            >
              Test match simulator
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;

