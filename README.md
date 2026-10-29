# SkillSync

SkillSync is an explainable academic collaboration platform that matches university students across three distinct modes:
1. **Project Collaboration**: Team formation for capstone projects, hackathons, and research initiatives.
2. **Study Buddies**: Peer exam preparation and study squad discovery based on course enrollment, topics, and study styles.
3. **SkillSwap**: Genuine peer tutoring enforcing strict bilateral reciprocity (you teach what your partner wants, and they teach what you want).

---

## Architecture & Technology Stack

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT authentication in HTTP-only cookies, Helmet, Rate Limiting.
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Dark/Light theme support.
- **Matching Engine**: Pure JavaScript deterministic compatibility engine (`backend/src/services/matching/compatibilityEngine.js`). All scores range from 0–100% and generate grounded factor breakdowns and explainable match reasons.

---

## Live Presentation Demo Dataset

SkillSync includes a safe, idempotent demo seeder to populate the real database-backed recommendation pages with synthetic candidates calibrated directly against an existing student profile (the "anchor").

### Prerequisites
1. Ensure MongoDB is running locally (`mongodb://127.0.0.1:27017/skillsync`).
2. Have an existing registered student account with a completed profile to use as the presentation anchor (e.g. `madishettytanish@gmail.com`).

### 1. Preview Demo Data (Dry-Run)
Run the seeder in preview mode to inspect predicted compatibility scores and candidate profiles without making any changes to the database:

```bash
# Windows PowerShell
$env:SKILLSYNC_DEMO_ANCHOR_EMAIL="madishettytanish@gmail.com"
npm --prefix backend run seed:demo

# Or pass via CLI argument:
npm --prefix backend run seed:demo -- --anchor=madishettytanish@gmail.com
```

### 2. Confirm and Apply Seed Data
To apply the synthetic records to your local development database, pass the `--confirm` flag or set `SKILLSYNC_DEMO_SEED_CONFIRM=YES`:

```bash
# Windows PowerShell
$env:SKILLSYNC_DEMO_ANCHOR_EMAIL="madishettytanish@gmail.com"
$env:SKILLSYNC_DEMO_SEED_CONFIRM="YES"
npm --prefix backend run seed:demo

# Or directly in one command:
npm --prefix backend run seed:demo -- --anchor=madishettytanish@gmail.com --confirm
```

This creates:
- **3 Study Buddy Candidates**: `Ananya Rao (Demo)`, `Aarav Mehta (Demo)`, and `Diya Shah (Demo)` with varied compatibility scores (~85%, ~60%, ~47%).
- **3 SkillSwap Partners**: `Kabir Shah (Demo)`, `Mira Iyer (Demo)`, and `Rohan Verma (Demo)` strictly satisfying mutual teach-and-learn reciprocity (~97%, ~75%, ~64%).
- **3 Open Demo Projects**: `[DEMO] Campus Study Planner`, `[DEMO] Collaborative Learning Dashboard`, and `[DEMO] Peer Skill Exchange Toolkit`.
- **3 Sample Collaboration Requests**:
  - 1 pending received Study Buddy invitation from Ananya Rao.
  - 1 pending sent SkillSwap proposal to Kabir Shah.
  - 1 accepted Study Buddy request from Aarav Mehta.

### 3. Start the Workspace & Demonstrate

Start the backend and frontend development servers:

```bash
# Start backend (Port 5000)
npm --prefix backend run dev

# Start frontend (Port 5173)
npm --prefix frontend run dev
```

1. Open `http://localhost:5173` in your browser.
2. Sign in with the anchor account (`madishettytanish@gmail.com`).
3. Navigate through the workspace tracks:
   - **Dashboard**: View overall collaboration readiness and active status pills.
   - **Projects**: Browse open projects and inspect compatibility breakdowns.
   - **Study Buddies**: Discover candidates enrolled in your course and study schedules.
   - **SkillSwap**: Review reciprocal teaching coverage and send swap proposals.
   - **Requests**: Review incoming, outgoing, and accepted collaboration requests.

### 4. Clean Up Synthetic Demo Data
After your presentation, safely remove all demo records without affecting your anchor account or any ordinary student data:

```bash
npm --prefix backend run seed:clean

# Or via the script directly:
npm --prefix backend run seed:demo -- --clean
```

---

## Verification & Testing

Run the full test suite and production build:

```bash
# Run all backend unit and integration tests (268 tests)
npm --prefix backend test

# Run frontend production build
npm --prefix frontend run build
```
