# Feature Specification: Egyptian Institution Presets

**Feature Branch**: `382-egyptian-institution-presets` **Created**: 2026-05-25
**Status**: Draft **Input**: User description: "Issue #389: make the existing
Egyptian bank registry the source of truth for bank and wallet presets, logos,
and SMS sender presets. Audit it against all available banks and relevant
wallets in Egypt before building the UI. Show Egyptian bank/wallet dropdowns
only for Egyptian users or EGP-preference users. Support separate searchable
bank and e-wallet dropdowns, Other/free-text fallback, multiple SMS sender names
per account, wallet sender metadata, provider logos, fallback icons, and clear
explainer copy. Exclude InstaPay/IPN from dropdowns and from the sender registry
for this issue."

## Clarifications

### Session 2026-05-25

- Q: When a user selects a known bank or wallet, should the account save the
  stable registry provider identity or only text values? -> A: Save the stable
  known provider identity too, alongside display text and custom sender values.
- Q: How should users enter multiple SMS sender names? -> A: Use chips/tokens:
  each sender appears as a removable item, with an input to add another.
- Q: Should Fawry/myFawry appear in the wallet dropdown for this issue? -> A:
  Include myFawry Yellowcard or another verified Fawry balance-holding
  wallet/account product only if it fits the account model; do not include plain
  Fawry as a generic payment network.
- Q: How should account names, provider names, and provider identity differ? ->
  A: `accounts.name` remains the user's account nickname.
  `accounts.provider_display_name` stores the bank/wallet provider display name,
  and `accounts.institution_id` stores the stable known-provider identity when
  one exists.
- Q: Should known-provider uniqueness still use only account name and currency?
  -> A: No. Known-provider account uniqueness should use account name, currency,
  and `institution_id`. Manual/Other providers use account name, currency, and
  normalized `provider_display_name` when provider text exists; if no provider
  text exists, uniqueness falls back to account name plus currency.
- Q: Should legacy `bank_details.bank_name` and `bank_details.sms_sender_name`
  remain active fields? -> A: No. The app is pre-production, so provider display
  moves to `accounts.provider_display_name`, sender values move to
  `account_sms_senders`, and the old bank-only fields do not need compatibility
  retention.
- Q: For manual/Other providers where `institution_id` is null, should duplicate
  checking include the free-text provider name? -> A: Yes when provider text
  exists. Compare it after trimming and case-normalizing; if no provider text
  exists, use only account name plus currency.
- Q: Should known provider sender aliases be saved as editable chips? -> A: No.
  The registry senders for the selected `institution_id` are always used
  internally for matching. The visible sender field is only for
  custom/additional sender aliases.
- Q: Should bank-issued Meeza wallets from the audit appear in the wallet
  dropdown? -> A: Include verified bank-issued Meeza wallets in this feature's
  wallet dropdown only when current availability can be confirmed during
  implementation.
- Q: When a known provider is renamed later in the registry, what should
  existing accounts display? -> A: Known-provider accounts display current
  registry metadata by `institution_id`; `provider_display_name` remains a saved
  snapshot or fallback.
- Q: Should custom sender chips be allowed to duplicate verified preset senders
  if casing or spacing differs? -> A: No. Sender values are trimmed and
  case-normalized for duplicate detection within the same account.
- Q: In the new account flow, what happens when the user switches between Bank
  and Digital Wallet account types? -> A: Clear `institution_id`,
  `provider_display_name`, and sender chips. SMS sender chips belong in a shared
  bank/wallet provider-and-senders section, while card/account-number fields
  remain bank-only.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Egyptian user selects a known bank or wallet (Priority: P1)

An Egyptian user creates or edits an account. When they choose a bank account,
they can search and select from Egyptian banks. When they choose a digital
wallet account, they can search and select from Egyptian wallet providers. The
selected provider shows a recognizable logo, uses the short name with the full
name beside it, and automatically uses all known registry SMS sender names
internally to match transaction messages.

**Why this priority**: This is the core value of the feature. Users should not
need to know SMS sender names or type bank names manually before they can get
the SMS automation benefits.

