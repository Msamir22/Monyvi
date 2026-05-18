import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { Text, TouchableOpacity, View } from "react-native";
import { palette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";
import { MonyviLogo } from "../ui/MonyviLogo";

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
            className="me-4"
          >
            <Ionicons name="menu" size={32} color={iconColor} />
          </TouchableOpacity>
        ) : null}

        <MonyviLogo width={84} height={25} />

        <View className="flex-1" />

        <View className="flex-row items-center gap-2">
          {currencyCode && onCurrencyPress ? (
            <TouchableOpacity
              onPress={onCurrencyPress}
              disabled={isCurrencyLoading}
              accessibilityLabel={t("change_currency")}
              accessibilityRole="button"
              style={{ opacity: isCurrencyLoading ? 0.5 : 1 }}
              className="h-10 flex-row items-center gap-1 rounded-xl border border-border-strong bg-glass px-3 dark:border-border-strong-dark dark:bg-glass-dark"
            >
              <Text className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark">
                {currencyCode}
              </Text>
              <Ionicons name="chevron-down" size={16} color={mutedIconColor} />
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            className="h-10 w-10 items-center justify-center"
            onPress={() => router.push("/settings")}
            accessibilityLabel={t("settings")}
            accessibilityRole="button"
          >
            <Ionicons
              name="settings-outline"
              size={28}
              color={mutedIconColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={t("notifications")}
            accessibilityRole="button"
            accessibilityState={{ disabled: true }}
            disabled
            className="relative h-10 w-10 items-center justify-center"
          >
            <Ionicons
              name="notifications-outline"
              size={28}
              color={mutedIconColor}
            />
            <View className="absolute end-2 top-1.5 h-2.5 w-2.5 rounded-full bg-action dark:bg-action-dark" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export const TopNav = React.memo(TopNavComponent);
