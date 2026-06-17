# Implementation Plan: Egyptian Institution Presets

**Branch**: `382-egyptian-institution-presets` | **Date**: 2026-05-25 |
**Spec**: [spec.md](./spec.md) **Input**: Feature specification from
`specs/027-egyptian-institution-presets/spec.md`

## Summary

Make `packages/logic/src/parsers/egyptian-bank-registry.ts` the canonical
catalog for Egyptian banks, wallets, SMS sender aliases, and selectable provider
metadata. The implementation will add stable account-level institution identity,
account-level provider display text, normalized multi-sender account metadata,
exhaustive local mobile logo coverage, and separate bank/wallet provider
selectors while preserving offline-first WatermelonDB writes, existing SMS
duplicate protection, and package boundaries.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, React Native 0.83.6, Expo
55.0.24 **Primary Dependencies**: WatermelonDB 0.28, Supabase JS 2.106, Expo
Router, Expo Localization, NativeWind 4.2, Zod, React Native Testing Library,
Jest, Maestro **Storage**: WatermelonDB local SQLite as the user-facing source
of truth; Supabase PostgreSQL for background sync; local bundled mobile assets
for logos **Testing**: Jest, React Native Testing Library `renderHook`,
TypeScript typecheck, mobile i18n coverage check, local DB generation checks,
Maestro, and manual Android SMS/account journey validation **Target Platform**:
Expo React Native mobile app on Android and iOS, with Android SMS matching paths
explicitly covered **Project Type**: Monorepo mobile app with shared logic and
database packages **Performance Goals**: Provider dropdowns open from local data
only; account cards render known-provider logos without remote image fetches;
sender matching uses normalized local lookup data and avoids N+1 account reads.
**Constraints**: Offline-first local writes; authenticated user scoping; local
SQL migrations only; no Supabase dashboard/MCP DDL; no reverse package imports;
`null` for missing IDs, never `""`; sender values stored separately, not as
comma-separated text; NativeWind styling except documented exceptions; no native
alert for the explainer. **Scale/Scope**: Dozens of Egyptian institutions, a
small set of sender aliases per account, create/edit/account-card flows, bank
and wallet account matching, and registry audit coverage for issue #389.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Offline-first data architecture**: PASS. Known provider identity and sender
  rows will be written to WatermelonDB first and synced in the background.
- **Documented business logic**: PASS with implementation task. Update
  `docs/business/business-decisions.md` before implementation handoff to reflect
  institution identity and multi-sender account metadata.
- **Type safety**: PASS. Registry IDs must be literal unions derived from
  readonly catalog data; helpers use explicit return types and no `any`.
- **Service-layer separation**: PASS. DB writes stay in account command
  services; multi-table read shaping and SMS matching data loading stay in
  services/read-model services; hooks remain UI/lifecycle facades.
- **Premium UI/theming**: PASS. Selectors, chips, compact explainer popover, and
  logo display use existing UI patterns and NativeWind constraints.
- **Monorepo package boundaries**: PASS. `packages/logic` exports pure registry
  data/helpers; `packages/db` owns schema/models; `apps/mobile` adapts assets,
  services, hooks, and UI.
- **Local-first migrations**: PASS. Schema changes require a local SQL migration
  plus generated WatermelonDB schema, migrations, and types.
- **Authenticated scope and sync correctness**: PASS. `account_sms_senders` is a
  child table owned through `accounts`; reads, writes, push, and pull scope must
  resolve through the owned parent account.

## Project Structure

### Documentation (this feature)

```text
specs/027-egyptian-institution-presets/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- registry-audit.md
|-- contracts/
|   |-- registry-contract.md
|   |-- account-provider-ui-contract.md
|   `-- sms-matching-contract.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
```

### Source Code (repository root)

```text
packages/logic/src/parsers/
|-- egyptian-bank-registry.ts
`-- __tests__/
    `-- egyptian-bank-registry.test.ts

packages/db/src/
|-- models/
|   |-- Account.ts
|   |-- AccountSmsSender.ts
|   `-- base/
|       |-- base-account.ts
|       `-- base-account-sms-sender.ts
|-- schema.ts
|-- migrations.ts
|-- database.ts
|-- types.ts
`-- supabase-types.ts

supabase/migrations/
`-- NNN_account_institution_senders.sql

