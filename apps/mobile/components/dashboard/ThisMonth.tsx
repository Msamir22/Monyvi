import { ThisMonthSkeleton } from "@/components/dashboard/skeletons/ThisMonthSkeleton";
import { palette } from "@/constants/colors";
import { PeriodFilter, usePeriodSummary } from "@/hooks/usePeriodSummary";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { formatCurrency } from "@monyvi/logic";
import React, { useCallback, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";

const RING_SIZE = 76;
const RING_STROKE_WIDTH = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type DashboardPeriod = "7d" | "30d" | "3m" | "1y";

const PERIOD_OPTIONS: ReadonlyArray<{
  readonly value: DashboardPeriod;
  readonly label: string;
  readonly filter: PeriodFilter;
}> = [
  { value: "7d", label: "7D", filter: "this_week" },
  { value: "30d", label: "30D", filter: "this_month" },
  { value: "3m", label: "3M", filter: "three_months" },
  { value: "1y", label: "1Y", filter: "this_year" },
];

function SpendingRing({
  percentage,
  caption,
}: {
  readonly percentage: number;
  readonly caption: string;
}): React.JSX.Element {
  const clampedPercentage = Math.min(100, Math.max(0, percentage));
  const spentOffset =
    RING_CIRCUMFERENCE - (clampedPercentage / 100) * RING_CIRCUMFERENCE;

  return (
    <View
      className="items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={palette.brandGreen[600]}
          strokeWidth={RING_STROKE_WIDTH}
          fill="transparent"
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          stroke={palette.danger[500]}
          strokeWidth={RING_STROKE_WIDTH}
          fill="transparent"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={spentOffset}
          strokeLinecap="butt"
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
        />
      </Svg>
      <View className="absolute items-center justify-center">
        <Text className="text-[22px] font-black text-text-primary dark:text-text-primary-dark">
          {clampedPercentage}%
        </Text>
        <Text className="text-[11px] text-text-secondary dark:text-text-secondary-dark">
          {caption}
        </Text>
      </View>
    </View>
  );
}

function PeriodSelector({
  value,
  onChange,
}: {
  readonly value: DashboardPeriod;
  readonly onChange: (value: DashboardPeriod) => void;
}): React.JSX.Element {
  return (
    <View className="h-9 flex-row overflow-hidden rounded-xl border border-border-card bg-glass dark:border-border-card-dark dark:bg-glass-dark">
      {PERIOD_OPTIONS.map((option, index) => {
        const isSelected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            activeOpacity={0.75}
            onPress={() => onChange(option.value)}
            className={`${index > 0 ? "border-s border-border-card dark:border-border-card-dark" : ""}`}
          >
            <View
              className={`h-full min-w-[52px] items-center justify-center px-3 ${
                isSelected
                  ? "bg-action/10 dark:bg-action-dark/20"
                  : "bg-transparent"
              }`}
            >
              <Text
                className={`text-[13px] font-semibold ${
                  isSelected
                    ? "text-action dark:text-action-dark"
                    : "text-text-secondary dark:text-text-secondary-dark"
                }`}
              >
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function StatBlock({
  label,
  value,
  tone,
  isLast = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: "success" | "danger";
  readonly isLast?: boolean;
}): React.JSX.Element {
  return (
    <View
      className={`flex-1 ${isLast ? "" : "border-e border-border-card pe-3 dark:border-border-card-dark"} ${isLast ? "ps-3" : ""}`}
    >
      <Text className="text-[13px] text-text-secondary dark:text-text-secondary-dark">
        {label}
      </Text>
      {tone === "success" ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          className="mt-2 text-[18px] font-bold text-success dark:text-success-dark"
        >
          {value}
        </Text>
      ) : (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.72}
          className="mt-2 text-[18px] font-bold text-red-500 dark:text-red-400"
        >
          {value}
        </Text>
      )}
    </View>
  );
}

function ThisMonthComponent(): React.JSX.Element {
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("30d");
  const selectedFilter =
    PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.filter ??
    "this_month";
  const { data, isLoading } = usePeriodSummary(selectedFilter);
  const { preferredCurrency } = usePreferredCurrency();
  const { t } = useTranslation("common");

  const handlePeriodSelect = useCallback((period: DashboardPeriod): void => {
    setSelectedPeriod(period);
  }, []);

  if (isLoading) {
    return <ThisMonthSkeleton />;
  }

  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[19px] font-bold text-text-primary dark:text-text-primary-dark">
          {t("this_month_stats")}
        </Text>
        <PeriodSelector value={selectedPeriod} onChange={handlePeriodSelect} />
      </View>

      <View className="flex-row items-center rounded-2xl border border-border-card bg-glass px-4 py-4 dark:border-border-card-dark dark:bg-glass-dark">
        <View className="flex-1">
          <View className="flex-row">
            <StatBlock
              label={t("dashboard_income")}
              value={formatCurrency({
                amount: data.totalIncome,
                currency: preferredCurrency,
              })}
              tone="success"
            />
            <StatBlock
              label={t("dashboard_expenses")}
              value={formatCurrency({
                amount: data.totalExpenses,
                currency: preferredCurrency,
              })}
              tone="danger"
            />
            <StatBlock
              label={t("dashboard_saved")}
              value={formatCurrency({
                amount: data.savings,
                currency: preferredCurrency,
              })}
              tone={data.savings >= 0 ? "success" : "danger"}
              isLast
            />
          </View>
          <Text className="mt-4 text-[13px] text-text-secondary dark:text-text-secondary-dark">
            {t("dashboard_spent_income", {
              percentage: data.spentPercentage,
            })}
          </Text>
        </View>
        <View className="ms-3">
          <SpendingRing
            percentage={data.spentPercentage}
            caption={t("dashboard_of_income")}
          />
        </View>
      </View>
    </View>
  );
}

export const ThisMonth = React.memo(ThisMonthComponent);
