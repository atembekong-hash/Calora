import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import publicPagesRouter from "../routes/public-pages";

function makeApp() {
  const app = express();
  app.use(publicPagesRouter);
  return app;
}

describe("public Calora pages", () => {
  const app = makeApp();

  it.each([
    ["/", "CaloraApp"],
    ["/privacy", "Privacy Policy"],
    ["/terms", "Terms of Use"],
    ["/support", "Help & Support"],
    ["/subscriptions", "Subscription Information"],
    ["/delete-account", "Delete your account"],
  ])("serves %s as public HTML", async (path, heading) => {
    const response = await request(app).get(path);
    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toMatch(/text\/html/);
    expect(response.headers["cache-control"]).toContain("max-age=300");
    expect(response.headers["x-robots-tag"]).toBe("index, follow");
    expect(response.text).toContain(heading);
    expect(response.text).toContain("https://calorie-coach-pie35449.replit.app");
  });

  it("publishes the monitored support channel for support, privacy, and billing", async () => {
    const [support, privacy, subscriptions] = await Promise.all([
      request(app).get("/support"),
      request(app).get("/privacy"),
      request(app).get("/subscriptions"),
    ]);
    for (const response of [support, privacy, subscriptions]) {
      expect(response.text).toContain("mailto:support@mycaloraapp.com");
    }
  });

  it("explains the authenticated, irreversible deletion path", async () => {
    const response = await request(app).get("/delete-account");
    expect(response.text).toContain("sign in");
    expect(response.text).toContain("cannot be undone");
    expect(response.text).toContain("support@mycaloraapp.com");
  });

  it("keeps help and contact reachable", async () => {
    const [help, contact] = await Promise.all([
      request(app).get("/help"),
      request(app).get("/contact"),
    ]);
    expect(help.status).toBe(308);
    expect(help.headers.location).toBe("/support");
    expect(contact.status).toBe(308);
    expect(contact.headers.location).toBe("/support");
  });

  it("does not publish the retired custom-domain URL", async () => {
    const response = await request(app).get("/privacy");
    expect(response.text).not.toContain("mycaloraapp.com/privacy");
    expect(response.text).not.toContain("billing@mycaloraapp.com");
  });
});