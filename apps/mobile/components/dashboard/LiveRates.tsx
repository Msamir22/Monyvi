import { LiveRatesSkeleton } from "@/components/dashboard/skeletons/LiveRatesSkeleton";
import { dashboardAssets } from "@/components/dashboard/dashboard-assets";
import { palette } from "@/constants/colors";
import type { CurrencyType, MarketRate } from "@monyvi/db";
import { CURRENCY_INFO_MAP, getMetalPrice } from "@monyvi/logic";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

interface Rate {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly unit?: string;
  readonly percentChange: number | null;
  readonly type: "currency" | "gold" | "silver";
}

interface LiveRatesProps {
  readonly latestRates: MarketRate | null;
  readonly previousDayRate: MarketRate | null;
  readonly isLoading: boolean;
  readonly lastUpdated: Date | null;
  readonly isStale: boolean;
  readonly preferredCurrency: CurrencyType;
}

function calculatePercentChange(
  current: number,
  previous: number | null | undefined
): number | null {
  if (previous === null || previous === undefined || previous === 0) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

function formatPercentChange(percentChange: number | null): string {
  if (percentChange === null) return "0.00%";
  return `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(2)}%`;
}

function buildRatesDisplay(
  latestRates: MarketRate | null,
  previousDayRate: MarketRate | null,
  preferredCurrency: CurrencyType,
  tMetals: (key: string) => string
): Rate[] {
  if (!latestRates) return [];

  const displayCurrency: CurrencyType =
    preferredCurrency === "USD" ? "EUR" : preferredCurrency;
  const currencyRate = latestRates.getRate("USD", displayCurrency);
  const previousCurrencyRate = previousDayRate
    ? previousDayRate.getRate("USD", displayCurrency)
    : null;
  const goldInPreferred = getMetalPrice("GOLD", latestRates, preferredCurrency);
  const previousGoldInPreferred = previousDayRate
    ? getMetalPrice("GOLD", previousDayRate, preferredCurrency)
    : null;
  const silverInPreferred = getMetalPrice(
    "SILVER",
    latestRates,
    preferredCurrency
  );
  const previousSilverInPreferred = previousDayRate
    ? getMetalPrice("SILVER", previousDayRate, preferredCurrency)
    : null;
  const currencyCode =
    CURRENCY_INFO_MAP[preferredCurrency]?.code ?? preferredCurrency;

  return [
    {
      id: "currency",
      label: `USD / ${displayCurrency}`,
      value: currencyRate.toFixed(2),
      percentChange: calculatePercentChange(currencyRate, previousCurrencyRate),
      type: "currency",
    },
    {
      id: "gold",
      label: tMetals("gold_24k_pill"),
      value: Math.round(goldInPreferred).toLocaleString(),
      unit: `${currencyCode}/g`,
      percentChange: calculatePercentChange(
        goldInPreferred,
        previousGoldInPreferred
      ),
      type: "gold",
    },
    {
      id: "silver",
      label: tMetals("silver_pill"),
      value: silverInPreferred.toFixed(2),
      unit: `${currencyCode}/g`,
      percentChange: calculatePercentChange(
        silverInPreferred,
        previousSilverInPreferred
      ),
      type: "silver",
    },
  ];
}

function getRateIconSource(type: Rate["type"]): number {
  if (type === "currency") return dashboardAssets.rateUsd;
  if (type === "gold") return dashboardAssets.rateGold24k;
  return dashboardAssets.rateSilver;
}

function RateColumn({
  rate,
  isLast,
}: {
  readonly rate: Rate;
  readonly isLast: boolean;
}): React.JSX.Element {
  const isDown = rate.percentChange !== null && rate.percentChange < 0;
  const trendClassName = isDown
    ? "text-danger dark:text-danger-dark"
    : "text-success dark:text-success-dark";

  return (
    <View
      className={`flex-1 flex-row items-center ${isLast ? "" : "border-e border-border-card pe-1 dark:border-border-card-dark"}`}
    >
      <View className="me-2 overflow-hidden" style={{ width: 42, height: 38 }}>
        <Image
          source={getRateIconSource(rate.type)}
          resizeMode="contain"
          style={{ width: 42, height: 42 }}
        />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className="text-[11px] text-text-primary dark:text-text-primary-dark"
        >
          {rate.label}
        </Text>
        <View className="mt-1 flex-row items-end">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            className="text-[17px] font-bold text-text-primary dark:text-text-primary-dark"
          >
            {rate.value}
          </Text>
          {rate.unit ? (
            <Text className="mb-0.5 ms-0.5 text-[10px] text-text-secondary dark:text-text-secondary-dark">
              {rate.unit}
            </Text>
          ) : null}
        </View>
        <View className="mt-1 flex-row items-center">
          <Text className={`text-[14px] font-medium ${trendClassName}`}>
            {formatPercentChange(rate.percentChange)}
          </Text>
          <Ionicons
            name={isDown ? "arrow-down" : "arrow-up"}
            size={16}
            color={isDown ? palette.danger[500] : palette.brandGreen[500]}
            style={{ marginStart: 4 }}
          />
        </View>
      </View>
    </View>
  );
}

function LiveRatesComponent({
  latestRates,
  previousDayRate,
  isLoading = false,
  lastUpdated: _lastUpdated,
  isStale: _isStale,
  preferredCurrency,
}: LiveRatesProps): React.ReactElement {
  const { t } = useTranslation("common");
  const { t: tMetals } = useTranslation("metals");
  const ratesDisplay = useMemo(
    () =>
      buildRatesDisplay(
        latestRates,
        previousDayRate,
        preferredCurrency,
        tMetals
      ),
    [latestRates, previousDayRate, preferredCurrency, tMetals]
  );

  const handlePress = useCallback((): void => {
    router.push("/live-rates" as never);
  }, []);

  if (isLoading && ratesDisplay.length === 0) {
    return <LiveRatesSkeleton />;
  }

  if (ratesDisplay.length === 0) {
    return <></>;
  }

  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[19px] font-bold text-text-primary dark:text-text-primary-dark">
          {t("live_rates")}
        </Text>
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <Text className="text-[15px] font-semibold text-action dark:text-action-dark">
            {t("view_all_rates")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.brandGreen[500]}
          />
        </TouchableOpacity>
      </View>

      <View className="min-h-[72px] flex-row items-center rounded-2xl border border-border-card bg-glass px-2.5 py-3 dark:border-border-card-dark dark:bg-glass-dark">
        {ratesDisplay.map((rate, index) => (
          <RateColumn
            key={rate.id}
            rate={rate}
            isLast={index === ratesDisplay.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

export const LiveRates = React.memo(LiveRatesComponent);
