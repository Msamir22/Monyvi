import { palette } from "@/constants/colors";
import type { RecurringStatus } from "@monyvi/db";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

interface RecurringPaymentEditActionsProps {
  readonly status: RecurringStatus;
  readonly onPauseToggle?: () => Promise<void>;
  readonly onDelete?: () => Promise<void>;
}

export function RecurringPaymentEditActions({
  status,
  onPauseToggle,
  onDelete,
}: RecurringPaymentEditActionsProps): React.JSX.Element {
  const { t } = useTranslation("transactions");
  const isPaused = status === "PAUSED";
  const canPauseOrResume = status !== "COMPLETED";

  return (
    <View testID="recurring-payment-edit-actions" className="mb-6">
      {canPauseOrResume ? (
        <TouchableOpacity
          testID="recurring-payment-pause-action"
          onPress={() => void onPauseToggle?.()}
        >
          <View
            testID="recurring-payment-pause-action-content"
            className="py-4 px-4 flex-row items-center"
          >
            <View
              testID={
                isPaused
                  ? "recurring-payment-resume-icon"
                  : "recurring-payment-pause-icon"
              }
              className="me-2"
            >
              <Ionicons
                name={isPaused ? "play-circle-outline" : "pause-circle-outline"}
                size={20}
                color={isPaused ? palette.nileGreen[500] : palette.gold[600]}
              />
            </View>
            <Text className="flex-1 text-base font-bold text-text-primary dark:text-text-primary-dark">
              {isPaused ? t("resume_payment") : t("pause_payment")}
            </Text>
            <View testID="recurring-payment-pause-chevron">
              <Ionicons
                name="chevron-forward"
                size={18}
                color={palette.slate[400]}
              />
            </View>
          </View>
        </TouchableOpacity>
      ) : null}
      {canPauseOrResume ? (
        <View className="h-px mx-4 bg-slate-200 dark:bg-slate-700" />
      ) : null}
      <TouchableOpacity
        testID="recurring-payment-delete-action"
        onPress={() => void onDelete?.()}
      >
        <View className="py-4 px-4 flex-row items-center">
          <View testID="recurring-payment-delete-icon" className="me-2">
            <Ionicons name="trash-outline" size={20} color={palette.red[500]} />
          </View>
          <Text className="flex-1 text-base font-bold text-red-500">
            {t("delete_payment")}
          </Text>
          <View testID="recurring-payment-delete-chevron">
            <Ionicons
              name="chevron-forward"
              size={18}
              color={palette.slate[400]}
            />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
