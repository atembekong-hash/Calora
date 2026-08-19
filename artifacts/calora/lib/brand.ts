/**
 * CaloraApp — Canonical product metadata.
 *
 * Single source of truth for product identity, contact addresses, and URLs.
 * Import from this module rather than scattering literal strings throughout the codebase.
 *
 * IMPORTANT: Never place API keys, RevenueCat secrets, database credentials,
 * OAuth secrets, or signing credentials here. This file is client-accessible.
 */

export const BRAND = {
  /** Official product name shown to customers. */
  name: 'CaloraApp',
  shortName: 'CaloraApp',
  /** Legal publisher / company name. */
  publisher: 'Etiendem Technologies',
  /** Marketing tagline. Use where a brand statement is appropriate. */
  tagline: 'Eat Smarter. Live Better.',
  /** Primary functional descriptor. Use where a category description is appropriate. */
  descriptor: 'AI Nutrition & Calorie Tracker',
  /** Copyright line for About screens, legal pages, and metadata. */
  copyright: '© 2026 Etiendem Technologies',
  /** Premium subscription tier display name. */
  premiumName: 'CaloraApp Pro',
  /** Production domain (no protocol). */
  domain: 'mycaloraapp.com',
} as const;

/** Official URLs. All pages below mycaloraapp.com require external hosting before launch. */
export const URLS = {
  main: 'https://mycaloraapp.com',
  privacy: 'https://mycaloraapp.com/privacy',
  terms: 'https://mycaloraapp.com/terms',
  support: 'https://mycaloraapp.com/support',
  contact: 'https://mycaloraapp.com/contact',
  deleteAccount: 'https://mycaloraapp.com/delete-account',
  subscriptions: 'https://mycaloraapp.com/subscriptions',
  help: 'https://mycaloraapp.com/help',
} as const;

/** Official contact addresses. These inboxes require external DNS/email-provider setup before launch. */
export const EMAILS = {
  support: 'support@mycaloraapp.com',
  billing: 'billing@mycaloraapp.com',
  privacy: 'privacy@mycaloraapp.com',
  security: 'security@mycaloraapp.com',
  legal: 'legal@mycaloraapp.com',
  contact: 'contact@mycaloraapp.com',
  noreply: 'noreply@mycaloraapp.com',
} as const;

/**
 * Subscription product identifiers — preferred RevenueCat/store IDs.
 *
 * IMPORTANT: If store product IDs are externally registered before these are
 * configured, the registered IDs take precedence. Do not rename externally
 * registered products solely for naming consistency.
 *
 * Pricing values are informational only. The live paywall must use authoritative
 * store/RevenueCat product data — never hardcode prices as the billing authority.
 */
export const SUBSCRIPTION = {
  entitlementId: 'caloraapp_pro',
  monthlyProductId: 'caloraapp_pro_monthly',
  annualProductId: 'caloraapp_pro_annual',
  offeringId: 'default',
  /** US reference pricing. Actual charges are determined by store/RevenueCat configuration. */
  pricing: {
    monthly: { recurring: 4.99, trialDays: 7 },
    annual: { recurring: 35.99, monthlyEquivalent: 3, trialDays: 7 },
  },
} as const;
