# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-03-27

### Changed

- Updated GitHub Actions runner from `node20` to `node24`
- Documented Node 24 runtime compatibility requirement for older self-hosted runners / GHES users (recommend pinning to `v0.1.3` until runner upgrade)
- Updated `@actions/core` from `1.10.1` to `2.0.3`
- Updated `@actions/github` from `6.0.0` to `8.0.1`
- Updated `typescript` from `5.4.3` to `5.9.3` (ES2024 target)
- Updated `jest` from `29.7.0` to `30.3.0`
- Updated `msw` from `2.2.13` to `2.12.14`

### Added

- Expanded test coverage: strategy detection, bracket/case/fallback options, custom keywords

### Removed

- Removed unused `nock` dev dependency

### Security

- Fixed 15 Dependabot alerts:
  - 9× `undici` CVEs — resolved by `@actions/github@8` shipping `undici@^6.23.0`
  - 3× `@octokit/*` ReDoS vulnerabilities — resolved by updated `@octokit` chain
  - `minimatch` ReDoS — resolved via pinned override `minimatch@10.2.4`; Jest coverage switched to V8 provider to avoid legacy Istanbul minimatch incompatibility during test instrumentation
  - `cookie` invalid character injection — resolved by `msw@2.12.14` already pulling `cookie@1.1.1`
  - `js-yaml` prototype pollution — resolved by transitive `js-yaml@3.14.2` via `@istanbuljs/load-nyc-config` (patched range)

## [0.1.3] - 2024-01-01

Initial public release.
