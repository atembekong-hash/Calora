import { describe, expect, it, vi } from "vitest";
import { copyCoachResponseText } from "../coachClipboard";

describe("copyCoachResponseText", () => {
  it("copies the same sanitized assistant plain text shown in the Coach bubble", async () => {
    const setStringAsync = vi.fn().mockResolvedValue(true);

    await expect(
      copyCoachResponseText(
        "## Today\n\n**Protein:** 45.4 g 👍\n---\nUse `Calora`.",
        { setStringAsync },
      ),
    ).resolves.toBeUndefined();

    expect(setStringAsync).toHaveBeenCalledWith(
      "Today\n\nProtein: 45 g\nUse Calora.",
    );
  });

  it("does not call the clipboard for an empty rendered response", async () => {
    const setStringAsync = vi.fn().mockResolvedValue(true);

    await expect(
      copyCoachResponseText("\u200B", { setStringAsync }),
    ).rejects.toThrow("Coach response is empty");
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  it("propagates a clipboard failure so the screen can show a safe retry notice", async () => {
    const setStringAsync = vi.fn().mockRejectedValue(new Error("unavailable"));

    await expect(
      copyCoachResponseText("Visible Coach reply", { setStringAsync }),
    ).rejects.toThrow("unavailable");
  });
});
