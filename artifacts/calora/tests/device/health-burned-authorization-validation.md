# Native burned-calorie and authorization validation

**Status:** Required before a release candidate can be described as physically verified. This specification deliberately contains no asserted physical result and must be run only against a disposable native install. It does not use seed health records, mock a provider, or capture raw health data.

## Scope and test instrumentation

The production UI exposes stable identifiers for the observable recovery and dashboard states:

| Surface | Identifier | Purpose |
|---|---|---|
| Home Burned statistic | `dashboard-burned-stat` | Locate the actionable/non-actionable Burned region. |
| Home Burned value | `dashboard-burned-value` | Confirm `0` appears only for an evidenced measurement; unavailable states render `—`. |
| Home Burned status | `dashboard-burned-status` | Capture the truthful visible state, such as `No active calories recorded today`. |
| Profile partial-access retry | `update-health-access` | Re-request the Android Active calories read permission. |
| Profile OS recovery | `open-health-connect-settings` | Open native Health Connect settings without using a URI guess. |

These test IDs are diagnostic hooks only. They do not alter provider queries, authorization grants, storage, calorie arithmetic, or displayed data.

## Preconditions

1. Use a signed candidate built from the revision under review on a disposable Android device with Health Connect and, separately, an iOS device with Apple Health. Do not use Expo Go, web, an emulator without an actual provider, or a personal production install.
2. Record only the app version/build identifier, OS version, Health Connect/Apple Health availability, local date, timezone, category/grant state, normalized state (`number` or `null`), visible Burned value/status, and action outcome. Do **not** record individual health records, data-origin package names, account identifiers, tokens, screenshots containing private health detail, or exported provider data.
3. Confirm the candidate contains the configured native Health Connect/HealthKit plugin output and Android/iOS permissions before beginning. This is a build/install inspection, not a Vitest assertion.

## Android Health Connect matrix

| Case | Setup and action | Expected truthful behavior | Sanitized evidence to retain |
|---|---|---|---|
| Provider unavailable | Run where Health Connect cannot initialize. Open Home and Profile. | Home shows unavailable/non-numeric Burned; Profile does not offer a fake successful connection. | Availability result; Home status; Profile state. |
| Deny all | Connect and deny every category. | Burned is non-numeric with an access recovery action. No active energy is invented. | Grant summary; Home status; recovery action label. |
| Steps only (partial) | Allow Steps but deny Active calories, then open Profile Health data. | `Update Health access`, `Open Health Connect settings`, and `Sync now` are visible. Update retries `requestPermission`; Sync retains allowed metric behavior but cannot fabricate Burned. | Grant summary before/after retry; each control visible; retry outcome. |
| OS settings recovery | If Android does not show another permission dialog, press `Open Health Connect settings`, allow Active calories for Calora, return foreground, then Sync now. | App returns safely; foreground/manual sync re-reads grants and requests/uses ActiveCaloriesBurned only when granted. | Settings launch outcome; revised grant summary; sync outcome. |
| No qualifying records | Grant Active calories, ensure provider has no records in the current local-day interval, then Sync now. | Home shows `—` and `No active calories recorded today`; it must not display measured `0`. | Local date/timezone; grant state; normalized `null`; exact Home value/status. |
| Genuine measured zero | Use a provider/source that demonstrably returns an ActiveCaloriesBurned aggregate with a contributing origin and zero kcal. Sync now. | Home shows `0` Burned; the calorie allowance is target minus eaten plus `0`. | Provider aggregate classification only (origin present, zero); normalized `0`; Home value. |
| Positive record | Use a provider/source with a verified non-zero ActiveCaloriesBurned aggregate in the local-day interval. Sync now. | Home displays the normalized value and increases the gauge allowance by that value. | Local date/timezone; normalized positive value; Home value and calculated allowance. |
| Local-midnight boundary | Repeat before/after local midnight with a relevant provider record. | Old-day snapshot is never relabeled as today; current-day query uses local midnight through now. | Local date/timezone; `syncedAt`; Home status before/after. |
| Resume/relaunch/revoke | After a successful sync, background/foreground, relaunch, then revoke Active calories in OS settings and return. | Refresh remains foreground/manual only; later missing permission becomes an actionable nonnumeric state. | Action sequence; grant state; final Home/Profile state. |

## iOS Apple Health matrix

| Case | Setup and action | Expected truthful behavior |
|---|---|---|
| Health unavailable | Open Home/Profile on a device where Health data is unavailable. | Non-numeric unavailable Burned; no connection success implied. |
| First request and later settings change | Request read categories, change Calora read access through Health app settings, resume, and Sync now. | Apple’s opaque read-grant model remains `requested`; only an actual returned measurement becomes ready. |
| Empty quantity | Sync with no active-energy cumulative quantity. | Home remains nonnumeric and directs user to review Apple Health access; it does not become zero. |
| Measured zero and positive quantity | Test known zero and positive daily quantities. | `0` remains a valid measurement; positive active energy is reflected in Home arithmetic. |
| Midnight/relaunch | Repeat across local midnight and app relaunch. | Snapshot freshness does not reuse a prior local day. |

## Privacy and synchronization checks

1. Observe that Sync now and foreground return can refresh local state. Do not claim background delivery or continuous sync; neither is implemented.
2. Confirm Disconnect removes Calora’s local snapshot and stops its reads. Confirm the UI explains that OS permission revocation is a separate Health settings action.
3. Inspect outbound application traffic only at a high level if policy permits: no health snapshot, raw Health Connect/HealthKit record, active-energy amount, or authorization state may be sent to the diary API or database. Do not capture request bodies containing account/diary data.

## Pass criteria and limitations

A native platform passes only if every applicable observed state matches the expected behavior above and the candidate’s native configuration is present. A skipped category, unavailable provider, or absent known record is **not** a pass for the corresponding row. Record the result as `not run` or `blocked` with the sanitized reason. Unit/component tests do not substitute for this validation.
