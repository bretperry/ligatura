# Releasing

Pushing a version tag publishes to npm through `.github/workflows/publish.yml`. npm trusts the
workflow directly (trusted publishing), so there is no token, OTP or passkey step.

1. Bump the version: `npm version patch --no-git-tag-version` (or `minor`), then commit.
2. Tag and push: `git tag v$(node -p 'require("./package.json").version') && git push && git push --tags`.
3. Watch the run: `gh run watch`. The job fails if the tag and `package.json` disagree.

## One-time setup (done on npmjs.com by the owner)

- npmjs.com → ligatura → Settings → Trusted Publisher → GitHub Actions.
- Organization or user: `bretperry`. Repository: `ligatura`. Workflow filename: `publish.yml`.
  Environment: `npm`.
- Optional, after the first run works: under Publishing access, choose "Require two-factor
  authentication and disallow tokens", so only this workflow can publish.
