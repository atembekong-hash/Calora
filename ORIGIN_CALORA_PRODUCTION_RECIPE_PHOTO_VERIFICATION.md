# ORIGIN_CALORA_PRODUCTION_RECIPE_PHOTO_VERIFICATION

**Verdict: PASS — exact production RecipePhotoOrigin verified.**

## Exact value

Use this exact value for the Windows Owner QA executor’s `-RecipePhotoOrigin` parameter:

```text
https://calora-recipe-photos-ct9jbw.t3.storageapi.dev
```

This is an HTTPS origin only. It has no path, query string, fragment, credentials, or signed URL parameters.

## Verified production configuration

The read-only Railway inspection targeted:

- Project: `attractive-harmony` (`b2484b01-c599-4a80-9b83-3139a2cba813`)
- Environment: `production` (`0ba409c4-5b32-4b75-8c33-e76d5c6e55db`)
- Service: `@workspace/api-server` (`12af1b5f-0e00-4c41-ba51-f6b3901d7be7`)
- Supabase project reference: `pzdulhkpwbrbrgskwwwe`
- Railway bucket: `calora-recipe-photos` (`dc287116-f182-4bea-a201-58cc6518310e`)

Railway’s read-only bucket metadata returned:

- Provider endpoint: `https://t3.storageapi.dev`
- Actual bucket name: `calora-recipe-photos-ct9jbw`
- Region: `auto`
- URL style: `virtual-host`

The production API service exposes the expected storage configuration variable names: `RECIPE_PHOTO_STORAGE_ENDPOINT`, `RECIPE_PHOTO_BUCKET`, `RECIPE_PHOTO_STORAGE_FORCE_PATH_STYLE`, `RECIPE_PHOTO_STORAGE_REGION`, and the access-key variables. Values of credential variables were not requested or exposed. No Railway changes, deployments, or authenticated production requests were made.

## Origin derivation

For virtual-hosted-style addressing, the bucket name is placed before the provider endpoint host:

```text
<bucket>.<endpoint-host>
calora-recipe-photos-ct9jbw.t3.storageapi.dev
```

Therefore the exact origin is:

```text
https://calora-recipe-photos-ct9jbw.t3.storageapi.dev
```

The production storage implementation confirms the same rule. In `artifacts/api-server/src/lib/recipe-photo-storage.ts`, the `forcePathStyle` flag is true only when `RECIPE_PHOTO_STORAGE_FORCE_PATH_STYLE` or `S3_FORCE_PATH_STYLE` equals the literal string `"true"` (lines 60–62). When it is false, the signer constructs `host = `${config.bucket}.${endpoint.host}`` and uses the object path without the bucket prefix (lines 165–175). The signed URL is then returned as `https://${host}${canonicalUri}?…` (lines 192–212).

The production bucket metadata reports virtual-hosted style, which is consistent with the required effective setting `RECIPE_PHOTO_STORAGE_FORCE_PATH_STYLE=false`.

## Windows Owner QA compatibility

The bundled Windows runner accepts only an HTTPS origin with:

- no username or password;
- no query string or fragment; and
- pathname exactly `/`.

It then requires every returned private preview or accepted-delivery URL to have the exact same origin. The verified value satisfies that contract. It is compatible with the production signer’s virtual-hosted signed URLs; the object path and temporary `X-Amz-*` query parameters remain on the returned signed URL, not in the `-RecipePhotoOrigin` argument.

## Credential-free DNS and TLS check

A public, unauthenticated check was performed against only the derived origin; no private object path and no signed URL was requested.

- DNS: `calora-recipe-photos-ct9jbw.t3.storageapi.dev` resolved to `137.174.138.43`.
- HTTPS: `HEAD /` completed with HTTP `403 Forbidden`, which is expected without an authenticated bucket request and confirms the endpoint answered over HTTPS.
- TLS certificate verification: passed with `ssl_verify_result=0`.
- Certificate subject: `CN = storage.dev`.
- Certificate issuer: Let’s Encrypt `YE2`.
- No private image bytes were downloaded.

The HTTP 403 is not an origin failure. It is the expected unauthenticated response from the storage service root.

## Scope and limitations

This report establishes the exact production storage origin and its addressing style. It does not access private recipe images, inspect customer records, retrieve storage credentials, generate images, run QA, perform cleanup, change Railway or Supabase configuration, or deploy code.

## References

[1]: https://github.com/atembekong-hash/Calora/blob/main/artifacts/api-server/src/lib/recipe-photo-storage.ts "Calora production recipe-photo storage signer"

[2]: https://github.com/atembekong-hash/Calora/blob/main/windows/owner-qa/executor/calora/production-recipe-image-qa.mjs "Calora Windows Owner QA origin validation"

[3]: https://github.com/atembekong-hash/Calora/blob/main/docs/operations/production-recipe-image-qa.md "Calora production recipe-image QA configuration contract"
