import { describe, expect, it } from "vitest";
import { canSendMessages, isSeenByOther, messageSchema, MESSAGE_MAX_LENGTH } from "@/lib/chat";

describe("message rules", () => {
  it("allows messages up to 2000 characters", () => {
    expect(MESSAGE_MAX_LENGTH).toBe(2000);
    expect(messageSchema.safeParse({ body: "x".repeat(2000) }).success).toBe(true);
  });

  it("rejects messages over 2000 characters", () => {
    expect(messageSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
  });

  it("rejects blank messages and trims whitespace", () => {
    expect(messageSchema.safeParse({ body: "   " }).success).toBe(false);
    const r = messageSchema.safeParse({ body: "  hi  " });
    expect(r.success && r.data.body).toBe("hi");
  });

  it("closes the conversation to new messages once the application is withdrawn", () => {
    expect(canSendMessages("withdrawn")).toBe(false);
    expect(canSendMessages("declined")).toBe(true);
    expect(canSendMessages("pending")).toBe(true);
  });

  it("marks a message seen only when the other person read after it was sent", () => {
    expect(isSeenByOther("2026-11-20T09:00:00Z", null)).toBe(false);
    expect(isSeenByOther("2026-11-20T09:00:00Z", "2026-11-20T08:59:59Z")).toBe(false);
    expect(isSeenByOther("2026-11-20T09:00:00Z", "2026-11-20T09:00:00Z")).toBe(true);
  });
});
