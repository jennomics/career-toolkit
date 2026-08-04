import { describe, it, expect } from "vitest";
import { extractErrorMessage } from "../extract-error-message";

describe("extractErrorMessage", () => {
  describe("structured error objects (from formatErrorResponse)", () => {
    it("extracts message from { error: { code, message, requestId } }", () => {
      const data = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Company name is required",
          requestId: "abc-123",
        },
      };
      expect(extractErrorMessage(data)).toBe("Company name is required");
    });

    it("extracts message from { error: { code, message } } without requestId", () => {
      const data = {
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      };
      expect(extractErrorMessage(data)).toBe("Resource not found");
    });

    it("extracts message from { error: { message } } with only message field", () => {
      const data = { error: { message: "Something went wrong" } };
      expect(extractErrorMessage(data)).toBe("Something went wrong");
    });
  });

  describe("legacy string error responses", () => {
    it("returns string directly from { error: 'some string' }", () => {
      const data = { error: "Invalid request parameters" };
      expect(extractErrorMessage(data)).toBe("Invalid request parameters");
    });

    it("returns empty string when error is an empty string", () => {
      const data = { error: "" };
      // Empty string is falsy so we fall through to fallback
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns non-empty string values", () => {
      const data = { error: "Duplicate entry" };
      expect(extractErrorMessage(data)).toBe("Duplicate entry");
    });
  });

  describe("null and undefined inputs", () => {
    it("returns fallback for null data", () => {
      expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
    });

    it("returns fallback for undefined data", () => {
      expect(extractErrorMessage(undefined)).toBe("An unexpected error occurred");
    });

    it("returns fallback when error field is null", () => {
      const data = { error: null };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when error field is undefined", () => {
      const data = { error: undefined };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback for empty object (no error field)", () => {
      const data = {};
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });
  });

  describe("missing or invalid fields", () => {
    it("returns fallback when error object has no message field", () => {
      const data = { error: { code: "VALIDATION_ERROR", requestId: "abc" } };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when message is empty string", () => {
      const data = { error: { code: "INTERNAL_ERROR", message: "" } };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when message is a number", () => {
      const data = { error: { message: 42 } };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when message is a boolean", () => {
      const data = { error: { message: true } };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when message is null", () => {
      const data = { error: { message: null } };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });
  });

  describe("fallback parameter behavior", () => {
    it("uses default fallback when not provided", () => {
      expect(extractErrorMessage(null)).toBe("An unexpected error occurred");
    });

    it("uses custom fallback when provided", () => {
      expect(extractErrorMessage(null, "Custom fallback")).toBe("Custom fallback");
    });

    it("uses custom fallback for missing error field", () => {
      expect(extractErrorMessage({}, "Network error")).toBe("Network error");
    });

    it("uses custom fallback for invalid error shape", () => {
      const data = { error: { code: "ERR" } };
      expect(extractErrorMessage(data, "Save failed")).toBe("Save failed");
    });

    it("does not use fallback when valid message exists", () => {
      const data = { error: { message: "Real error" } };
      expect(extractErrorMessage(data, "Should not see this")).toBe("Real error");
    });

    it("does not use fallback when error is a valid string", () => {
      const data = { error: "String error" };
      expect(extractErrorMessage(data, "Should not see this")).toBe("String error");
    });
  });

  describe("non-object error values", () => {
    it("returns fallback when error is a number", () => {
      const data = { error: 404 };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when error is a boolean", () => {
      const data = { error: true };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when error is an array", () => {
      const data = { error: ["error1", "error2"] };
      expect(extractErrorMessage(data)).toBe("An unexpected error occurred");
    });

    it("returns fallback when data is a string (not an object)", () => {
      expect(extractErrorMessage("some string")).toBe("An unexpected error occurred");
    });

    it("returns fallback when data is a number", () => {
      expect(extractErrorMessage(42)).toBe("An unexpected error occurred");
    });

    it("returns fallback when data is a boolean", () => {
      expect(extractErrorMessage(false)).toBe("An unexpected error occurred");
    });
  });

  describe("real-world API response scenarios", () => {
    it("handles formatErrorResponse output for ApiError", () => {
      // This is the exact shape returned by formatErrorResponse
      const data = {
        error: {
          code: "VALIDATION_ERROR",
          message: "Company name is required",
          requestId: "550e8400-e29b-41d4-a716-446655440000",
        },
      };
      expect(extractErrorMessage(data, "Failed to add company")).toBe("Company name is required");
    });

    it("handles formatErrorResponse output for internal errors", () => {
      const data = {
        error: {
          code: "INTERNAL_ERROR",
          message: "An internal error occurred",
          requestId: "550e8400-e29b-41d4-a716-446655440000",
        },
      };
      expect(extractErrorMessage(data, "Something went wrong")).toBe("An internal error occurred");
    });

    it("handles response from .catch(() => ({}))", () => {
      // When res.json().catch(() => ({})) is used and JSON parsing fails
      const data = {};
      expect(extractErrorMessage(data, "Request failed")).toBe("Request failed");
    });

    it("handles response from .catch(() => null)", () => {
      // When res.json().catch(() => null) is used
      expect(extractErrorMessage(null, "Request failed")).toBe("Request failed");
    });
  });
});