**Independent Test**: Start account creation as an Egypt-context user, choose
Bank, select a known bank, verify the display label, logo, and SMS sender values
are configured internally while the visible sender field remains available only
for custom additions. Repeat with Digital Wallet and verify wallet providers
appear instead of banks.

**Acceptance Scenarios**:

1. **Given** a user whose financial context is Egypt, **When** they choose
   account type Bank, **Then** they see a searchable list of Egyptian banks
   sourced from the canonical Egyptian institution catalog and no wallet-only
   providers.
2. **Given** the user is viewing the bank list, **When** they select CIB,
   **Then** the selected label reads `CIB (Commercial International Bank)`, the
   CIB logo is shown, and CIB registry sender names are configured for matching
   without appearing as editable chips.
3. **Given** a user whose financial context is Egypt, **When** they choose
   account type Digital Wallet, **Then** they see a searchable list of Egyptian
   wallet providers sourced from the same canonical catalog and no banks.
4. **Given** the user selects Vodafone Cash as a wallet provider, **When** the
   wallet details are shown, **Then** the Vodafone Cash logo is shown and its
   known sender names are configured for matching without appearing as editable
   chips.
5. **Given** the user switches account type from Bank to Digital Wallet in the
   new account flow, **When** provider selection is shown again, **Then**
   `institution_id`, provider display text, and sender chips are cleared, bank-
   only providers are no longer visible, and wallet-only providers are visible.
6. **Given** a provider has Arabic display metadata available, **When** the app
   is shown in Arabic, **Then** the provider can display the Arabic name without
   losing the canonical short and full-name identity used for matching.

---

### User Story 2 - User can enter a bank or wallet manually (Priority: P1)

A user whose bank or wallet is not listed, or whose context is not Egypt, can
still create the account by choosing Other or using free text. These accounts
receive a sensible default bank or wallet icon and can still store custom SMS
sender names.

**Why this priority**: The preset list must reduce friction without blocking
users whose provider is missing, renamed, new, or outside Egypt.

**Independent Test**: Create a Bank account using Other, enter a custom provider
name and custom sender value, save, and verify the account uses the custom name,
default bank icon, and editable sender value. Repeat for Digital Wallet.

**Acceptance Scenarios**:

1. **Given** an Egypt-context user is viewing the bank dropdown, **When** they
   choose Other, **Then** a free-text provider-name field appears and the
   account uses the default bank icon unless a known provider is later selected.
2. **Given** an Egypt-context user is viewing the wallet dropdown, **When** they
   choose Other, **Then** a free-text wallet/provider-name field appears and the
   account uses the default wallet icon unless a known provider is later
   selected.
3. **Given** a user whose financial context is not Egypt, **When** they create a
   Bank or Digital Wallet account, **Then** they can enter provider details
   manually without seeing Egyptian preset dropdowns.
4. **Given** the user enters an SMS sender name that is not known, **When** the
   sender value is shown, **Then** Monyvi allows it and shows a friendly
   unverified hint.

---

### User Story 3 - SMS matching handles all sender names for banks and wallets (Priority: P1)

A user can save more than one SMS sender name for the same bank or wallet
account. For known providers, Monyvi always uses the selected provider's
registry sender names internally, and user-entered chips are custom additions.
Later, when an SMS arrives from any registry sender or saved custom sender for
that account, Monyvi can match it to the right account without requiring the
user to duplicate accounts or enter multiple senders into one field. In the
form, each custom sender appears as its own removable item with an input to add
another sender.

**Why this priority**: Egyptian financial institutions often send from multiple
sender names. Matching only one sender risks missed transaction detection, which
directly weakens the app's automation promise.

**Independent Test**: Save a bank account with two sender names and a wallet
account with two sender names. Match sample SMS messages from each sender and
verify each message resolves to the intended account.

**Acceptance Scenarios**:

1. **Given** a known bank account has a selected `institution_id`, **When** an
   SMS arrives from any registry sender for that institution, **Then** the
   account can be matched by sender even if no custom sender chips are saved.
