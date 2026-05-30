# Registry Audit: Egyptian Banks and Wallets

**Audit date**: 2026-05-25 **Scope**: Planning audit for issue #389 before
implementation.

## Source Priority

1. Central Bank of Egypt registered-bank list snapshot:
   https://ent.news/2025/10/1234.pdf
2. Public active-bank directory cross-check: https://banksegypt.com/banks
3. Official/provider sources for renamed institutions, mobile wallets, and
   payment providers:
   - Bank NXT: https://www.banknxteg.com/en/about/
   - KFH Egypt:
     https://www.kfh.com/en/home/Personal/news/2025/KFH-Egypt-Unveils-New-Identity.html
   - Bank ABC/BLOM merger:
     https://www.bank-abc.com/en/Media%20Relations/PressRelease/Pages/Bank-ABC-Egypt-successfully-completes-integration--with-BLOM-Bank-Egypt.aspx
   - NTRA telecom wallet report:
     https://www.tra.gov.eg/en/ntra-issues-q2-2025-report-on-the-usage-indicators-of-mobile-wallets-operated-by-telecom-companies/
   - Meeza mobile wallets: https://meeza-eg.com/meeza-e-wallet/
   - Fawry yellowcard: https://www.fawry.com/ar/myfawry-yellowcard/
   - onebank: https://www.onebank.eg/
   - American Express Egypt:
     https://www.americanexpress.com.eg/en-eg/fraud-protection-center/about-american-express/

## Current Registry Gaps

The existing `egyptian-bank-registry.ts` already contains most established
Egyptian banks, but it is stale around recent market changes.

### Banks to Add or Rename

| Decision               | Registry ID          | Display name            | Reason                                                                                                                                          |
| ---------------------- | -------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Add selectable bank    | `standard-chartered` | Standard Chartered Bank | Present in the CBE registered-bank snapshot and the active 2026 directory; missing from current registry.                                       |
| Rename selectable bank | `bank-nxt`           | Bank NXT                | Replaces current Arab Investment Bank/aiBANK selectable identity. Keep `arab-investment-bank`, `aibank`, and `ainvest` as legacy aliases.       |
| Rename selectable bank | `kfh-egypt`          | KFH Egypt               | Replaces current Ahli United Bank Egypt selectable identity. Keep `aub` and Ahli United aliases as legacy sender aliases.                       |
| Merge legacy-only      | `bank-abc`           | Bank ABC Egypt          | Current registry has Bank ABC and BLOM separately. BLOM should be legacy-only sender/alias metadata under Bank ABC, not a selectable duplicate. |
| Rename display         | `qnb-egypt`          | QNB Egypt               | Current registry says QNB Al Ahli. Use QNB Egypt as the current display identity and keep QNB Al Ahli as a legacy/alternate name.               |

### Banks to Keep Selectable

The target selectable bank catalog should include these active/current
institutions unless implementation discovers a newer official CBE list that
supersedes this audit:

- Abu Dhabi Commercial Bank Egypt
- Abu Dhabi Islamic Bank Egypt
- Agricultural Bank of Egypt
- Al Ahli Bank of Kuwait - Egypt
- Al Baraka Bank Egypt
- Arab African International Bank
- Arab Bank PLC
- Arab International Bank
- Attijariwafa Bank Egypt
- Bank ABC Egypt
- Bank NXT
- Bank of Alexandria
- Banque du Caire
- Banque Misr
- Citi Bank Egypt
- Commercial International Bank
- Credit Agricole Egypt
- Egyptian Arab Land Bank
- Egyptian Gulf Bank
- Emirates NBD Egypt
- Export Development Bank of Egypt
- Faisal Islamic Bank of Egypt
- First Abu Dhabi Bank Misr
- Housing and Development Bank
- HSBC Bank Egypt
- Industrial Development Bank
- KFH Egypt
- Mashreq Bank
- MIDBank
- National Bank of Egypt
- National Bank of Kuwait - Egypt
- QNB Egypt
- SAIB
- Standard Chartered Bank
- Suez Canal Bank
- The United Bank

### Banks and Financial Brands Not Selectable for This Release

| Decision                                                                    | Name                    | Reason                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pending/not selectable until implementation confirms public account opening | onebank                 | onebank has CBE approval/licensing momentum and public launch material, but implementation must confirm public consumer account availability before showing it in the dropdown.                                           |
| Exclude from bank/wallet dropdown                                           | American Express Egypt  | American Express Egypt is a card/payment-services brand, not a normal bank or wallet account provider for this feature. It may be considered later as non-selectable sender metadata only if real SMS samples require it. |
| Exclude or legacy-only unless current consumer availability is verified     | National Bank of Greece | Appears in one registered-bank snapshot but is absent from the active 2026 public directory. Do not show unless implementation verifies active consumer account availability from a current official source.              |
| Legacy-only                                                                 | BLOM Bank Egypt         | Legally and operationally merged into Bank ABC Egypt; keep as legacy sender/alias metadata under Bank ABC only.                                                                                                           |
| Exclude from this feature                                                   | InstaPay/IPN            | Product clarification explicitly excludes InstaPay/IPN from provider dropdowns and sender-registry entries for issue #389.                                                                                                |

