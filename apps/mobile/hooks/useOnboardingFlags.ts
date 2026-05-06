import type { OnboardingFlags } from "@monyvi/db";
import { useProfile } from "./useProfile";

export function useOnboardingFlags(): OnboardingFlags {
  const { profile } = useProfile();
  return profile?.onboardingFlags ?? {};
}
