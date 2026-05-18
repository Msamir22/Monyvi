import { CurrencyPicker } from "@/components/currency/CurrencyPicker";
import { AccountsSection } from "@/components/dashboard/AccountsSection";
import { CashAccountTooltip } from "@/components/dashboard/CashAccountTooltip";
import { DashboardBackground } from "@/components/dashboard/DashboardBackground";
import { DashboardSmsInlineBanner } from "@/components/dashboard/DashboardSmsInlineBanner";
import { LiveRates } from "@/components/dashboard/LiveRates";
import { MicButtonTooltip } from "@/components/dashboard/MicButtonTooltip";
import { RecentTransactions } from "@/components/dashboard/RecentTransactions";
import { DashboardSkeleton } from "@/components/dashboard/skeletons/DashboardSkeleton";
import { ThisMonth } from "@/components/dashboard/ThisMonth";
import { TopNav } from "@/components/dashboard/TopNav";
import { TotalNetWorthCard } from "@/components/dashboard/TotalNetWorthCard";
import { UpcomingPayments } from "@/components/dashboard/UpcomingPayments";
import { AppDrawer } from "@/components/navigation/AppDrawer";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { useToast } from "@/components/ui/Toast";
import { palette } from "@/constants/colors";
import { TAB_BAR_HEIGHT } from "@/constants/ui";
import { useTopAccounts } from "@/hooks/useAccounts";
import { useMarketRates } from "@/hooks/useMarketRates";
import { useMonthlyPercentageChange, useNetWorth } from "@/hooks/useNetWorth";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { useProfile } from "@/hooks/useProfile";
import { useSmsPermission } from "@/hooks/useSmsPermission";
import { useSmsSync } from "@/hooks/useSmsSync";
import { useRecentTransactions } from "@/hooks/useTransactions";
import { useDatabaseReady } from "@/providers/DatabaseProvider";
import { useSync } from "@/providers/SyncProvider";
import { logger } from "@/utils/logger";
import type { CurrencyType } from "@monyvi/db";
import { CURRENCY_INFO_MAP } from "@monyvi/logic";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

const SCROLL_CONTENT_STYLE = {
  paddingBottom: TAB_BAR_HEIGHT + 92,
} as const;

const REFRESH_TINT_COLOR = palette.nileGreen[500];
const REFRESH_COLORS: string[] = [REFRESH_TINT_COLOR];

function getGreetingKey():
  | "dashboard_good_morning"
  | "dashboard_good_afternoon"
  | "dashboard_good_evening" {
  const hours = new Date().getHours();
  if (hours < 12) return "dashboard_good_morning";
  if (hours < 18) return "dashboard_good_afternoon";
  return "dashboard_good_evening";
}