## Wallet Audit

### Telecom Wallets

NTRA's Q2 2025 report identifies the active telecom mobile-wallet operators as:

- Vodafone Cash
- e& Cash
- Orange Cash
- WE Pay

Current registry contains Vodafone Cash, Orange Cash, and WE Pay. It is missing
e& Cash, which replaced/renamed the old Etisalat Cash branding. The registry
should add `e-and-cash` as the selectable identity and keep `etisalat-cash`
aliases for matching.

### Bank-Issued Meeza Mobile Wallets

Meeza confirms mobile-wallet services that can transfer to wallets, pay using
QR/R2P, cash in, cash out, and receive salary. The visible provider logos on the
Meeza page support adding these user-facing wallet products when they are still
active:

- NBE Phone Cash
- BM Wallet
- Qahera Cash
- QNB E-Wallet / Smart Wallet
- Credit Agricole banki Wallet
- NBK Mobile Wallet
- aiPAY / Bank NXT wallet

The implementation audit should verify current availability before making each
bank-issued wallet selectable, because the Meeza provider page includes legacy
logos such as Audi 2Pay that may no longer be current after bank acquisitions.

### Fawry/myFawry

Fawry's Yellowcard material describes a prepaid card that can be loaded, used
for payments, transfers, withdrawals, and balance-related financial services.
Include `myfawry-yellowcard` as a selectable wallet/card-account provider if the
implementation confirms it behaves as a balance-holding user account in the
target account model. Do not include plain Fawry as a generic payment network
provider.

## Registry Implementation Implications

- Add stable IDs for every selectable provider.
- Keep one current selectable identity per renamed/acquired institution.
- Represent legacy brands as aliases or legacy sender patterns under the current
  identity.
- Do not add InstaPay/IPN.
- Do not ship a selectable provider unless it has local logo coverage.
- Add type-level or unit coverage so selectable providers and mobile logo assets
  cannot drift.

## Logo Source Audit Notes

**Audit date**: 2026-05-25 **Decision**: Do not use CBE, NTRA, or third-party
directories as the bundled logo source for this release.

CBE and NTRA are useful for validating regulated entities and telecom wallet
operators, but they do not provide a current, consistent, app-ready logo set for
all selected providers. NTRA's wallet guidance still shows older Etisalat Cash
branding, so it is not current enough for the `e-and-cash` identity.

Use this source priority for provider logo assets:

1. Official provider brand/media kit when available.
2. Official provider website logo asset when no brand kit exists.
3. Official app-store listing icon only for wallet-specific app identities where
   the official website does not expose a clean current wallet logo.
4. Third-party directories, SVG sites, and Wikimedia assets may be used only as
   visual references unless product/legal approval explicitly accepts them.

Every bundled logo asset should have a source note with provider, source URL,
verification date, source type, and license/trademark note. Logo files should be
normalized locally for offline display and bundle size, but should not be
redrawn or modified in a way that changes the brand mark.

Rebrand-sensitive providers require official current sources:

- `bank-nxt`: use Bank NXT official sources, not Arab Investment Bank/aiBANK.
- `kfh-egypt`: use KFH Egypt/KFH Group sources, not Ahli United Bank.
- `qnb-egypt`: use QNB Egypt/current QNB brand sources, not QNB Al Ahli.
- `e-and-cash`: stable ID retained; product-confirmed display/logo branding is
  `e& money`. Use e& Egypt/e& money current sources, not old Etisalat Cash.
- `standard-chartered`: use Standard Chartered Egypt/global official sources.

Open product confirmation before bundling:

- Citi Bank Egypt: product-confirmed decision is to use the Egypt-facing Citi
  variant.
- e& Cash/e& money: product-confirmed decision is to present current `e& money`
  branding while retaining `e-and-cash` as the stable registry ID and legacy
  sender aliases.

## Manual Validation Notes

- Registry source review remains manual-only for final release approval: the
  implementation has automated coverage for selectable IDs, rename decisions,
  InstaPay/IPN exclusion, and sender aliases, but final provider availability is
  still tied to periodically checking official provider/CBE/NTRA pages.
- Logo review remains manual-only until provider-specific image files are
  bundled. The current implementation includes exhaustive default local assets
  and a source manifest; replacing defaults must use official
  provider-controlled sources recorded in `logo-source-manifest.md`.
- Wallet availability decisions are intentionally conservative: Vodafone Cash,
  e& money, Orange Cash, and WE Pay are selectable; generic Meeza, generic
  Fawry, and InstaPay/IPN are not selectable for this issue.