2. **Given** a digital wallet account has a saved sender name, **When** an SMS
   arrives from that sender, **Then** the wallet account can be matched by
   sender even though it has no bank card details.
3. **Given** a bank account has sender names and card-last-four details,
   **When** an SMS contains both a matching sender and matching card digits,
   **Then** sender-plus-card matching remains the highest-confidence result.
4. **Given** an account has duplicate or empty sender values during editing,
   **When** the user tries to save, **Then** Monyvi prevents empty duplicates
   from becoming saved sender values and explains the problem simply.
5. **Given** a known bank or wallet account has custom sender chips, **When**
   the user opens the account edit flow, **Then** only custom sender values
   remain visible and editable as chips, registry defaults stay internal, and
   the old single bank sender field is not shown.

---

### User Story 4 - User understands why bank or wallet details matter (Priority: P2)

A user who is unsure why Monyvi asks for bank or wallet details can tap an info
control and see a compact explanatory popover. The copy explains that SMS
details help Monyvi turn transaction messages into records, and reassures the
user that the details are only used to match SMS alerts and no PINs or passwords
are needed.

**Why this priority**: The explainer improves trust and completion, but the
feature can still deliver its primary value with presets and sender matching.

**Independent Test**: Open account creation, tap the info control beside the
bank/wallet details prompt, verify the explanation appears in the active
language, and dismiss it.

**Acceptance Scenarios**:

1. **Given** the user is on account creation or account editing, **When** they
   tap the info control beside bank/wallet details, **Then** a localized compact
   explanatory popover appears without leaving the screen.
2. **Given** the explanation is visible, **When** the user dismisses it,
   **Then** they return to the same form state they had before opening it.
3. **Given** the app is running in Arabic, **When** the user opens the
   explanation, **Then** all visible copy is Arabic.
4. **Given** the explanation is opened, **When** the app presents the message,
   **Then** it uses Monyvi-owned explanatory UI rather than a native alert.

### Edge Cases

- A bank has been renamed or acquired: the current name appears once in
  selectable lists, while legacy sender names remain matchable only when they
  are verified as real sender names.
- A provider has no logo asset yet: it cannot ship as a selectable known
  provider until a logo or approved fallback brand mark is assigned.
- A new provider is added to the canonical catalog: the release is considered
  incomplete until the provider also has visual identity coverage and appears in
  the correct bank or wallet list.
- A user changes from a known provider to Other: previously selected preset
  sender values are not silently kept if they no longer match the visible
  provider choice.
- A user changes from Other to a known provider: the known provider identity
  replaces the manual provider identity only after the user selects it; registry
  sender defaults stay internal and custom sender chips start empty.
- A user prefers EGP but is physically outside Egypt: Egyptian presets are still
  shown because EGP preference is enough to indicate Egyptian financial context.
- A user is in Egypt but prefers another currency: Egyptian presets are still
  shown because the device/runtime region indicates Egypt.
- InstaPay/IPN transaction messages are handled through the sending bank when
  applicable. InstaPay/IPN do not appear as providers or sender-registry entries
  for this feature.
- A public data source disagrees with another source about a bank's current name
  or status: the implementation records the decision and reason instead of
  silently omitting or duplicating the institution.
- A legacy sender name belongs to a renamed or acquired bank: it may remain
  matchable for existing SMS messages, but it must not create a duplicate
  selectable provider.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Monyvi MUST use the existing Egyptian financial sender registry as
  the canonical catalog for banks, wallet providers, display names, and known
  sender names.
- **FR-002**: The canonical catalog MUST include active Egyptian banks available
  to users at implementation time, using the current CBE-registered bank list as
  the primary source when available.
- **FR-003**: The canonical catalog MUST include major Egyptian wallet providers
  used by users, at minimum Vodafone Cash, Orange Cash, e& Cash with Etisalat
  Cash aliases, WE Pay, and myFawry Yellowcard or another Fawry balance-holding
  product only when verified as a wallet/account provider.
