import React, { useState } from 'react';
import { Check, ArrowRight, BookOpen, Users, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/Card';
import { ScoreBar } from '../components/ui/ScoreBar';
import { Badge } from '../components/ui/Badge';

export function LandingShell() {
  const [demoInput, setDemoInput] = useState('');

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-20">
      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2">
          <Badge variant="amber">Phase 1 Foundation</Badge>
          <span className="text-xs text-text-muted">MERN Architecture & Design System</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-medium tracking-tight text-text-main leading-tight">
          Collaborate with purpose.{' '}
          <span className="relative inline-block">
            Learn in sync.
            {/* Specified small amber underline */}
            <span
              className="absolute left-0 bottom-0.5 w-full h-[2px] bg-accent"
              aria-hidden="true"
            />
          </span>
        </h1>

        <p className="text-base sm:text-lg text-text-muted leading-relaxed font-sans max-w-2xl mx-auto">
          SkillSync connects university students across three distinct collaboration tracks:
          structured project teams, course-specific study buddies, and reciprocal skill exchanges.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button variant="primary" size="md">
            Explore Tracks <ArrowRight className="w-4 h-4 ml-1" aria-hidden="true" />
          </Button>
          <Button variant="secondary" size="md">
            Design Tokens Reference
          </Button>
        </div>
      </section>

      {/* The Three Collaboration Pillars */}
      <section className="space-y-6">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="font-serif text-2xl font-medium text-text-main">
            Three Dedicated Tracks
          </h2>
          <p className="text-xs sm:text-sm text-text-muted">
            Independent compatibility models tailored specifically to how students work together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Project Collaboration */}
          <Card id="projects" className="flex flex-col justify-between">
            <CardHeader>
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center mb-3">
                <Users className="w-4 h-4 text-text-main" aria-hidden="true" />
              </div>
              <CardTitle>Project Collaboration</CardTitle>
              <CardDescription>
                Build hackathon, term, and capstone teams matched on required competencies, role division, and weekly commitment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="neutral">Independent Scoring</Badge>
            </CardContent>
          </Card>

          {/* Pillar 2: Study-Buddy Matching */}
          <Card id="study" className="flex flex-col justify-between">
            <CardHeader>
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center mb-3">
                <BookOpen className="w-4 h-4 text-text-main" aria-hidden="true" />
              </div>
              <CardTitle>Study Matching</CardTitle>
              <CardDescription>
                Pair with peers taking the same courses, aligning on study rhythms, exam milestones, and shared schedules.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="neutral">Course-Specific Match</Badge>
            </CardContent>
          </Card>

          {/* Pillar 3: SkillSwap */}
          <Card id="skillswap" className="flex flex-col justify-between">
            <CardHeader>
              <div className="w-9 h-9 rounded-md border border-border bg-bg-section flex items-center justify-center mb-3">
                <RefreshCw className="w-4 h-4 text-text-main" aria-hidden="true" />
              </div>
              <CardTitle>Reciprocal SkillSwap</CardTitle>
              <CardDescription>
                Bilateral 1-on-1 peer exchange. Teach what you excel in, and learn what you need without monetary transactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="neutral">Reciprocal Bilateral</Badge>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Component System & Compatibility Demo */}
      <section className="space-y-6">
        <div className="border-t border-border pt-10">
          <h2 className="font-serif text-2xl font-medium text-text-main mb-2">
            Design System Components
          </h2>
          <p className="text-sm text-text-muted max-w-2xl">
            Demonstrating our immutable color tokens, restrained 1px borders, 6–8px corner radii,
            and the compatibility component architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Compatibility Card Demonstration */}
          <Card className="border border-border">
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Candidate Match Demonstration
                  </span>
                  <CardTitle className="mt-1">Distributed Systems Project</CardTitle>
                </div>
                {/* Compatibility Percentage Badge */}
                <div className="text-right">
                  <span className="block font-serif text-2xl font-semibold text-text-amber">
                    88%
                  </span>
                  <span className="text-[10px] text-text-muted font-medium uppercase tracking-wider">
                    Project Match
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Factor Bars */}
              <div className="space-y-3 pt-2">
                <ScoreBar label="Skills Alignment" value={92} />
                <ScoreBar label="Schedule Overlap" value={85} />
                <ScoreBar label="Goal & Urgency Fit" value={90} />
                <ScoreBar label="Working Preference" value={80} />
              </div>

              {/* Why this match? Panel */}
              <div className="rounded-md border border-border bg-bg-section p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-text-main">
                    Why this match?
                  </h4>
                  <span className="text-[11px] text-text-muted">4 verified factors</span>
                </div>

                <ul className="space-y-2 text-xs text-text-muted">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Both seeking to build full-stack architectures with Node.js and React.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Overlapping availability on Tuesday and Thursday evenings (6–9 PM).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Equal target commitment of 10–12 hours per week for capstone term.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-text-amber shrink-0 mt-0.5" aria-hidden="true" />
                    <span>Complementary experience: Frontend UI focus paired with Backend API design.</span>
                  </li>
                </ul>
              </div>
            </CardContent>

            <CardFooter>
              <div className="flex items-center gap-2">
                <Badge variant="amber">High Compatibility</Badge>
              </div>
              <Button variant="primary" size="sm">
                Request Connection
              </Button>
            </CardFooter>
          </Card>

          {/* Interactive Form Controls & Tokens Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive UI Elements</CardTitle>
              <CardDescription>
                Standardized inputs, buttons, and accessibility indicators.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Input
                  label="Search Competency or Course"
                  placeholder="e.g. Distributed Systems, CS 210..."
                  value={demoInput}
                  onChange={(e) => setDemoInput(e.target.value)}
                  hint="Type to test input focus ring and typography"
                />

                <Input
                  label="Institutional Email"
                  placeholder="student@university.edu"
                  defaultValue=""
                  hint="Requires recognized university domain"
                />
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-text-main tracking-wide">
                  Button Hierarchy
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" size="sm">
                    Primary Button
                  </Button>
                  <Button variant="secondary" size="sm">
                    Secondary Outline
                  </Button>
                  <Button variant="ghost" size="sm">
                    Ghost Link
                  </Button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="block text-xs font-medium text-text-main tracking-wide">
                  Tag & Badge Variants
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">DM Sans 12px</Badge>
                  <Badge variant="amber">Amber Status</Badge>
                  <Badge variant="match">94% Project Fit</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

export default LandingShell;

