import { getLocales } from "expo-localization";

import { detectCurrencyFromTimezone } from "@/utils/currency-detection";
import { usePreferredCurrency } from "./usePreferredCurrency";

export type EgyptianInstitutionEligibilityReason =
  | "preferred_currency"
  | "runtime_region"
  | "manual";

export interface EgyptianInstitutionEligibility {
  readonly isEligible: boolean;
  readonly reason: EgyptianInstitutionEligibilityReason;
}

export function useEgyptianInstitutionEligibility(): EgyptianInstitutionEligibility {
  const { preferredCurrency } = usePreferredCurrency();

  if (preferredCurrency === "EGP") {
    return { isEligible: true, reason: "preferred_currency" };
  }

  const [locale] = getLocales();
  if (locale?.regionCode?.toUpperCase() === "EG") {
    return { isEligible: true, reason: "runtime_region" };
  }

  if (detectCurrencyFromTimezone() === "EGP") {
    return { isEligible: true, reason: "runtime_region" };
  }

  return { isEligible: false, reason: "manual" };
}
