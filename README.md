<div align="center">
  <img src="docs/media/logo.jpg" alt="Mediasis Koala logo" width="220" />

# Mediasis

### Master clinical vocabulary, one streak at a time.

[![CI](https://github.com/iampenuel/mediasis/actions/workflows/ci.yml/badge.svg)](https://github.com/iampenuel/mediasis/actions/workflows/ci.yml)

</div>

Mediasis is a mobile-first medical terminology trainer inspired by game-like daily progress loops.
It helps learners build lasting clinical vocabulary through adaptive review, weak-area targeting, and short sessions designed for real study behavior.

This repository is also an **AI engineering portfolio project**.
UI assets and visual elements were generated with Gemini, implementation/debugging velocity came from Codex (GPT-5.x), and final architecture, prompt strategy, tradeoff decisions, and validation were led by me.

## AI Engineering and Prompting Focus
I treated LLMs as collaborators, not autopilot.
- I defined hard constraints and acceptance criteria before each task.
- I required root-cause fixes (not hacks) for runtime/native issues.
- I enforced verification loops (`typecheck`, `lint`, `test`, `build:web`, simulator validation).
- I documented residual risks and follow-up actions.

Full breakdown: [docs/ai-engineering-playbook.md](docs/ai-engineering-playbook.md)

## Why Mediasis Exists
Learning clinical terms is high-volume and high-friction.
Traditional memorization tools do not adapt well to what you miss, when you miss it, and how quickly you need to recover before exams or rounds.

Mediasis is built to solve that by combining:
- Fast daily lessons with immediate feedback.
- Spaced repetition logic that brings missed terms back sooner.
- Weak-area practice that focuses your limited study time.
- A mobile-first UX tuned for students and early-career clinicians.

## Who This Is For
- Medical students
- PA students
- Young clinical professionals
- Recruiters and teams evaluating AI-enabled product engineering execution

## Core Product Capabilities
- Daily lesson queue with XP progression
- Quick review and weak-area drill modes
- Category-focused practice sessions
- Searchable personal term library
- Offline-tolerant state with sync-ready architecture

## Preview
![Mediasis demo preview](docs/media/demo/mediasis-demo.gif)

Full demo video: [Watch the complete Mediasis flow](docs/media/demo/mediasis-demo.mov)

## Sample Learning Flow
| Adaptive review feedback loop | Weak-area MCQ correction loop |
| --- | --- |
| ![Sample review flow](docs/media/preview/sample-use-review-correct.png) | ![Sample weak-area flow](docs/media/preview/sample-use-weak-area-mcq.png) |

These are real in-app examples of the two loops that drive retention:
- identify what is due, make a quick confidence call, and get immediate reinforcement;
- revisit weak terms with targeted multiple-choice correction and follow-up explanation.

## UI Gallery
| Login | Home | Practice |
| --- | --- | --- |
| ![Login screen](docs/media/preview/login.png) | ![Home screen](docs/media/preview/home.png) | ![Practice screen](docs/media/preview/practice.png) |

| Library | Profile | Splash |
| --- | --- | --- |
| ![Library screen](docs/media/preview/library.png) | ![Profile screen](docs/media/preview/profile.png) | ![Splash screen](docs/media/preview/splash.png) |

## Tech Stack
- **Framework:** Expo + React Native + Expo Router
- **Language:** TypeScript
- **State/Data:** React Query, local state stores
- **Persistence:** Expo SQLite + Supabase-backed sync path
- **Auth/Storage:** Expo Secure Store
- **Mobile focus:** iOS-first UX with Android support path

## Quick Start
### Prerequisites
- Node `20.20.0`
- npm
- Xcode + iOS Simulator (for iOS local preview)

### 1) Install dependencies
```bash
npm ci
```

### 2) Configure environment
Copy `.env.example` to `.env` and set values:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
SYNC_ENDPOINT=
EXPO_PUBLIC_SYNC_DIRECT_FALLBACK=false
```

### 3) Run iOS dev preview (prioritized path)
```bash
npm run ios:preview
```

### 4) Other run modes
```bash
npm run start
npm run android
npm run web
```

## Quality Checks
```bash
npm run typecheck
npm run lint
npm run test
npm run build:web
npm run ci:check
```

## Supabase Setup
See [supabase/README.md](supabase/README.md) for schema and sync endpoint setup.

## Project Ops
- Pull request template: [.github/pull_request_template.md](.github/pull_request_template.md)
- Issue templates: [.github/ISSUE_TEMPLATE](.github/ISSUE_TEMPLATE)
- Branch protection setup: [docs/branch-protection.md](docs/branch-protection.md)
- Release process: [docs/release-process.md](docs/release-process.md)

## Project Highlights
- AI-assisted product development with human-in-the-loop validation
- Prompt engineering for constrained execution and root-cause debugging
- End-to-end mobile UX and content-loop design
- Local-first architecture with optional cloud sync path
- CI quality gates for type, lint, tests, and build checks

## Roadmap
- Android UX parity pass and device matrix validation
- Better analytics on retention and weak-area recovery
- Audio pronunciation quality and speech interaction improvements
- More category packs and exam-aligned term tracks

## Disclaimer
Mediasis is an educational support tool and portfolio project.
It is **not** a clinical diagnostic or treatment system and should not be used for medical decision-making.
