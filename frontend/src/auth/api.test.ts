import { afterEach, describe, expect, it } from "vitest";

import { parseOAuthHash } from "./api";

describe("parseOAuthHash", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("reads a hash token and clears the hash", () => {
    window.history.replaceState(null, "", "/#access_token=abc&token_type=bearer");

    expect(parseOAuthHash()).toEqual({ accessToken: "abc" });
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/");
  });

  it("reads auth_error_code and keeps the path and query", () => {
    window.history.replaceState(null, "", "/welcome?next=1#auth_error_code=invalid_oauth_state");

    expect(parseOAuthHash()).toEqual({ authErrorCode: "invalid_oauth_state" });
    expect(window.location.hash).toBe("");
    expect(window.location.pathname + window.location.search).toBe("/welcome?next=1");
  });
});
