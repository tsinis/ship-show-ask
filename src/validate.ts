import * as core from "@actions/core";
import * as github from "@actions/github";
import { RequestError } from "@octokit/request-error";
import { Context } from "@actions/github/lib/context";

interface ValidateTitleOptions {
  token: string;
  context: Context;
  prNumber?: number;
  shipKeyword?: string;
  showKeyword?: string;
  askKeyword?: string;
  caseSensitive?: boolean;
  addLabel?: boolean;
  requireBrackets?: boolean;

  // This lets us use the native fetch function in tests. @actions/github swaps out
  // the default fetch implementation with its own, which doesn't work with msw.
  octokitOpts?: Parameters<typeof github.getOctokit>[1];
}

export async function validate({
  token,
  context,
  prNumber,
  shipKeyword = "ship",
  showKeyword = "show",
  askKeyword = "ask",
  caseSensitive = false,
  addLabel = true,
  requireBrackets = true,

  octokitOpts, // For testing.
}: ValidateTitleOptions): Promise<boolean> {
  if (!prNumber) {
    prNumber = context.payload.pull_request?.number;
  }

  if (!prNumber) {
    core.setFailed(
      "Event payload missing `pull_request` key, and no `pull-request-number` provided as input." +
        "Make sure you're triggering this action on the `pull_request` or `pull_request_target` events.",
    );
    return false;
  }

  const client = github.getOctokit(token, octokitOpts);

  try {
    const { owner, repo } = context.repo;

    core.info(`Fetching pull request information`);
    const { data: pr } = await client.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    core.info(`Adding label to pull request`);
    await client.rest.issues.addLabels({
      owner,
      repo,
      issue_number: prNumber,
      labels: ["validated"],
    });
    core.info(`Adding label to pull request`);

    // TODO!: Implement title checking logic here.
    return pr.title.trim() !== "";
  } catch (error) {
    if (error instanceof RequestError) {
      switch (error.status) {
        case 401:
          core.setFailed(
            `${error.message}. Please check that the \`github-token\` input ` +
              "parameter is set correctly.",
          );
          break;
        case 403:
          core.setFailed(
            `${error.message}. In some cases, the GitHub token used for actions triggered ` +
              "from `pull_request` events are read-only, which can cause this problem. " +
              "Switching to the `pull_request_target` event typically resolves this issue.",
          );
          break;
        case 404:
          core.setFailed(
            `${error.message}. This typically means the token you're using doesn't have ` +
              "access to this repository. Use the built-in `${{ secrets.GITHUB_TOKEN }}` token " +
              "or review the scopes assigned to your personal access token.",
          );
          break;
        case 422:
          core.setFailed(
            `${error.message}. This typically happens when you try to approve the pull ` +
              "request with the same user account that created the pull request. Try using " +
              "the built-in `${{ secrets.GITHUB_TOKEN }}` token, or if you're using a personal " +
              "access token, use one that belongs to a dedicated bot account.",
          );
          break;
        default:
          core.setFailed(`Error (code ${error.status}): ${error.message}`);
      }
      return false;
    }

    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed("Unknown error");
    }
    return false;
  }
}
