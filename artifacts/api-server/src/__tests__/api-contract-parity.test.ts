import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { describe, expect, it } from "vitest";

const repositoryRoot = path.resolve(__dirname, "../../../../");
const routesDirectory = path.join(
  repositoryRoot,
  "artifacts/api-server/src/routes",
);
const openApiPath = path.join(repositoryRoot, "lib/api-spec/openapi.yaml");
const apiRouteFiles = [
  "health.ts",
  "version.ts",
  "profile.ts",
  "account.ts",
  "referral.ts",
  "diary.ts",
  "sync.ts",
  "capture.ts",
  "restaurantFoods.ts",
  "recipes.ts",
  "premiumRecipes.ts",
  "planner.ts",
  "coach.ts",
  "coachFactContext.ts",
  "coachFactConsent.ts",
  "coachV2.ts",
  "privacyRights.ts",
];

function registeredRoutes() {
  const routes = new Set<string>();
  for (const filename of apiRouteFiles) {
    const source = fs.readFileSync(
      path.join(routesDirectory, filename),
      "utf8",
    );
    const routePattern =
      /router\.(get|post|put|patch|delete)\(\s*["']([^"']+)["']/g;
    for (const match of source.matchAll(routePattern)) {
      routes.add(
        `${match[1].toUpperCase()} ${match[2].replace(/:([A-Za-z0-9_]+)/g, "{$1}")}`,
      );
    }
  }
  return routes;
}

describe("API implementation and OpenAPI contract parity", () => {
  it("documents every registered route and contains no retired public operations", () => {
    const document = YAML.parse(fs.readFileSync(openApiPath, "utf8")) as {
      paths: Record<string, Record<string, unknown>>;
    };
    const documented = new Set<string>();
    for (const [routePath, operations] of Object.entries(document.paths)) {
      for (const method of Object.keys(operations)) {
        if (["parameters", "summary", "description"].includes(method)) continue;
        documented.add(`${method.toUpperCase()} ${routePath}`);
      }
    }

    const missing = [...registeredRoutes()]
      .filter((route) => !documented.has(route))
      .sort();
    expect(missing).toEqual([]);
    expect(document.paths["/v1/diary/{entryId}"]?.patch).toBeUndefined();
    expect(document.paths["/v1/foods/search"]).toBeUndefined();
    expect(document.paths["/v1/privacy/requests"]).toBeDefined();
    expect(document.paths["/version"]).toBeDefined();
  });

  it("keeps critical runtime constraints represented in the generated contract", () => {
    const document = YAML.parse(fs.readFileSync(openApiPath, "utf8")) as any;
    expect(document.paths["/v1/profile"].put.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(document.paths["/v1/planner/generate"].post.security).toEqual([
      { bearerAuth: [] },
    ]);
    expect(
      document.paths["/v1/recipes/photo"].post.responses["201"],
    ).toBeUndefined();
    expect(document.components.schemas.Profile.properties.age.minimum).toBe(18);
    expect(
      document.components.schemas.SyncMutation.properties.entity.enum,
    ).toEqual(["diaryEntry"]);
  });
});
