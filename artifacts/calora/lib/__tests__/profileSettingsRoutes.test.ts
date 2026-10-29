import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const app = resolve(__dirname, "../../app");
const read = (name: string) => readFileSync(resolve(app, name), "utf8");

describe("Profile / Settings / Notifications route ownership", () => {
  it("registers canonical product-control routes", () => {
    expect(read("profile.tsx")).toContain('title="Profile"');
    expect(read("profile.tsx")).toContain("Personal information");
    expect(read("profile.tsx")).toContain("Membership");
    expect(read("settings.tsx")).toContain('title="Settings"');
    expect(read("settings.tsx")).toContain("Appearance");
    expect(read("settings.tsx")).toContain("Privacy & data");
    expect(read("notifications.tsx")).toContain('title="Notifications"');
    expect(read("notifications.tsx")).toContain("Permission status");
    expect(read("notifications.tsx")).toContain("Quiet hours");
  });

  it("moves More entry points to canonical routes without deleting legacy deep links", () => {
    const more = read("(tabs)/more.tsx");
    expect(more).toContain('route: "/notifications"');
    expect(more).toContain('onPress={() => router.push("/settings")}');
    const profile = read("(tabs)/profile.tsx");
    expect(profile).toContain("profileTabFromParam");
    expect(profile).toContain("profileOpenIntentFromParam");
  });

  it("keeps notification scheduling behind the existing reconciliation boundary", () => {
    const notifications = read("notifications.tsx");
    expect(notifications).toContain("reconcileUserNotificationPlan");
    expect(notifications).toContain("updateNotificationPreferences");
    expect(notifications).toContain("PermissionBanner");
  });
});
