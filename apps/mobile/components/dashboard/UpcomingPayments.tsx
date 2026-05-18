import { UpcomingPaymentsSkeleton } from "@/components/dashboard/skeletons/UpcomingPaymentsSkeleton";
import { useToast } from "@/components/ui/Toast";
import { palette } from "@/constants/colors";
import {
  getBillsPeriodDateRange,
  useRecurringPayments,
  type BillsPeriodFilter,
} from "@/hooks/useRecurringPayments";
import { usePreferredCurrency } from "@/hooks/usePreferredCurrency";
import { formatDate, getDueText } from "@/utils/dateHelpers";
import type { CurrencyType, RecurringPayment } from "@monyvi/db";
import { formatCurrency } from "@monyvi/logic";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { PayNowModal } from "./upcoming-payments";

const PAYMENT_LIMIT = 5;
const TOAST_DURATION_MS = 3500;
const DEFAULT_PERIOD: BillsPeriodFilter = "this_month";

function BillIcon(): React.JSX.Element {
  return (
    <View className="me-3 h-11 w-11 items-center justify-center rounded-full bg-violet-500">
      <Ionicons name="wifi" size={22} color={palette.paper[25]} />
    </View>
  );
}

function UpcomingPaymentsComponent(): React.JSX.Element {
  const { showToast } = useToast();
  const { preferredCurrency } = usePreferredCurrency();
  const { t } = useTranslation("common");
  const dateRange = useMemo(() => getBillsPeriodDateRange(DEFAULT_PERIOD), []);
  const {
    filteredPayments: payments,
    totalDueFiltered,
    isLoading,
  } = useRecurringPayments({
    limit: PAYMENT_LIMIT,
    status: "ACTIVE",
    type: "EXPENSE",
    dateRange,
  });
  const [selectedPayment, setSelectedPayment] =
    useState<RecurringPayment | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const featuredPayment = payments[0];

  const handleBillPress = useCallback((payment: RecurringPayment): void => {
    setSelectedPayment(payment);
    setModalVisible(true);
  }, []);

  const handleSuccess = useCallback(
    (
      amount: number,
      paymentName: string,
      paymentCurrency: CurrencyType
    ): void => {
      showToast({
        type: "success",
        title: t("payment_recorded"),
        message: `${paymentName} - ${formatCurrency({
          amount,
          currency: paymentCurrency,
        })}`,
        duration: TOAST_DURATION_MS,
      });
    },
    [showToast, t]
  );

  const handleViewAll = useCallback((): void => {
    router.push("/recurring-payments");
  }, []);

  const handleModalClose = useCallback((): void => {
    setModalVisible(false);
  }, []);

  if (!isLoading && payments.length === 0) {
    return <></>;
  }

  if (isLoading) {
    return <UpcomingPaymentsSkeleton />;
  }

  return (
    <View className="mb-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[19px] font-bold text-text-primary dark:text-text-primary-dark">
          {t("upcoming_bills")}
        </Text>
        <TouchableOpacity
          onPress={handleViewAll}
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

      {featuredPayment ? (
        <View className="overflow-hidden rounded-2xl border border-border-card bg-glass dark:border-border-card-dark dark:bg-glass-dark">
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => handleBillPress(featuredPayment)}
            className="flex-row items-center px-4 py-3"
          >
            <BillIcon />
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                className="text-[16px] font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {featuredPayment.name}
              </Text>
              <Text className="mt-0.5 text-[13px] text-text-secondary dark:text-text-secondary-dark">
                {`${getDueText(featuredPayment.nextDueDate)} • ${formatDate(
                  featuredPayment.nextDueDate,
                  "MMM d, yyyy"
                )}`}
              </Text>
            </View>
            <Text className="me-4 text-[16px] font-bold text-text-primary dark:text-text-primary-dark">
              {formatCurrency({
                amount: featuredPayment.amount,
                currency: featuredPayment.currency,
              })}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={palette.slate[500]}
            />
          </TouchableOpacity>

          <View className="ms-[68px] h-[1px] bg-border-card dark:bg-border-card-dark" />

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleViewAll}
            className="flex-row items-center px-4 py-3"
          >
            <Text className="flex-1 text-[15px] text-text-secondary dark:text-text-secondary-dark">
              {t("dashboard_total_due")}
            </Text>
            <Text className="me-4 text-[16px] font-bold text-danger dark:text-danger-dark">
              {formatCurrency({
                amount: totalDueFiltered,
                currency: preferredCurrency,
              })}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={palette.slate[500]}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      <PayNowModal
        payment={selectedPayment}
        visible={modalVisible}
        onClose={handleModalClose}
        onSuccess={handleSuccess}
      />
    </View>
  );
}

export const UpcomingPayments = React.memo(UpcomingPaymentsComponent);
