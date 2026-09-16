---
name: FatSecret static egress
description: Why Calora's FatSecret provider traffic needs a static, allowlisted outbound route before production activation.
---

FatSecret Premier access can be valid while requests still fail with provider error
21 when they originate from changing backend egress addresses. Keep FatSecret
traffic behind the dedicated static-egress gateway once its assigned outbound IP
has been allowlisted by FatSecret. Do not activate the gateway merely because it
is deployed; a successful known recipe and branded-food search/detail path must
first be confirmed through that assigned IP.

**Why:** Rotating backend egress addresses made direct provider verification
intermittent even after entitlement approval, so credentials alone were not a
reliable proof of launch readiness.

**How to apply:** The Calora backend selects the gateway only when its secure
server-side URL and shared secret are configured. Retain direct FatSecret calls
only as a controlled rollback when the gateway URL is removed. Never send the
gateway secret to a non-HTTPS production URL, and repeat the real authenticated
search, review, and diary-log flow after any egress or regional-provider change.