apps/mobile/
|-- assets/institutions/
|   |-- banks/
|   |-- wallets/
|   `-- defaults/
|-- components/add-account/
|   |-- BankCardDetailsSection.tsx
|   |-- InstitutionProviderSection.tsx
|   |-- InstitutionPicker.tsx
|   |-- SenderChipsField.tsx
|   `-- SmsMatchingSection.tsx
|-- components/accounts/
|   `-- AccountCard.tsx
|-- constants/
|   `-- egyptian-institution-assets.ts
|-- hooks/
|   |-- useAccountForm.ts
|   |-- useEditAccountForm.ts
|   `-- useEgyptianInstitutionEligibility.ts
|-- services/
|   |-- account-service.ts
|   |-- edit-account-service.ts
|   |-- account-sms-sender-service.ts
|   |-- account-institution-presentation.ts
|   `-- sms-account-matcher.ts
|-- validation/
|   `-- account-validation.ts
|-- locales/en/accounts.json
|-- locales/ar/accounts.json
`-- e2e/maestro/accounts/
    `-- egyptian-institution-presets.yaml
```

**Structure Decision**: Use existing monorepo boundaries. Shared registry and
sender lookup live in `packages/logic`; persisted schema/model ownership lives
in `packages/db`; mobile-specific assets, account writes, read models, hooks,
and UI live in `apps/mobile`.

## Phase 0: Research Output

See [research.md](./research.md).

Key decisions:

- Use stable literal registry IDs plus account-level provider display text for
  known and manual bank/wallet selections.
- Make known-provider account uniqueness provider-aware:
  `name + currency + institution_id`; for accounts without `institution_id`, use
  `name + currency + normalized provider_display_name` when provider text
  exists, otherwise fall back to `name + currency`.
- Add `account_sms_senders` as normalized child rows rather than storing
  multiple senders on `accounts` or in a comma-separated field.
- Keep `bank_details` for bank-only metadata such as card last four and account
  number; stop treating it as the owner of provider names or sender metadata.
- Use local bundled provider logo assets and an exhaustive asset map for
  selectable known providers.
- Treat myFawry Yellowcard or another Fawry balance-holding product as
  selectable only if audit confirms it is a wallet/account provider; do not add
  plain Fawry as a generic payment network.
- Exclude InstaPay/IPN from provider dropdowns and sender registry entries.
- Apply [registry-audit.md](./registry-audit.md) findings before implementation:
  add Standard Chartered, rename Bank NXT and KFH Egypt, make BLOM legacy-only
  under Bank ABC, add e& Cash, verify bank-issued Meeza wallets, and verify
  myFawry Yellowcard before marking it selectable.

## Phase 1: Design Output

See:

- [data-model.md](./data-model.md)
- [registry-audit.md](./registry-audit.md)
- [contracts/registry-contract.md](./contracts/registry-contract.md)
- [contracts/account-provider-ui-contract.md](./contracts/account-provider-ui-contract.md)
- [contracts/sms-matching-contract.md](./contracts/sms-matching-contract.md)
- [quickstart.md](./quickstart.md)

## Post-Design Constitution Check

- **Offline-first**: PASS. Account identity and sender metadata remain local
  first; provider logos are bundled for offline display.
- **Business decisions**: PASS with tracked implementation task to update
  `docs/business/business-decisions.md`.
- **Type safety**: PASS. Contracts require stable literal IDs, nullable missing
  IDs, provider display text, normalized sender rows, and exhaustive visual
  coverage.
- **Service separation**: PASS. Writes, read models, and SMS matching stay
  service-owned; hooks and components render shaped state.
- **UI/theming**: PASS. Chips, dropdowns, compact explainer popover, and logo
  rendering use existing UI primitives and NativeWind rules.
- **Package boundaries**: PASS. No reverse imports are required.
- **Migrations**: PASS. Plan requires local SQL migration, DB generation, and
  WatermelonDB migration/version update.
- **User scope/sync**: PASS. Sender child rows are scoped through owned parent
  accounts.

## Complexity Tracking

No constitution violations are planned.
