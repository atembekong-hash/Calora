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
    if (result.error) throw new Error(`Could not list ${name}: ${JSON.stringify(result.error)}`);
  }

  const apps = appsResult.data;
  const products = productsResult.data;
  const entitlementList = entitlementsResult.data;
  const offeringList = offeringsResult.data;
  if (!apps || !products || !entitlementList || !offeringList) {
    throw new Error("RevenueCat returned an empty catalog response");
  }

  const testStoreApp = apps.items.find((app) => app.id === testStoreAppId);
  if (!testStoreApp) throw new Error("Configured Test Store app was not found in the RevenueCat project");

  const testStoreProducts = products.items
    .filter((product) => product.app_id === testStoreAppId)
    .map((product) => ({
      id: product.id,
      storeIdentifier: product.store_identifier,
      displayName: product.display_name,
      type: product.type,
      state: product.state,
    }));

  const entitlements = await Promise.all(entitlementList.items.map(async (entitlement) => {
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

  const offerings = await Promise.all(offeringList.items.map(async (offering) => {
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
        productIds: packageProducts.data.items.map((association) => association.product.id),
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