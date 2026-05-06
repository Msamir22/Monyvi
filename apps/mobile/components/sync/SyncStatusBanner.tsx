import { palette } from "@/constants/colors";
import { useSync } from "@/providers/SyncProvider";
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

export function SyncStatusBanner(): React.JSX.Element | null {
  const { syncError, sync } = useSync();
  const { t } = useTranslation("common");

  const handleRetry = useCallback((): void => {
    sync(true).catch(() => {
      // The banner remains visible through syncError if retry fails again.
    });
  }, [sync]);

  if (!syncError) {
    return null;
  }

  return (
    <View
      testID="sync-status-banner"
      className="mx-4 mt-3 mb-1 flex-row items-center rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 dark:border-red-400/25 dark:bg-red-500/15"
    >
      <Ionicons
        name="cloud-offline-outline"
        size={18}
        color={palette.red[500]}
      />
      <Text className="ml-2 flex-1 text-xs font-medium text-red-700 dark:text-red-300">
        {t("sync_status_banner_title")}
      </Text>
      <TouchableOpacity
        testID="sync-status-retry"
        accessibilityRole="button"
        accessibilityLabel={t("sync_status_banner_retry")}
        onPress={handleRetry}
        className="rounded-md border border-red-500 px-2 py-1"
      >
        <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
          {t("sync_status_banner_retry")}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
