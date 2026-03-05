# AI Engineering Playbook (Mediasis)

This project is intentionally built as an AI-assisted engineering case study.
The goal is not just to ship UI quickly, but to show structured thinking: constraints, verification, and root-cause debugging.

## AI Stack and Ownership
- **Gemini:** used for visual ideation and UI asset generation.
- **Codex (GPT-5.x):** used for implementation acceleration, native troubleshooting, and repo automation tasks.
- **Human ownership (Penuel):** product direction, architecture decisions, prompt design, evaluation criteria, and final technical judgment.

## Prompt Engineering Pattern Used
1. **Define objective + success criteria**
   - Example: "App must run from splash to login/home in iOS dev client without native module crashes."
2. **Constrain execution path**
   - Pin runtime/tool versions, specify simulator/device, and require deterministic command flow.
3. **Force root-cause behavior**
   - Ask for dependency/config/native rebuild fixes instead of quick workarounds.
4. **Require verification evidence**
   - Typecheck/lint/tests/build plus runtime validation in simulator.
5. **Capture residual risk**
   - Explicitly document what is still fragile and what guardrails reduce risk.

## Example Problem-Solving Loops
- Stabilized Expo iOS dev preview after native module/linking regressions.
- Added CI quality gates (`typecheck`, `lint`, `test`, `build-web`) and deterministic scripts.
- Built repo governance and recruiter-facing project presentation.
- Diagnosed failing native CI behavior by tracing job-step boundaries and adjusting Pod/Node environment assumptions.

## What this repo shows
This repository demonstrates practical AI engineering skills beyond prompting:
- translating product intent into technical constraints,
- orchestrating multiple LLMs/tools effectively,
- validating outputs with measurable checks,
- and shipping maintainable software under changing requirements.
