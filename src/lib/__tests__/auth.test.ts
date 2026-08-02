import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { requireAuth, isDemoMode, rejectMutationInDemo } from "../auth";

function makeRequest(url: string, options?: { method?: string; headers?: Record<string, string> }): NextRequest {
  const { method = "GET", headers = {} } = options || {};
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers: new Headers(headers),
  });
}

describe("requireAuth", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns null (pass) when AUTH_SECRET is not configured (local dev mode)", () => {
    delete process.env.AUTH_SECRET;
    const req = makeRequest("/api/jobs");
    const result = requireAuth(req);
    expect(result).toBeNull();
  });

  it("returns 401 response when no Authorization header", async () => {
    process.env.AUTH_SECRET = "my-secret-token";
    const req = makeRequest("/api/jobs");
    const result = requireAuth(req);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Missing authorization header");
  });

  it("returns 401 when token does not match AUTH_SECRET", async () => {
    process.env.AUTH_SECRET = "my-secret-token";
    const req = makeRequest("/api/jobs", {
      headers: { Authorization: "Bearer wrong-token" },
    });
    const result = requireAuth(req);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const body = await result!.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(body.error.message).toContain("Invalid authorization token");
  });

  it("returns null (pass) when token matches AUTH_SECRET", () => {
    process.env.AUTH_SECRET = "my-secret-token";
    const req = makeRequest("/api/jobs", {
      headers: { Authorization: "Bearer my-secret-token" },
    });
    const result = requireAuth(req);
    expect(result).toBeNull();
  });
});

describe("isDemoMode", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true when DEMO_MODE=true", () => {
    process.env.DEMO_MODE = "true";
    expect(isDemoMode()).toBe(true);
  });

  it("returns false when DEMO_MODE is not set", () => {
    delete process.env.DEMO_MODE;
    expect(isDemoMode()).toBe(false);
  });

  it("returns false when DEMO_MODE is 'false'", () => {
    process.env.DEMO_MODE = "false";
    expect(isDemoMode()).toBe(false);
  });

  it("returns false when DEMO_MODE is any other value", () => {
    process.env.DEMO_MODE = "1";
    expect(isDemoMode()).toBe(false);
  });
});

describe("rejectMutationInDemo", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, DEMO_MODE: "true" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns 403 for POST when DEMO_MODE=true", async () => {
    const req = makeRequest("/api/jobs", { method: "POST" });
    const result = rejectMutationInDemo(req);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
    const body = await result!.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toContain("demo mode");
  });

  it("returns 403 for PUT when DEMO_MODE=true", async () => {
    const req = makeRequest("/api/jobs", { method: "PUT" });
    const result = rejectMutationInDemo(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns 403 for DELETE when DEMO_MODE=true", async () => {
    const req = makeRequest("/api/jobs", { method: "DELETE" });
    const result = rejectMutationInDemo(req);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("returns null for GET even when DEMO_MODE=true", () => {
    const req = makeRequest("/api/jobs", { method: "GET" });
    const result = rejectMutationInDemo(req);
    expect(result).toBeNull();
  });

  it("returns null for any method when DEMO_MODE is not true", () => {
    process.env.DEMO_MODE = "false";
    const req = makeRequest("/api/jobs", { method: "POST" });
    const result = rejectMutationInDemo(req);
    expect(result).toBeNull();
  });
});
