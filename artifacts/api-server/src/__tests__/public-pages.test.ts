import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import publicPagesRouter from "../routes/public-pages";

function makeApp() {
  const app = express();
  app.use(publicPagesRouter);
  app.use("/api/legal", publicPagesRouter);
  return app;
}

describe("public Calora pages", () => {
  const app = makeApp();

  it.each([
    ["/", "Calora"],
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
    expect(response.text).toContain("https://mycaloraapp.com");
  });

  it("also serves the API-prefixed production paths", async () => {
    for (const path of ["/api/legal/", "/api/legal/privacy", "/api/legal/terms", "/api/legal/support", "/api/legal/subscriptions", "/api/legal/delete-account"]) {
      const response = await request(app).get(path);
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/text\/html/);
    }
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

  it("publishes branded SEO and social assets", async () => {
    const privacy = await request(app).get("/privacy");
    expect(privacy.text).toContain('rel="canonical" href="https://mycaloraapp.com/privacy"');
    expect(privacy.text).toContain('property="og:site_name" content="Calora"');
    expect(privacy.text).toContain('name="twitter:card" content="summary_large_image"');
    expect(privacy.text).toContain('"@type":"MobileApplication"');
    expect((await request(app).get("/robots.txt")).text).toContain("Sitemap: https://mycaloraapp.com/sitemap.xml");
    expect((await request(app).get("/sitemap.xml")).text).toContain("<loc>https://mycaloraapp.com/privacy</loc>");
    expect((await request(app).get("/site.webmanifest")).body.name).toBe("Calora");
    const icon = await request(app).get("/assets/icon/calora-icon-512.png");
    expect(icon.status).toBe(200);
    expect(icon.headers["content-type"]).toMatch(/image\/png/);
    expect(icon.body.length).toBeGreaterThan(1000);
    const socialCard = await request(app).get("/assets/social/calora-social-card.png");
    expect(socialCard.status).toBe(200);
    expect(socialCard.headers["content-type"]).toMatch(/image\/png/);
    expect(socialCard.body.length).toBeGreaterThan(1000);
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
    expect(help.status).toBe(200);
    expect(help.text).toContain("Calora Help");
    expect(contact.status).toBe(200);
    expect(contact.text).toContain("Contact Calora");
  });

  it("does not publish the retired custom-domain URL", async () => {
    const response = await request(app).get("/privacy");
    expect(response.text).toContain("https://mycaloraapp.com/privacy");
    expect(response.text).not.toContain("billing@mycaloraapp.com");
  });
});