- **FR-003a**: Bank-issued Meeza wallets MAY be selectable wallet providers only
  when implementation verifies current availability for each wallet product;
  otherwise they remain excluded or are documented as deferred.
- **FR-004**: The canonical catalog MUST NOT include InstaPay/IPN as selectable
  providers or as sender-registry entries for this feature.
- **FR-005**: Any companion display, dropdown, or visual-asset list MUST be
  derived from or coverage-checked against the canonical catalog so the lists
  cannot drift.
- **FR-006**: If the CBE source is unavailable during implementation, the bank
  audit MUST be cross-checked against at least one public Egyptian banking
  directory or equivalent reputable source.
- **FR-007**: The bank audit MUST explicitly resolve or document these known
  triage items: Standard Chartered Bank, Bank NXT versus Arab Investment Bank,
  Kuwait Finance House - Egypt versus Ahli United Bank legacy naming, onebank
  S.A.E., American Express Egypt, and BLOM Bank legacy/exclusion handling.
- **FR-007a**: The implementation MUST apply the registry audit findings in
  `registry-audit.md`: Standard Chartered is added as a selectable bank; Bank
  NXT replaces Arab Investment Bank/aiBANK as the selectable identity; KFH Egypt
  replaces Ahli United Bank Egypt as the selectable identity; BLOM is
  legacy-only under Bank ABC; American Express Egypt is not a bank/wallet
  dropdown provider; onebank is not selectable until public consumer account
  availability is confirmed.
- **FR-008**: Renamed or acquired institutions MUST appear once under the
  current selectable identity, while verified legacy sender names may remain
  matchable.
- **FR-009**: Provider metadata MUST include Arabic names when available.
- **FR-010**: Egyptian preset dropdowns MUST be visible only when the user's
  context is Egypt-specific: preferred currency is EGP or device/runtime region
  resolves to Egypt.
- **FR-011**: If there is no persisted user region, Monyvi MUST use existing
  currency or runtime-region signals and document whether a future user-region
  preference is needed.
- **FR-012**: Non-Egypt-context users MUST be able to enter bank and wallet
  provider details manually without being shown Egyptian preset dropdowns.
- **FR-013**: Bank accounts MUST show a searchable bank-only provider dropdown
  when Egyptian presets are eligible.
- **FR-014**: Digital wallet accounts MUST show a searchable wallet-only
  provider dropdown when Egyptian presets are eligible.
- **FR-015**: Provider dropdown labels MUST show the short name followed by the
  full name in parentheses.
- **FR-016**: Each provider dropdown MUST include an Other option that reveals a
  free-text provider-name field.
- **FR-017**: Selecting a known provider MUST configure all verified registry
  sender names for that provider internally and MUST NOT show those default
  senders as editable chips.
- **FR-018**: Monyvi MUST allow custom sender values in addition to registry
  defaults and clearly mark unknown custom values as unverified without blocking
  account creation or editing.
- **FR-019**: Sender preset validation MUST accept every verified sender alias
  for the selected institution.
- **FR-020**: Selecting a known provider MUST save the provider's stable
  registry identity alongside the account's display text and custom sender
  values.
- **FR-020a**: The provider display value MUST be saved as account-level
  `provider_display_name`; `accounts.name` remains the user-controlled account
  nickname.
- **FR-020b**: Known-provider account uniqueness MUST include normalized account
  name, currency, and `institution_id`. Accounts without `institution_id` MUST
  include normalized `provider_display_name` in the uniqueness identity when it
  exists; if it does not exist, uniqueness uses normalized account name plus
  currency.
- **FR-020c**: For accounts with `institution_id`, account display MUST resolve
  the current provider name and logo from the registry and visual asset map.
  `provider_display_name` is a saved snapshot or fallback, not the primary
  display authority for known providers.
- **FR-021**: Accounts created through Other or manual free text MUST have no
  known-provider identity until the user explicitly selects a known provider.
- **FR-021a**: `institution_id` and `provider_display_name` are optional for
  Bank and Digital Wallet accounts. Missing values MUST be represented as null
  or empty optional fields, never as an empty-string ID.
