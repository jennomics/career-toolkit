/**
 * Safely extracts a displayable error message from API response data.
 *
 * Handles multiple response shapes:
 * - Structured error: { error: { code, message, requestId } } -> returns error.message
 * - Legacy string error: { error: "some string" } -> returns the string
 * - null/undefined or missing error field -> returns the fallback
 * - Any other unexpected shape -> returns the fallback
 */
export function extractErrorMessage(data: unknown, fallback: string = "An unexpected error occurred"): string {
  if (data == null || typeof data !== "object") {
    return fallback;
  }

  const record = data as Record<string, unknown>;
  const error = record.error;

  if (error == null) {
    return fallback;
  }

  if (typeof error === "string") {
    return error.length > 0 ? error : fallback;
  }

  if (typeof error === "object" && !Array.isArray(error)) {
    const errorObj = error as Record<string, unknown>;
    if (typeof errorObj.message === "string" && errorObj.message.length > 0) {
      return errorObj.message;
    }
  }

  return fallback;
}
