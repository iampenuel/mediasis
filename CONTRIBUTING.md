# Contributing to Mediasis

Thanks for helping improve Mediasis.
This repo is public and portfolio-open: issues and PRs are welcome, while maintainers control merge decisions.

## Development Setup
1. Install dependencies:
   ```bash
   npm ci
   ```
2. Create local env file:
   ```bash
   cp .env.example .env
   ```
3. Start iOS preview:
   ```bash
   npm run ios:preview
   ```

## Branch Naming
Use one of these prefixes:
- `feat/<short-description>`
- `fix/<short-description>`
- `chore/<short-description>`
- `docs/<short-description>`
- `test/<short-description>`

## Commit Convention (Conventional Commits)
Use:

```text
<type>(optional-scope): <short summary>
```

Examples:
- `feat(auth): add password reset route`
- `fix(sync): handle offline retry backoff`
- `docs(readme): add preview gallery`

Common types:
- `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`

## Pull Request Checklist
Before opening a PR, run:

```bash
npm run ci:check
```

PRs should include:
- Clear summary of change and motivation
- Linked issue (if applicable)
- Screenshots or video for UI changes
- Notes on risks, edge cases, and rollback behavior

## Code Quality Expectations
- Keep changes focused and reviewable.
- Avoid unrelated refactors in the same PR.
- Preserve mobile-first behavior and existing design language.
- Do not commit secrets or personal credentials.

## Reporting Issues
Use GitHub issue templates:
- Bug report
- Feature request

Provide reproducible steps and expected vs actual behavior.
