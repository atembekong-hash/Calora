import { describe, expect, it } from "vitest";
import request from "supertest";
import app from "../app";

describe("public Calora pages", () => {
  it.each([
    ["/api/legal/", "CaloraApp", "/api/legal/"],
    ["/api/legal/privacy", "Privacy Policy", "/api/legal/privacy"],
    ["/api/legal/terms", "Terms of Use", "/api/legal/terms"],
    ["/api/legal/support", "Help & Support", "/api/legal/support"],
    ["/api/legal/subscriptions", "Subscription Information", "/api/legal/subscriptions"],
    ["/api/legal/delete-account", "Delete your account", "/api/legal/delete-account"],
  ])("serves %s as public HTML", async (path, heading, canonicalPath) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.headers["cache-control"]).toContain("max-age=300");
    expect(response.headers["x-robots-tag"]).toBe("index, follow");
    expect(response.text).toContain(heading);
    expect(response.text).toContain("https://calorie-coach-pie35449.replit.app");
    expect(response.text).toContain(
      `rel="canonical" href="https://calorie-coach-pie35449.replit.app${canonicalPath}"`,
    );
  });

  it("publishes the monitored support channel for support, privacy, and billing", async () => {
    const [support, privacy, subscriptions] = await Promise.all([
      request(app).get("/api/legal/support"),
      request(app).get("/api/legal/privacy"),
      request(app).get("/api/legal/subscriptions"),
    ]);
    for (const response of [support, privacy, subscriptions]) {
      expect(response.text).toContain("mailto:support@mycaloraapp.com");
    }
  });

  it("explains the authenticated, irreversible deletion path", async () => {
    const response = await request(app).get("/api/legal/delete-account");
    expect(response.text).toContain("sign in");
    expect(response.text).toContain("cannot be undone");
    expect(response.text).toContain("support@mycaloraapp.com");
  });

  it("keeps help and contact reachable", async () => {
    const [help, contact] = await Promise.all([
      request(app).get("/api/legal/help"),
      request(app).get("/api/legal/contact"),
    ]);
    expect(help.status).toBe(308);
    expect(help.headers.location).toBe("/api/legal/support");
    expect(contact.status).toBe(308);
    expect(contact.headers.location).toBe("/api/legal/support");

    const [followedHelp, followedContact] = await Promise.all([
      request(app).get("/api/legal/help").redirects(1),
      request(app).get("/api/legal/contact").redirects(1),
    ]);
    expect(followedHelp.status).toBe(200);
    expect(followedHelp.text).toContain("Help &amp; Support");
    expect(followedContact.status).toBe(200);
    expect(followedContact.text).toContain("Help &amp; Support");
  });

  it("does not publish the retired custom-domain URL", async () => {
    const response = await request(app).get("/api/legal/privacy");
    expect(response.text).not.toContain("mycaloraapp.com/privacy");
    expect(response.text).not.toContain("billing@mycaloraapp.com");
  });

  it("does not shadow API liveness or expose conflicting root aliases", async () => {
    const [health, rootPrivacy] = await Promise.all([
      request(app).get("/api"),
      request(app).get("/privacy"),
    ]);
    expect(health.status).toBe(200);
    expect(health.body).toEqual({ status: "ok" });
    expect(rootPrivacy.status).toBe(404);
  });
});