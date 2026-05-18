import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { dashboardAssets } from "@/components/dashboard/dashboard-assets";
import { palette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

interface TopNavProps {
  readonly onMenuPress?: () => void;
  readonly currencyCode?: string;
  readonly currencyFlag?: string;
  readonly onCurrencyPress?: () => void;
  readonly isCurrencyLoading?: boolean;
}

function TopNavComponent({
  onMenuPress,
  currencyCode,
  currencyFlag: _currencyFlag,
  onCurrencyPress,
  isCurrencyLoading = false,
}: TopNavProps): React.ReactElement {
  const { isDark } = useTheme();
  const { t } = useTranslation("common");
  const iconColor = isDark ? palette.paper[25] : palette.slate[900];
  const mutedIconColor = isDark ? palette.paper[25] : palette.slate[800];

  return (
    <View className="pb-4">
      <View className="mt-2 flex-row items-center">
        {onMenuPress ? (
          <TouchableOpacity
            onPress={onMenuPress}
            accessibilityLabel={t("open_menu")}
            accessibilityRole="button"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="me-3"
          >
            <Ionicons name="menu" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : null}

        <View className="flex-row items-center gap-1.5">
          <Image
            source={dashboardAssets.monyviMark}
            resizeMode="contain"
            style={{ height: 18, width: 25 }}
          />
          <Text className="text-[20px] font-bold text-text-primary dark:text-text-primary-dark">
            Monyvi
          </Text>
        </View>

        <View className="flex-1" />

        <View className="flex-row items-center gap-1.5">
          {currencyCode && onCurrencyPress ? (
            <TouchableOpacity
              onPress={onCurrencyPress}
              disabled={isCurrencyLoading}
              accessibilityLabel={t("change_currency")}
              accessibilityRole="button"
              style={{ opacity: isCurrencyLoading ? 0.5 : 1 }}
              className="h-7 flex-row items-center gap-0.5 rounded-xl border border-border-strong bg-glass px-2 dark:border-border-strong-dark dark:bg-glass-dark"
            >
              <Text className="text-[13px] font-semibold text-text-primary dark:text-text-primary-dark">
                {currencyCode}
              </Text>
              <Ionicons name="chevron-down" size={14} color={mutedIconColor} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            className="h-8 w-8 items-center justify-center"
            onPress={() => router.push("/settings")}
            accessibilityLabel={t("settings")}
            accessibilityRole="button"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color={mutedIconColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={t("notifications")}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            className="relative h-8 w-8 items-center justify-center"
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={mutedIconColor}
            />
            <View className="absolute end-1.5 top-1 h-2 w-2 rounded-full bg-action dark:bg-action-dark" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const TopNav = React.memo(TopNavComponent);
