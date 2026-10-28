# Calora Experience 04 — Learning Implementation

## Editorial system

Learning is now a scalable, original, text-first editorial destination rather than a small repeated-card surface. The implementation adds a structured content model under `artifacts/calora/content/learning.ts` and reader behavior in `artifacts/calora/lib/learning.ts`.

The initial library spans nutrition fundamentals, calories, macros, hydration, meal planning, recipes, food labels, sustainable habits, and fasting safety. It includes search, topic filters, collection-based groupings, featured/editorial hierarchy, estimated read times, a canonical lesson detail route, related lessons, saved lessons, completion state, and local journey progress.

## Privacy and safety

- Learning progress and saved lessons are encrypted/account-scoped locally through `CaloraContext`.
- Reader state is normalized for unknown or malformed lessons, exported as owned local state, and cleared with local data deletion.
- Medical-adjacent lessons carry conservative safety metadata and editorial review/source notes.
- Content is original, general educational material; it does not claim individual diagnosis, treatment, endorsement, or expert credentials.
- The interface is intentionally text-first rather than using irrelevant stock imagery.

## Files and tests

Primary files: `artifacts/calora/app/learning.tsx`, `artifacts/calora/app/learning/[lessonId].tsx`, `artifacts/calora/content/learning.ts`, `artifacts/calora/lib/learning.ts`, `artifacts/calora/lib/__tests__/learning.test.ts`, and `artifacts/calora/lib/__tests__/learningScreen.test.tsx`.

Pure catalog, safety, search, collection, bookmark, progress, and journey tests run locally. The JSDOM screen regression is included for protected CI; the sandbox’s Node 22 runtime cannot initialize its Undici worker because its bundled Undici expects `zlib.createZstdDecompress`, which Node 22.13.0 does not provide. It was not reported as passed locally.
