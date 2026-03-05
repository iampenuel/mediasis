# Branch Protection Checklist (`main`)

Configure these in GitHub:

1. Require a pull request before merging.
2. Require status checks to pass before merging.
3. Set required checks:
- `typecheck`
- `lint`
- `test`
- `build-web`
4. Block force pushes.
5. Block branch deletion.
6. (Optional) Require conversation resolution before merge.

For a solo-maintainer portfolio repo, approvals can stay optional while checks remain required.
