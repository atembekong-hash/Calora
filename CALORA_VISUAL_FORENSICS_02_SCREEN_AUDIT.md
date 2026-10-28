# Calora Visual Forensics 02 — Screen Audit

## Audited surfaces

The audit covered Today, Recipes, Scan, Plan, More, Fasting, Learning, Progress (Overview, Trends, Weight), Settings/Profile (You, Membership, Account), Coach, Saved Meals, reminders, dashboard customization, shared sheets, and error surfaces.

| Surface                                | Confirmed remediation                                                                                                                                                     | Functional boundary preserved                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Today                                  | Inherited corrected semantic palette, readable tab/header roles, and shared-sheet overlay.                                                                                | Diary, nutrition, health, and dashboard data calculations remain untouched.                                           |
| Recipes / Plan / Scan                  | Custom modal and standard sheet overlays now use the same semantic role; existing verified image policy remains unchanged.                                                | Recipe, image, scanner, planner, and logging contracts are unchanged.                                                 |
| More                                   | Muted summaries, quick-access labels, icons, and chips consume readable semantic roles.                                                                                   | It remains a concise navigation hub; Progress, Settings, Saved Meals, Learning, and Fasting remain real destinations. |
| Fasting                                | Supporting text, schedule/reminder actions, status icon foregrounds, tints, and primary actions are role-correct. Schedule actions now target Settings → You → reminders. | Fasting state/timer persistence and non-medical wording remain unchanged.                                             |
| Learning                               | Added an explicit back affordance, role-correct search/supporting text, and semantic modal overlay/handle.                                                                | Existing search/category/article behavior is preserved.                                                               |
| Progress                               | Overview/Trend/Weight supporting labels and charts inherit the corrected palette; key entrance, pulse, and chart transitions honor reduced motion.                        | Existing charts, metrics, units, and user data are not fabricated or changed.                                         |
| Settings/Profile                       | Existing You/Membership/Account segmentation remains intact; dialog overlays and secondary labels now use theme roles.                                                    | Billing, account deletion, privacy, export, and sign-out safeguards are preserved.                                    |
| Coach / Saved Meals / dashboard editor | Confirmation surfaces use semantic overlays; disabled controls have explicit readable foregrounds rather than fading regular content.                                     | Coach privacy, saved-meal logging, and dashboard preference behavior remain intact.                                   |

## Reference alignment

The approved references call for an uncluttered five-tab shell, Progress accessible from Today/More, a compact More hub, Fasting with direct schedule management, and Settings with three sections. The existing redesign already provided that architecture. This remediation accounts for the missing visual layer: readable typography, coherent cards/sheets, visible route return, accessible state feedback, and reduced-motion behavior. It deliberately does not fabricate the reference mock metrics or replace live data with static visuals.

## Device/testing limitation

A local Expo web bundle successfully built offline, but its runtime correctly halted before rendering because the sandbox has no `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`. No production public values were supplied. Consequently, there are no substituted browser screenshots and no physical Samsung, iOS, or emulator claim. The owner-device checklist is in report 05.
