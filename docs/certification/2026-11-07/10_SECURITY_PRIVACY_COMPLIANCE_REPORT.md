# Security, Privacy, and Compliance Certification Report

Current source contains meaningful account-deletion fences, server authorization, rate limiting, privacy-rights routes, token verification, redaction, and safety-oriented Coach controls. These are bounded source-level PASS results, not a legal or production certification.

The customer-data boundary remains unresolved: the inspected Supabase project has no Calora application tables, while the application uses managed PostgreSQL. Database-level tenant isolation or an independently reviewed equivalent was not certified for the customer-data database. Current production roles, grants, storage policy, migration state, observability, and restore controls were also not reverified.

Store Data Safety, privacy disclosures, support mailbox operation, signed-build submission records, native accessibility, health-data permissions, and legal claims require current owner or qualified legal/compliance evidence.
