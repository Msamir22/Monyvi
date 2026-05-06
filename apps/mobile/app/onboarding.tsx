import React from "react";
import { Redirect, type Href } from "expo-router";
import { CurrencyStep } from "@/components/onboarding/CurrencyStep";
import { AccountLoadingScreen } from "@/components/sync/AccountLoadingScreen";
import { useProfile } from "@/hooks/useProfile";

export default function OnboardingScreen(): React.JSX.Element {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return <AccountLoadingScreen />;
  }

  if (profile === null) {
    return <RedirectWithTransitionFallback href="/" />;
  }

  if (profile.onboardingCompleted) {
    return <RedirectWithTransitionFallback href="/(tabs)" />;
  }

  return <CurrencyStep />;
}

function RedirectWithTransitionFallback({
  href,
}: {
  readonly href: Href;
}): React.JSX.Element {
  return (
    <>
      <Redirect href={href} />
      <AccountLoadingScreen />
    </>
  );
}
