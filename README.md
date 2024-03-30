# Ship/Show/Ask GitHub Action

[![CI](https://github.com/tsinis/ship-show-ask/actions/workflows/ci.yml/badge.svg?event=push)](https://github.com/tsinis/ship-show-ask/actions/workflows/ci.yml)

**Name:** `tsinis/ship-show-ask`

This is a fork of the [Auto Approve](https://github.com/marketplace/actions/auto-approve) GitHub Action adjusted for a Ship, Show, Ask branching strategy.

## Usage instructions

Create a workflow file (e.g. `.github/workflows/ship-show-ask.yml`) that contains a step that `uses: tsinis/ship-show-ask@v0.1.0`. Here's an example workflow file:

```yaml
name: Auto approve Ship/Show PRs
on: pull_request_target

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - uses: tsinis/ship-show-ask@v0.1.0
        with:
          ship-keyword: 'lgtm' # optional, default to 'ship'
          show-keyword: 'lgty' # optional, default to 'show'
          ask-keyword: 'check' # optional, default to 'ask'
          case-sensitive: true # optional, default to false
          add-label: false # optional, default to true
          require-brackets: false # optional, default to true
          fallback-to-ask: true # optional, default to false
```

In this example, the action is configured to recognize 'lgtm', 'lgty', and 'check' as the keywords for the respective strategies. The keywords are case-sensitive, a label will not be added to the pull request based on the strategy, the keywords doesn't require brackets, and if no keyword is detected, the action will fallback to the Ask strategy.

You can customize these options by changing the values in the `with` block.

> [!TIP]
> All of these inputs are optional, and if not provided, the action will use the default values.

### Inputs

- `ship-keyword`: The keyword for the Ship strategy. Default is 'ship'.
- `show-keyword`: The keyword for the Show strategy. Default is 'show'.
- `ask-keyword`: The keyword for the Ask strategy. Default is 'ask'.
- `case-sensitive`: Whether the keywords are case-sensitive. Default is 'false'.
- `add-label`: Whether to add a label to the pull request based on the strategy. Default is 'true'.
- `require-brackets`: Whether the keywords require brackets. Default is 'true'.
- `fallback-to-ask`: Whether to fallback to the Ask strategy if no keyword is detected. Default is 'false'.

### Other examples

You can combine action with an `if` clause to only ship-show-ask certain users. For example, to ship-show-ask [Dependabot][dependabot] pull requests, use:

```yaml
name: Ship/Show Dependabot PRs
on: pull_request_target

jobs:
  ship-show-ask:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    if: github.actor == 'dependabot[bot]'
    steps:
      - uses: tsinis/ship-show-ask@v0.1.0
```

If you want to use this action from a workflow file that doesn't run on the `pull_request` or `pull_request_target` events, use the `pull-request-number` input:

```yaml
name: Auto approve Ship/Show PRs

on:
  workflow_dispatch:
    inputs:
      pullRequestNumber:
        description: Pull request number for ship-show-ask
        required: false

jobs:
  ship-show-ask:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
    - uses: tsinis/ship-show-ask@v0.1.0
      with:
        pull-request-number: ${{ github.event.inputs.pullRequestNumber }}
```

Optionally, you can provide a message for the review:

```yaml
name: Ship/Show Dependabot PRs with a message
on: pull_request_target

jobs:
  ship-show-ask:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    if: github.actor == 'dependabot[bot]'
    steps:
      - uses: tsinis/ship-show-ask@v0.1.0
        with:
          review-message: "Auto approved automated PR (from Dependabot)"
```

### Approving on behalf of a different user

By default, this will use the [automatic GitHub token](https://docs.github.com/en/actions/security-guides/automatic-token-authentication) that's provided to the workflow. This means the approval will come from the "github-actions" bot user. Make sure you enable the `pull-requests: write` permission in your workflow.

To approve the pull request as a different user, pass a GitHub Personal Access Token into the `github-token` input. In order to approve the pull request, the token needs the `repo` scope enabled.

```yaml
name: Auto approve Ship/Show PRs
on: pull_request_target

jobs:
  ship-show-ask:
    runs-on: ubuntu-latest
    steps:
      - uses: tsinis/ship-show-ask@v0.1.0
        with:
          github-token: ${{ secrets.SOME_USERS_PAT }}
```

### Approving Dependabot pull requests

When a workflow is run in response to a Dependabot pull request using the `pull_request` event, the workflow won't have access to secrets. If you're trying to use a Personal Access Token (as above) but getting an error on Dependabot pull requests, this is probably why.

Fortunately the fix is simple: use the `pull_request_target` event instead of `pull_request`. This runs the workflow in the context of the base branch of the pull request, which does have access to secrets.

## Why?

GitHub lets you prevent merges of unapproved pull requests. However, it's occasionally useful to selectively circumvent this restriction - for instance, some people want Dependabot's automated pull requests to not require approval.

[dependabot]: https://github.com/marketplace/dependabot

## Code owners

If you're using a [CODEOWNERS file](https://docs.github.com/en/github/creating-cloning-and-archiving-repositories/about-code-owners), you'll need to give this action a personal access token for a user listed as a code owner. Rather than using a real user's personal access token, you're probably better off creating a dedicated bot user, and adding it to a team which you assign as the code owner. That way you can restrict the bot user's permissions as much as possible, and your workflow won't break when people leave the team.

## Development and release process

Each major version corresponds to a branch (e.g. `v0.1`, `v1.0`). Releases are tagged with semver-style version numbers (e.g. `v1.2.3`).
