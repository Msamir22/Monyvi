import type { AccountType } from "@monyvi/db";
import {
  getInstitutionById,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";

import { getEgyptianInstitutionAsset } from "../constants/egyptian-institution-assets";

type AccountInstitutionKind = "bank" | "wallet";

export interface AccountInstitutionSource {
  readonly type: AccountType;
  readonly institutionId?: string | null;
  readonly providerDisplayName?: string;
}

export interface AccountInstitutionPresentation {
  readonly kind: AccountInstitutionKind;
  readonly institutionId: SelectableEgyptianInstitutionId | null;
  readonly providerLabel: string | null;
  readonly asset: ReturnType<typeof getEgyptianInstitutionAsset>;
}

function getInstitutionKind(type: AccountType): AccountInstitutionKind | null {
  if (type === "BANK") {
    return "bank";
  }
  if (type === "DIGITAL_WALLET") {
    return "wallet";
  }
  return null;
}

function resolveSelectableInstitutionId(
  institutionId: string | null | undefined,
  kind: AccountInstitutionKind
): SelectableEgyptianInstitutionId | null {
  if (!institutionId) {
    return null;
  }

  const institution = getInstitutionById(institutionId);
  return institution?.selectable && institution.type === kind
    ? (institution.id as SelectableEgyptianInstitutionId)
    : null;
}

function formatKnownProviderLabel(
  institutionId: SelectableEgyptianInstitutionId | null
): string | null {
  if (!institutionId) {
    return null;
  }

  const institution = getInstitutionById(institutionId);
  if (!institution) {
    return null;
  }

  return `${institution.shortName} (${institution.fullName})`;
}

export function resolveAccountInstitutionPresentation(
  source: AccountInstitutionSource
): AccountInstitutionPresentation | null {
  const kind = getInstitutionKind(source.type);
  if (kind === null) {
    return null;
  }

  const institutionId = resolveSelectableInstitutionId(
    source.institutionId,
    kind
  );
  const knownProviderLabel = formatKnownProviderLabel(institutionId);
  const manualProviderLabel = source.providerDisplayName?.trim() || null;

  return {
    kind,
    institutionId,
    providerLabel: knownProviderLabel ?? manualProviderLabel,
    asset: getEgyptianInstitutionAsset(institutionId, kind),
  };
}
