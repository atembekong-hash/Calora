/**
 * Read the live CaloraApp RevenueCat catalog without printing credentials.
 *
 * Run:
 *   pnpm --filter @workspace/scripts exec tsx src/inspectRevenueCatCatalog.ts
 */
import {
  getProductsFromEntitlement,
  getProductsFromPackage,
  listApps,
  listEntitlements,
  listOfferings,
  listPackages,
  listProducts,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function inspectRevenueCatCatalog() {
  const projectId = requiredEnv("REVENUECAT_PROJECT_ID");
  const testStoreAppId = requiredEnv("REVENUECAT_TEST_STORE_APP_ID");
  const client = await getUncachableRevenueCatClient();

  const [appsResult, productsResult, entitlementsResult, offeringsResult] = await Promise.all([
    listApps({ client, path: { project_id: projectId }, query: { limit: 100 } }),
    listProducts({ client, path: { project_id: projectId }, query: { limit: 100 } }),
    listEntitlements({ client, path: { project_id: projectId }, query: { limit: 100 } }),
    listOfferings({ client, path: { project_id: projectId }, query: { limit: 100 } }),
  ]);

  for (const [name, result] of Object.entries({
    apps: appsResult,
    products: productsResult,
    entitlements: entitlementsResult,
    offerings: offeringsResult,
  })) {
    if (result.error) throw new Error(`Could not list ${name}: ${result.error.message}`);
  }

  const testStoreApp = appsResult.data.items.find((app) => app.id === testStoreAppId);
  if (!testStoreApp) throw new Error("Configured Test Store app was not found in the RevenueCat project");

  const testStoreProducts = productsResult.data.items
    .filter((product) => product.app_id === testStoreAppId)
    .map((product) => ({
      id: product.id,
      storeIdentifier: product.store_identifier,
      displayName: product.display_name,
      type: product.type,
    }));

  const entitlements = await Promise.all(entitlementsResult.data.items.map(async (entitlement) => {
    const result = await getProductsFromEntitlement({
      client,
      path: { project_id: projectId, entitlement_id: entitlement.id },
      query: { limit: 100 },
    });
    if (result.error) throw new Error(`Could not read entitlement ${entitlement.lookup_key}: ${result.error.message}`);
    return {
      id: entitlement.id,
      identifier: entitlement.lookup_key,
      productIds: result.data.items.map((product) => product.id),
    };
  }));

  const offerings = await Promise.all(offeringsResult.data.items.map(async (offering) => {
    const packagesResult = await listPackages({
      client,
      path: { project_id: projectId, offering_id: offering.id },
      query: { limit: 100 },
    });
    if (packagesResult.error) throw new Error(`Could not read offering ${offering.lookup_key}: ${packagesResult.error.message}`);

    const packages = await Promise.all(packagesResult.data.items.map(async (pkg) => {
      const packageProducts = await getProductsFromPackage({
        client,
        path: { project_id: projectId, package_id: pkg.id },
        query: { limit: 100 },
      });
      if (packageProducts.error) throw new Error(`Could not read package ${pkg.lookup_key}: ${packageProducts.error.message}`);
      return {
        id: pkg.id,
        identifier: pkg.lookup_key,
        productIds: packageProducts.data.items.map((product) => product.id),
      };
    }));

    return {
      id: offering.id,
      identifier: offering.lookup_key,
      isCurrent: offering.is_current,
      packages,
    };
  }));

  console.log(JSON.stringify({
    projectId,
    testStoreApp: { id: testStoreApp.id, name: testStoreApp.name, type: testStoreApp.type },
    testStoreProducts,
    entitlements,
    offerings,
  }, null, 2));
}

inspectRevenueCatCatalog().catch((error) => {
  console.error(error);
  process.exit(1);
});