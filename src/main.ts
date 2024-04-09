import * as core from "@actions/core";
import * as github from "@actions/github";
import { approve } from "./approve";
import { validate } from "./validate";
import { Strategy } from "./types/strategy";

export async function run() {
  try {
    const token = core.getInput("github-token");
    const reviewMessage = core.getInput("review-message");
    const pullRequestNumber = prNumber();

    const shipKeyword = core.getInput("ship-keyword");
    const showKeyword = core.getInput("show-keyword");
    const askKeyword = core.getInput("ask-keyword");
    const caseSensitive = core.getInput("case-sensitive") === "true";
    const addLabel = core.getInput("add-label") === "true";
    const requireBrackets = core.getInput("require-brackets") === "true";
    const fallbackToAsk = core.getInput("fallback-to-ask") === "true";
    const strategy = await validate({
      token,
      context: github.context,
      prNumber: pullRequestNumber,
      shipKeyword: shipKeyword || undefined,
      showKeyword: showKeyword || undefined,
      askKeyword: askKeyword || undefined,
      caseSensitive: caseSensitive,
      addLabel: addLabel,
      requireBrackets: requireBrackets,
      fallbackToAsk: fallbackToAsk,
    });
    if (strategy !== Strategy.Ship && strategy !== Strategy.Show) {
      return console.log(
        "This is not a Ship or Show PR! Skipping approval.",
        strategy,
      );
    }

    await approve({
      token,
      context: github.context,
      prNumber: pullRequestNumber,
      reviewMessage: reviewMessage || undefined,
    });
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed("Unknown error");
    }
  }
}

function prNumber(): number {
  if (core.getInput("pull-request-number") !== "") {
    const prNumber = parseInt(core.getInput("pull-request-number"), 10);
    if (Number.isNaN(prNumber)) {
      throw new Error("Invalid `pull-request-number` value");
    }
    return prNumber;
  }

  if (!github.context.payload.pull_request) {
    throw new Error(
      "This action must be run using a `pull_request` event or " +
        "have an explicit `pull-request-number` provided",
    );
  }
  return github.context.payload.pull_request.number;
}

if (require.main === module) {
  run();
}