- **FR-022**: Monyvi MUST store and use multiple sender values per bank or
  wallet account as separate saved sender values.
- **FR-023**: Multiple sender entry MUST use separate sender chips or tokens,
  where each sender appears as a removable value and users can add another
  sender through an adjacent input.
- **FR-023a**: Sender chip duplicate detection MUST trim whitespace and compare
  case-normalized values within the same account. Cosmetic casing or spacing
  differences must not create duplicate saved sender rows.
- **FR-024**: Wallet accounts MUST support sender metadata even when they do not
  have bank card details.
- **FR-024a**: SMS sender entry MUST live in a shared provider-and-senders UI
  section used by both Bank and Digital Wallet account types. Bank-specific
  card/account-number fields MUST remain separate and visible only where bank
  details apply.
- **FR-024b**: In the new account flow, switching between Bank and Digital
  Wallet MUST clear `institution_id`, `provider_display_name`, and sender chips
  before showing the provider list for the new account type.
- **FR-025**: SMS account matching MUST consider every registry sender for a
  known account's `institution_id` plus every saved custom sender value for a
  bank or wallet account.
- **FR-026**: Bank SMS matching MUST preserve sender-plus-card-last-four
  confidence behavior where card details are available.
- **FR-027**: Matching behavior MUST remain safe for repeated SMS processing and
  MUST NOT weaken existing duplicate-message protection.
- **FR-028**: The old single bank sender field MUST be replaced by the new
  multi-sender experience. No production backfill is required because the app
  has no real users yet.
- **FR-028a**: `bank_details.bank_name` and `bank_details.sms_sender_name` MUST
  be removed from the active product model for this feature. Bank details should
  retain only bank-specific metadata such as card last four and account number
  where still useful.
- **FR-029**: Every selectable known provider MUST have a logo or approved brand
  mark for account setup and account display.
- **FR-030**: Provider logos MUST be available without waiting for a remote
  image download at the moment the provider or account is displayed.
- **FR-031**: The visual identity coverage MUST be exhaustive for every
  selectable known provider; a provider without visual identity coverage is not
  ready for release.
- **FR-032**: Accounts created through Other or free text MUST display a default
  bank icon for bank accounts and a default wallet icon for wallet accounts.
- **FR-033**: Account cards MUST show the known provider logo for selected known
  banks or wallets and must fall back cleanly for manually entered providers.
- **FR-034**: Account setup and edit screens MUST include an info control next
  to the bank/wallet details prompt.
- **FR-035**: The info control MUST open a compact explanatory popover
  describing that bank/wallet details are used only to match SMS alerts and that
  no PINs or passwords are needed. The surface MUST stay compact, avoid covering
  unrelated form content where practical, and close when the user taps outside
  it.
- **FR-036**: The explainer MUST use Monyvi-owned UI and MUST NOT use a native
  alert as the explanatory surface.
- **FR-037**: All user-visible copy for this feature MUST be available in
  English and Arabic.
- **FR-038**: The feature MUST include validation coverage for registry sender
  aliases, bank/wallet provider filtering, Egypt-context eligibility, provider
  selection, Other/free-text fallback, internal registry sender matching, custom
  sender edits, visual fallback behavior, multiple sender matching, wallet
  matching, legacy aliases, unknown sender fallback, and sender-plus-card
  matching.
- **FR-039**: The feature MUST include complete create/edit account journey
  coverage for bank and wallet accounts, with any manual-only scenarios called
  out explicitly.

### Key Entities

- **Egyptian Financial Institution**: A bank or wallet provider available to
  Egyptian users. Key attributes include stable identity, current short name,
  current full name, Arabic name when available, provider kind, selectable
  status, current/legacy status, and verified sender names.
- **Sender Name**: A verified or user-entered SMS sender value that can be used
  to associate incoming transaction messages with a user account. Sender names
  may be provider presets, legacy aliases, or user-entered custom values.
- **Account Provider Selection**: The user's chosen known provider or manual
  Other provider name for a bank or digital wallet account. Known selections
  include a stable registry identity; Other/manual selections do not.
