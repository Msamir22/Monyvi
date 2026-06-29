# Recurring Payments Dashboard Style Audit

## Color Reference

- Light background: `bg-background` / `palette.slate[50]`
- Light surface: `bg-white` / `palette.slate[25]`
- Dark background: `dark:bg-background-dark` / `palette.slate[900]`
- Dark surface: `dark:bg-slate-800`
- Primary text: `text-text-primary`, `dark:text-text-primary-dark`
- Muted text: `text-text-muted`, `dark:text-text-muted-dark`
- Primary action: `bg-nileGreen-600`, `text-nileGreen-700`
- Warning/overdue: `text-red-500`
- Borders: `border-slate-200`, `dark:border-slate-700`

## Mockups

| Mockup | File                                                           | Description                                                                                                                          |
| ------ | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 1      | `mockups/recurring-payments-dashboard-concept-a-reference.png` | Approved Concept A light dashboard, with Concept B dark shown for contrast. User selected Concept A as the implementation direction. |

## Emulator Evidence

| Screenshot                         | Path                                                                     | Notes                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Light implementation before polish | `C:\Users\Mohamed\AppData\Local\Temp\monyvi-style-bills-light-clean.png` | Captured on `emulator-5554`; showed broad structure but several style mismatches.                         |
| Dark implementation attempt        | `C:\Users\Mohamed\AppData\Local\Temp\monyvi-style-bills-dark.png`        | The drawer toggle attempt did not switch theme, so dark mode could not be visually verified in this pass. |

## Mockup 1: Concept A Light

**Components:** `apps/mobile/app/(private)/recurring-payments.tsx`,
`apps/mobile/components/recurring-payments/RecurringPaymentsDashboard.tsx`

### Header

| Element      | Property  | Mockup Value                            | Code Value                                                             | Match? |
| ------------ | --------- | --------------------------------------- | ---------------------------------------------------------------------- | ------ |
| Header title | Alignment | Centered title between back and add     | Was left-aligned via default `PageHeader`; patched to `centerTitle`    | Yes    |
| Add action   | Presence  | Rounded square plus button in top-right | Was missing; patched using `PageHeader.rightAction` with `add-outline` | Yes    |
| Back action  | Icon      | Simple back arrow                       | Uses `PageHeader` back arrow                                           | Yes    |

### Summary Card

| Element            | Property | Mockup Value                                                        | Code Value                                        | Match? |
| ------------------ | -------- | ------------------------------------------------------------------- | ------------------------------------------------- | ------ |
| Card radius        | Borders  | Small rounded rectangle                                             | Was `rounded-3xl`; patched to `rounded-xl`        | Yes    |
| Card layout        | Layout   | Left large monthly due, right two stacked metrics, vertical divider | Same structure                                    | Yes    |
| Monthly amount     | Color    | Green emphasis                                                      | Was primary text; patched to `text-nileGreen-700` | Yes    |
| Next 7 days amount | Color    | Green emphasis                                                      | Was primary text; patched to green                | Yes    |
| Overdue count      | Color    | Red when overdue, neutral when zero                                 | Patched conditional value color                   | Yes    |

### Next Payment Insight

| Element            | Property | Mockup Value              | Code Value                                                        | Match? |
| ------------------ | -------- | ------------------------- | ----------------------------------------------------------------- | ------ |
| Card radius/height | Layout   | Compact rounded rectangle | Was taller and rounder; patched to compact `rounded-xl`, `py-2.5` | Yes    |
| Calendar badge     | Shape    | Small rounded icon badge  | Was circular; patched to rounded square                           | Yes    |
| Amount             | Color    | Green due amount          | Was red for expense; patched to green                             | Yes    |

### Tabs

| Element    | Property | Mockup Value                                 | Code Value                                                                     | Match? |
| ---------- | -------- | -------------------------------------------- | ------------------------------------------------------------------------------ | ------ |
| Tab group  | Layout   | One segmented control with internal dividers | Was three separated pills with gaps; patched to one bordered segmented control | Yes    |
| Tab text   | Layout   | Label and count on one line                  | Was label over count; patched inline                                           | Yes    |
| Active tab | Color    | Green fill with white text                   | Patched to `bg-nileGreen-600` and white text                                   | Yes    |

### List Header And Sort

| Element       | Property   | Mockup Value                                                                                       | Code Value                                             | Match?  |
| ------------- | ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ------- |
| Section title | Typography | Bold `Upcoming`                                                                                    | Matches `text-lg font-bold`                            | Yes     |
| Sort control  | Copy       | Mockup says `Next due`; implementation intentionally says `Sort: Next due` per later user feedback | Deliberate product-copy deviation                      | Warning |
| Sort chip     | Shape      | Compact rounded chip                                                                               | Current `rounded-full` is slightly pillier than mockup | Minor   |

### Payment Rows

| Element     | Property      | Mockup Value                             | Code Value                                                  | Match? |
| ----------- | ------------- | ---------------------------------------- | ----------------------------------------------------------- | ------ |
| Row card    | Radius/height | Compact small-radius card                | Was `rounded-2xl`, `p-4`; patched to `rounded-xl`, `p-3`    | Yes    |
| Status pill | Position      | Under subtitle on left                   | Was beside title; patched under subtitle                    | Yes    |
| Amount      | Color/sign    | Neutral dark amount, no sign for expense | Was red with minus sign; patched to neutral no-sign amount  | Yes    |
| Date        | Position      | Right side below amount with calendar    | Was left side under subtitle; patched to right under amount | Yes    |
| Chevron     | Position      | Far right                                | Patched to far-right outside amount/date group              | Yes    |

## Missing Elements Check

| Type                | Item                                 | Status                                                                               |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ |
| Mockup but not code | Header add button                    | Fixed                                                                                |
| Mockup but not code | Segmented tab container              | Fixed                                                                                |
| Code but not mockup | `Sort:` copy prefix                  | Kept intentionally because user requested clearer sorting affordance                 |
| Code but not mockup | Dark mode variant based on Concept A | Present in classes, but not visually verified because emulator toggle did not switch |

## Summary

### Mismatches

| ID   | Screen | Issue                                                       | Severity | Status                       |
| ---- | ------ | ----------------------------------------------------------- | -------- | ---------------------------- |
| S-01 | Bills  | Missing header add action                                   | Major    | Fixed                        |
| S-02 | Bills  | Tabs were separate large pills instead of segmented control | Major    | Fixed                        |
| S-03 | Bills  | Row amount was red/signed instead of neutral/no sign        | Major    | Fixed                        |
| S-04 | Bills  | Row status pill was beside title instead of under subtitle  | Major    | Fixed                        |
| S-05 | Bills  | Date was on the left instead of right side under amount     | Major    | Fixed                        |
| S-06 | Bills  | Summary card values lacked green/red emphasis               | Major    | Fixed                        |
| S-07 | Bills  | Sort chip copy includes `Sort:`                             | Minor    | Kept intentionally           |
| S-08 | Bills  | Dark mode not emulator-verified                             | Minor    | Needs follow-up verification |

### Matching Well

| Screen | Notes                                                                                                                                           |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Bills  | Overall screen hierarchy matches Concept A: summary card, next payment insight, status tabs, `Upcoming` list, sort chip, grouped rows, and FAB. |
| Bills  | Uses palette-backed NativeWind tokens and dark variants for the audited dashboard surfaces.                                                     |
