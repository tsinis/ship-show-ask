import * as core from "@actions/core";
import * as github from "@actions/github";
import { Strategy } from "./types/strategy";
import { Context } from "@actions/github/lib/context";
import { RequestError } from "@octokit/request-error";

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
  fallbackToAsk?: boolean;

  // This lets us use the native fetch function in tests. @actions/github swaps out
  // the default fetch implementation with its own, which doesn't work with msw.
  octokitOpts?: Parameters<typeof github.getOctokit>[1];
}

export async function validate({
  token,
  context,
  prNumber,
  shipKeyword = Strategy.Ship,
  showKeyword = Strategy.Show,
  askKeyword = Strategy.Ask,
  caseSensitive = false,
  addLabel = true,
  requireBrackets = true,
  fallbackToAsk = false,

  octokitOpts, // For testing.
}: ValidateTitleOptions): Promise<Strategy | undefined> {
  if (!prNumber) prNumber = context.payload.pull_request?.number;

  if (!prNumber) {
    core.setFailed(
      "Event payload missing `pull_request` key, and no `pull-request-number` provided as input." +
        "Make sure you're triggering this action on the `pull_request` or `pull_request_target` events.",
    );
    return undefined;
  }

  let strategy: Strategy | undefined = undefined;
  fallbackToAsk = fallbackToAsk !== undefined ? fallbackToAsk : false;
  const client = github.getOctokit(token, octokitOpts);
  const regex = buildRegexPattern(
    shipKeyword || Strategy.Ship,
    showKeyword || Strategy.Show,
    askKeyword || Strategy.Ask,
    requireBrackets !== undefined ? requireBrackets : true,
    caseSensitive !== undefined ? caseSensitive : false,
  );

  try {
    const { owner, repo } = context.repo;
    core.info(`Fetching pull request information`);
    const { data: pr } = await client.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    const title = pr.title.trim();
    const match = title.match(regex);

    if (!match) return logAndExit("No keyword match found!", fallbackToAsk);

    // Extract the keyword from the match
    // If using the above regex, the keyword will be in one of these groups
    const keyword = requireBrackets
      ? match[2] || match[4] || match[6]
      : match[0];

    if (!keyword) return logAndExit("No brackets match found!", fallbackToAsk);
    switch (keyword.toLowerCase()) {
      case shipKeyword.toLowerCase():
        console.log("Detected Strategy.Ship");
        strategy = Strategy.Ship;
        break;
      case showKeyword.toLowerCase():
        console.log("Detected Strategy.Show");
        strategy = Strategy.Show;
        break;
      case askKeyword.toLowerCase():
        console.log("Detected Strategy.Ask");
        strategy = Strategy.Ask;
        break;
      default:
        return logAndExit("No matching keyword found!", fallbackToAsk);
    }

    addLabel = addLabel !== undefined ? addLabel : true;
    if (addLabel) {
      await client.rest.issues.addLabels({
        labels: [strategy],
        owner,
        repo,
        issue_number: prNumber,
      });
    }

    return strategy;
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
      return undefined;
    }

    if (error instanceof Error) {
      core.setFailed(error);
    } else {
      core.setFailed("Unknown error");
    }
    return undefined;
  }
}

function logAndExit(message: string, fallbackToAsk: boolean) {
  console.log(message);
  return fallbackToAsk ? Strategy.Ask : undefined;
}

function buildRegexPattern(
  shipKeyword: string,
  showKeyword: string,
  askKeyword: string,
  requireBrackets: boolean,
  caseSensitive: boolean,
): RegExp {
  const pattern = [shipKeyword, showKeyword, askKeyword].join("|");
  const bracketPattern = requireBrackets
    ? `\\[((${pattern}))\\]|\\(((${pattern}))\\)|\\{((${pattern}))\\}`
    : pattern;
  return new RegExp(bracketPattern, caseSensitive ? undefined : "i");
}