- **Provider Visual Identity**: The logo or default icon used to represent a
  known provider or a manually entered provider. Known providers require
  provider-specific visual coverage; manually entered providers use account-type
  defaults.
- **Egypt Financial Context**: The signal that determines whether Egyptian
  presets are useful for the current user, based on preferred currency or
  device/runtime region.
- **Institution Audit Decision**: A recorded decision about whether a provider
  is included, excluded, renamed, legacy-only, or not selectable for this
  release.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: In internal testing, an Egypt-context user can create a known bank
  account with registry sender matching configured in under 90 seconds from
  opening the create-account screen.
- **SC-002**: In internal testing, an Egypt-context user can create a known
  wallet account with registry sender matching configured in under 90 seconds
  from opening the create-account screen.
- **SC-003**: 100% of verified active Egyptian banks identified for this release
  are represented exactly once in the selectable bank list or explicitly
  documented as excluded with a reason.
- **SC-004**: 100% of named triage items from issue #389 have an inclusion,
  exclusion, rename, or legacy-only decision recorded before implementation is
  accepted.
- **SC-005**: 100% of selectable known providers have a visible logo or approved
  fallback brand mark during setup and account display.
- **SC-006**: Sample SMS messages from all verified sender names in the catalog
  resolve to the expected provider identity during test validation.
- **SC-007**: Users can save at least three sender names for one bank or wallet
  account and later match messages from each sender to that same account.
- **SC-008**: Non-Egypt-context users can complete bank or wallet account
  creation without interacting with an Egyptian preset dropdown.
- **SC-009**: English and Arabic review passes find no untranslated user-visible
  strings introduced by this feature.
- **SC-010**: Account creation and editing tests cover both known-provider and
  Other-provider flows for bank and wallet accounts.

## Source And Coverage Notes

- Primary bank-list source should be the current Central Bank of Egypt
  registered-bank list when accessible.
- If the primary source is inaccessible, cross-check against a reputable public
  Egyptian banking directory.
- Issue #389 triage sources include:
  - Public directory snapshot showing 36 active institutions and entries such as
    Standard Chartered, Bank NXT, and KFH Egypt: https://banksegypt.com/banks
  - One Bank digital-bank license report:
    https://egyptinnovate.com/en/news/the-central-bank-grants-one-bank-the-first-license-to-operate-digital-banking-in-egypt
  - KFH Egypt rename evidence:
    https://www.eg.kfh.com/wp-content/uploads/2025/07/Financial-Statements-Q2-Consolidated-English.pdf
  - NTRA mobile wallet services overview:
    https://www.tra.gov.eg/en/regulations/consumer-manuals-and-tips/mobile-wallet-services/
  - Meeza mobile-wallet network overview: https://meeza-eg.com/meeza-e-wallet/
- Named issue triage items requiring explicit decisions: Standard Chartered
  Bank, Bank NXT, Kuwait Finance House - Egypt, Ahli United Bank legacy aliases,
  onebank S.A.E., American Express Egypt, and BLOM Bank.
- Registry audit findings are recorded in
  `specs/027-egyptian-institution-presets/registry-audit.md` and must be applied
  before implementation is considered complete.

## Assumptions

- The target market for these presets is Egyptian users and users who choose EGP
  as their preferred currency.
- Preferred currency or device/runtime region is enough to decide whether to
  show Egyptian presets; no new user-facing region setting is required for this
  feature.
- InstaPay/IPN are excluded because current product evidence says the sending
  bank usually sends the SMS for InstaPay transactions.
- Provider lists should favor currently active, user-selectable account
  providers. Legacy or renamed sender values may remain useful for matching, but
  they should not create duplicate selectable providers.
- myFawry Yellowcard or another Fawry balance-holding product should be included
  only to the extent it is verified as a relevant account or wallet provider for
  user balances, not merely as a payment network label.
- Users may still add custom sender names because real SMS sender names can vary
  by bank, wallet, card product, or telecom routing.
- The full SMS auto-import pipeline is outside this feature unless already
  present; this feature prepares account metadata and matching behavior.
