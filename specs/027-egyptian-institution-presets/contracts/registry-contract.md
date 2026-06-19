# Contract: Egyptian Institution Registry

## Purpose

Define the shared institution catalog used by SMS filtering, bank/wallet
dropdowns, sender presets, and mobile visual coverage.

## Exports

- `EGYPTIAN_FINANCIAL_INSTITUTIONS`: readonly list of canonical institution
  records.
- `EgyptianInstitutionId`: literal union of all stable institution IDs.
- `SelectableEgyptianInstitutionId`: literal union of selectable bank/wallet
  institution IDs.
- `EgyptianInstitutionType`: institution kind.
- `isKnownFinancialSender(senderAddress)`: returns matching institution metadata
  when the sender matches a verified pattern.
- `getSelectableEgyptianInstitutions(type)`: returns selectable bank or wallet
  entries only.
- `getInstitutionById(id)`: returns canonical metadata for a stable ID.
- `getSenderPatternsForInstitution(id)`: returns verified sender aliases for
  prefill and validation.

## Behavioral Contract

- Sender matching is case-insensitive.
- Exact sender matches are preferred before substring fallback.
- Very short sender aliases must not create broad false positives.
- A selectable institution must have exactly one stable ID.
- Renamed/acquired institutions are represented once as the current selectable
  provider; legacy aliases may remain sender patterns.
- The registry update must apply `registry-audit.md` before implementation:
  Standard Chartered selectable, Bank NXT current over Arab Investment/aiBANK,
  KFH Egypt current over Ahli United Bank Egypt, and BLOM legacy-only under Bank
  ABC.
- InstaPay/IPN are absent for this feature.
- myFawry Yellowcard or another Fawry product is selectable only if the audit
  confirms balance-holding wallet/account behavior; plain Fawry as a generic
  payment network is not selectable for this feature.
- e& Cash is the current selectable telecom wallet identity; Etisalat Cash may
  remain as legacy sender/alias metadata.
- Bank-issued Meeza wallets are selectable only after current availability is
  verified per wallet product.

## Acceptance Tests

- Known sender aliases resolve to expected canonical institutions.
- Legacy aliases resolve without creating duplicate selectable providers.
- Bank filter returns only selectable banks.
- Wallet filter returns only selectable wallets.
- Unknown sender returns no match.
- Adding a selectable institution without mobile visual coverage fails typecheck
  or an equivalent static coverage test.
