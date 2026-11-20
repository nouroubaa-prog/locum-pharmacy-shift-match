// Map backend errors to plain-language messages. Trigger/RPC messages raised
// by our own database functions are already user-friendly and are passed through.
export function friendlyError(
  err: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (!err) return fallback;
  const e = err as { code?: string; message?: string };
  if (e.code === "23505") {
    if (e.message?.includes("applications")) return "You've already applied to this shift.";
    if (e.message?.includes("reports_one_open_per_conversation"))
      return "You've already reported this conversation. Our team will review it.";
    if (e.message?.includes("reports"))
      return "You've already reported this listing. Our team will review it.";
    return "That already exists.";
  }
  if (e.code === "42501" || e.message?.includes("row-level security")) {
    return "You don't have permission to do that.";
  }
  if (e.code === "23514")
    return "Some values are outside the allowed range. Please check the form.";
  if (e.message && e.message.length < 200 && !e.message.includes("violates")) return e.message;
  return fallback;
}
