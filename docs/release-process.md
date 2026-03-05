# Release Process

Mediasis uses Semantic Versioning while pre-1.0:
- `v0.x.y`
- Increment `x` for feature milestones.
- Increment `y` for fixes/docs/chore releases.

## Steps

1. Update `CHANGELOG.md` under `[Unreleased]`.
2. Move release notes into a new version section with date.
3. Commit:
   ```bash
   git add .
   git commit -m "chore(release): v0.x.y"
   ```
4. Tag and push:
   ```bash
   git tag v0.x.y
   git push origin main --tags
   ```
5. GitHub Actions `release.yml` publishes a GitHub Release for the tag.

## Cadence

Milestone-based cadence:
- Every 2–4 weeks, or
- When a feature bundle meaningfully improves user value.