export default function DashboardScreen(): React.JSX.Element {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCurrencyPickerOpen, setIsCurrencyPickerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cashAccountRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const isDbReady = useDatabaseReady();
  const { t } = useTranslation("common");
  const { profile } = useProfile();
  const { sync } = useSync();
  const { accounts, isLoading: accountsLoading } = useTopAccounts(10);
  const {
    latestRates,
    previousDayRate,
    isLoading: ratesLoading,
    lastUpdated,
    isStale,
  } = useMarketRates();
  const { transactions, isLoading: transactionsLoading } =
    useRecentTransactions(3);
  const {
    totalNetWorth,
    totalNetWorthUsd,
    isLoading: netWorthLoading,
  } = useNetWorth();
  const { monthlyPercentageChange } = useMonthlyPercentageChange();
  const {
    preferredCurrency,
    setPreferredCurrency,
    isLoading: isCurrencyLoading,
  } = usePreferredCurrency();
  const currencyInfo = CURRENCY_INFO_MAP[preferredCurrency];
  const router = useRouter();
  const { shouldShowPrompt, dismissPrompt } = useSmsSync();
  const { requestPermission } = useSmsPermission();
  const greetingName = profile?.firstName || profile?.displayName || "";
  const greetingText = t(getGreetingKey());

  const handleMenuPress = useCallback(() => setIsDrawerOpen(true), []);
  const handleCurrencyChipPress = useCallback(() => {
    if (!isCurrencyLoading) setIsCurrencyPickerOpen(true);
  }, [isCurrencyLoading]);
  const handleDrawerClose = useCallback(() => setIsDrawerOpen(false), []);
  const handleCurrencyPickerClose = useCallback(
    () => setIsCurrencyPickerOpen(false),
    []
  );

  const handleSmsPermissionGranted = useCallback(() => {
    dismissPrompt().catch((error: unknown) => {
      logger.warn("dismissPrompt failed in handleSmsPermissionGranted", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
    router.push("/sms-scan");
  }, [dismissPrompt, router]);

  const handleSmsDismiss = useCallback(() => {
    dismissPrompt().catch((error: unknown) => {
      logger.warn("dismissPrompt failed in handleSmsDismiss", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, [dismissPrompt]);

  const handleCurrencySelect = useCallback(
    (currency: CurrencyType) => {
      if (isCurrencyLoading) return;
      setPreferredCurrency(currency).catch((error: unknown) => {
        logger.error("Failed to set preferred currency", error, { currency });
      });
    },
    [isCurrencyLoading, setPreferredCurrency]
  );

  const { showToast } = useToast();

  const handleRefresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    try {
      await sync();
    } catch (error: unknown) {
      logger.error("Pull-to-refresh sync failed", error);
      showToast({
        type: "error",
        title: t("error_generic"),
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [showToast, sync, t]);

  const isLoading = accountsLoading || ratesLoading || netWorthLoading;

  if (!isDbReady) {
    return (
      <DashboardBackground>
        <DashboardSkeleton />
      </DashboardBackground>
    );
  }

  return (
    <DashboardBackground>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={SCROLL_CONTENT_STYLE}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void handleRefresh();
            }}
            tintColor={REFRESH_TINT_COLOR}
            colors={REFRESH_COLORS}
          />
        }
      >
        <View className="px-7 pt-[2px]">
          <TopNav
            onMenuPress={handleMenuPress}
            currencyCode={preferredCurrency}
            currencyFlag={currencyInfo?.flag}
            onCurrencyPress={handleCurrencyChipPress}
            isCurrencyLoading={isCurrencyLoading}
          />

          <View className="mb-4">
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              className="text-[24px] font-bold text-text-primary dark:text-text-primary-dark"
            >
              {greetingText}
              {greetingName ? `, ${greetingName}` : ""} 👋
            </Text>
            <Text className="mt-1 text-[16px] text-text-secondary dark:text-text-secondary-dark">
              {t("dashboard_greeting_subtitle")}
            </Text>
          </View>

          {shouldShowPrompt ? (
            <DashboardSmsInlineBanner
              message={t("dashboard_sms_prompt_message")}
              actionLabel={t("enable")}
              requestPermission={requestPermission}
              onPermissionGranted={handleSmsPermissionGranted}
              onDismiss={handleSmsDismiss}
            />
          ) : null}

          <SectionErrorBoundary name={t("section_net_worth")}>
            <TotalNetWorthCard
              totalNetWorth={totalNetWorth}
              totalNetWorthUsd={totalNetWorthUsd}
              preferredCurrency={preferredCurrency}
              monthlyPercentageChange={monthlyPercentageChange}
              isLoading={isLoading}
            />
          </SectionErrorBoundary>
          <SectionErrorBoundary name={t("section_live_rates")}>
            <LiveRates
              latestRates={latestRates}
              previousDayRate={previousDayRate}
              isLoading={ratesLoading}
              lastUpdated={lastUpdated}
              isStale={isStale}
              preferredCurrency={preferredCurrency}
            />
          </SectionErrorBoundary>
          <SectionErrorBoundary name={t("section_accounts")}>
            <AccountsSection
              accounts={accounts}
              isLoading={accountsLoading}
              cashAccountRef={cashAccountRef}
            />
          </SectionErrorBoundary>
          <SectionErrorBoundary name={t("section_this_month")}>
            <ThisMonth />
          </SectionErrorBoundary>
          <SectionErrorBoundary name={t("section_upcoming_payments")}>
            <UpcomingPayments />
          </SectionErrorBoundary>
          <SectionErrorBoundary name={t("section_recent_transactions")}>
            <RecentTransactions
              transactions={transactions}
              isLoading={transactionsLoading}
            />
          </SectionErrorBoundary>
        </View>
      </ScrollView>

      <AppDrawer visible={isDrawerOpen} onClose={handleDrawerClose} />
      <CurrencyPicker
        visible={!isCurrencyLoading && isCurrencyPickerOpen}
        selectedCurrency={preferredCurrency}
        onSelect={handleCurrencySelect}
        onClose={handleCurrencyPickerClose}
      />
      <CashAccountTooltip
        anchorRef={cashAccountRef}
        isSmsPromptVisible={shouldShowPrompt}
        scrollViewRef={scrollViewRef}
      />
      <MicButtonTooltip />
    </DashboardBackground>
  );
}
