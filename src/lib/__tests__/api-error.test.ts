import { describe, it, expect } from "vitest";
import { ApiError, formatErrorResponse, generateRequestId, INTERNAL_ERROR, VALIDATION_ERROR } from "../api-error";

describe("ApiError class", () => {
  it("creates an error with code, message, and statusCode", () => {
    const err = new ApiError("Not found", "NOT_FOUND", 404);
    expect(err.message).toBe("Not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.statusCode).toBe(404);
    expect(err.name).toBe("ApiError");
    expect(err).toBeInstanceOf(Error);
  });
});

describe("formatErrorResponse", () => {
  const requestId = "test-request-id-123";

  it("returns structured response for ApiError instances", async () => {
    const err = new ApiError("Validation failed", VALIDATION_ERROR, 400);
    const response = formatErrorResponse(err, requestId);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe(VALIDATION_ERROR);
    expect(body.error.message).toBe("Validation failed");
    expect(body.error.requestId).toBe(requestId);
  });

  it("returns INTERNAL_ERROR with generic message for generic Error", async () => {
    const err = new Error("sensitive database connection string leaked");
    const response = formatErrorResponse(err, requestId);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe(INTERNAL_ERROR);
    expect(body.error.message).toBe("An internal error occurred");
    expect(body.error.requestId).toBe(requestId);
    // Verify no sensitive info leaked
    expect(JSON.stringify(body)).not.toContain("database");
    expect(JSON.stringify(body)).not.toContain("sensitive");
  });

  it("returns INTERNAL_ERROR with generic message for string thrown", async () => {
    const response = formatErrorResponse("some random string error", requestId);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe(INTERNAL_ERROR);
    expect(body.error.message).toBe("An internal error occurred");
    expect(body.error.requestId).toBe(requestId);
  });

  it("returns INTERNAL_ERROR for unknown thrown values", async () => {
    const response = formatErrorResponse(undefined, requestId);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe(INTERNAL_ERROR);
    expect(body.error.message).toBe("An internal error occurred");
  });

  it("never includes stack traces in the response", async () => {
    const err = new Error("Something went wrong");
    err.stack = "Error: Something went wrong\n    at Object.<anonymous> (/app/src/lib/db.ts:42:13)";
    const response = formatErrorResponse(err, requestId);
    const body = await response.json();
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toContain("stack");
    expect(bodyStr).not.toContain("/app/src/lib");
    expect(bodyStr).not.toContain("Object.<anonymous>");
  });

  it("never includes raw error messages for non-ApiError errors", async () => {
    const err = new Error("SELECT * FROM users WHERE id = 1; -- SQL injection attempt");
    const response = formatErrorResponse(err, requestId);
    const body = await response.json();
    expect(body.error.message).toBe("An internal error occurred");
    expect(JSON.stringify(body)).not.toContain("SQL");
    expect(JSON.stringify(body)).not.toContain("SELECT");
  });
});

describe("generateRequestId", () => {
  it("returns a UUID format string", () => {
    const id = generateRequestId();
    // UUID v4 format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it("returns unique values on successive calls", () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    expect(id1).not.toBe(id2);
  });
});
