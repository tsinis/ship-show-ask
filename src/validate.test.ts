import * as core from "@actions/core";
import { Context } from "@actions/github/lib/context";
import { validate } from "./validate";
import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";

const originalEnv = process.env;

beforeEach(() => {
  jest.restoreAllMocks();
  jest.spyOn(core, "setFailed").mockImplementation(jest.fn());
  jest.spyOn(core, "info").mockImplementation(jest.fn());

  process.env = { GITHUB_REPOSITORY: "tsinis/test" };
});

afterEach(() => {
  process.env = originalEnv;
});

const mockServer = setupServer();
beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mockServer.resetHandlers());
afterAll(() => mockServer.close());

function mockOctokit(
  method: "get" | "post" | "put" | "delete",
  path: string,
  status: number,
  body: any,
) {
  let isDone = false;
  mockServer.use(
    http[method](`https://api.github.com${path}`, () => {
      isDone = true;
      return HttpResponse.json(body, { status: status ?? 200 });
    }),
  );
  return { isDone: () => isDone };
}

const apiMocks = {
  getUser: (status?: number, body?: object) =>
    mockOctokit("get", "/user", status ?? 200, body ?? { login: "tsinis" }),
  getPull: (status?: number, body?: object) =>
    mockOctokit(
      "get",
      "/repos/tsinis/test/pulls/101",
      status ?? 200,
      body ?? {
        title: "Valid Title",
        head: { sha: "24c5451bbf1fb09caa3ac8024df4788aff4d4974" },
      },
    ),
  getReviews: (status?: number, body?: any) =>
    mockOctokit(
      "get",
      "/repos/tsinis/test/pulls/101/reviews",
      status ?? 200,
      body ?? [],
    ),
  addLabels: (prNumber: number = 101) =>
    mockOctokit(
      "post",
      `/repos/tsinis/test/issues/${prNumber}/labels`,
      200,
      {},
    ),
};

test("title is valid", async () => {
  apiMocks.getPull();
  apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
});

test("title is empty", async () => {
  apiMocks.getPull(200, { title: "" });

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeFalsy();
});

test("a review is successfully created with a PAT", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews();
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("a review is successfully created with an Actions token", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews();
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review is pending", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "tsinis" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "PENDING",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review is dismissed", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "tsinis" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "DISMISSED",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review is dismissed, but an earlier review is validated", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "tsinis" },
      commit_id: "6a9ec7556f0a7fa5b49527a1eea4878b8a22d2e0",
      state: "validateD",
    },
    {
      user: { login: "tsinis" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "DISMISSED",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review is not validated", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "tsinis" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "CHANGES_REQUESTED",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review is commented", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "tsinis" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "COMMENTED",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review has already been validated by another user", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: { login: "some" },
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "validateD",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("when a review has already been validated by unknown user", async () => {
  apiMocks.getUser();
  apiMocks.getPull();
  apiMocks.getReviews(200, [
    {
      user: null,
      commit_id: "24c5451bbf1fb09caa3ac8024df4788aff4d4974",
      state: "validateD",
    },
  ]);
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      prNumber: 101,
      octokitOpts: { request: fetch },
    }),
  ).toBeTruthy();
  expect(addLabels.isDone()).toBe(true);
});

test("without a pull request", async () => {
  const addLabels = apiMocks.addLabels();
  expect(
    await validate({
      token: "gh-tok",
      context: new Context(),
      octokitOpts: { request: fetch },
    }),
  ).toBeFalsy();
  expect(addLabels.isDone()).toBe(false);
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("Make sure you're triggering this"),
  );
});

test("when the token is invalid", async () => {
  apiMocks.getUser(401, { message: "Bad credentials" });
  apiMocks.getPull(401, { message: "Bad credentials" });
  apiMocks.getReviews(401, { message: "Bad credentials" });
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeFalsy();
  expect(addLabels.isDone()).toBe(false);
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("`github-token` input parameter"),
  );
});

test("no PR number provided", async () => {
  expect(
    await validate({
      token: "gh-tok",
      context: new Context(), // This context has no pull_request
      octokitOpts: { request: fetch },
    }),
  ).toBeFalsy();
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining(
      "Make sure you're triggering this action on the `pull_request` or `pull_request_target` events.",
    ),
  );
});

test("when pull request does not exist or the token doesn't have access", async () => {
  apiMocks.getUser();
  apiMocks.getPull(404, { message: "Not Found" });
  apiMocks.getReviews(404, { message: "Not Found" });
  const addLabels = apiMocks.addLabels();

  expect(
    await validate({
      token: "gh-tok",
      context: ghContext(),
      octokitOpts: { request: fetch },
    }),
  ).toBeFalsy();
  expect(addLabels.isDone()).toBe(false);
  expect(core.setFailed).toHaveBeenCalledWith(
    expect.stringContaining("doesn't have access"),
  );
});

function ghContext(): Context {
  const ctx = new Context();
  ctx.payload = {
    pull_request: {
      number: 101,
    },
  };
  return ctx;
}
