import { Ionicons } from "@expo/vector-icons";
import type { AccountType } from "@monyvi/db";
import type { JSX } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { useTranslation } from "react-i18next";

import { ACCOUNT_TYPES } from "@/constants/accounts";
import { colors, palette } from "@/constants/colors";
import { useTheme } from "@/context/ThemeContext";

interface AccountTypeSelectorProps {
  readonly value: AccountType;
  readonly onChange: (value: AccountType) => void;
  readonly disabled?: boolean;
}

const ACCOUNT_TYPE_LABEL_KEYS = {
  CASH: "type_cash",
  BANK: "type_bank",
  DIGITAL_WALLET: "type_digital_wallet",
} as const;

function getSelectedRowStyle(
  isSelected: boolean,
  isDark: boolean
): ViewStyle | undefined {
  if (!isSelected || !isDark) {
    return undefined;
  }

  return { backgroundColor: `${palette.nileGreen[900]}33` };
}

export function AccountTypeSelector({
  value,
  onChange,
  disabled = false,
}: AccountTypeSelectorProps): JSX.Element {
  const { isDark } = useTheme();
  const { t } = useTranslation("accounts");
  const { t: tCommon } = useTranslation("common");

  return (
    <View className="mb-4" accessibilityRole="radiogroup">
      <Text className="input-label mb-2">{t("account_type")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 pe-4"
      >
        {ACCOUNT_TYPES.map((type) => {
          const isSelected = value === type.id;
          const accountTypeLabel = t(ACCOUNT_TYPE_LABEL_KEYS[type.id]);

          return (
            <TouchableOpacity
              key={type.id}
              onPress={() => onChange(type.id)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityState={{ disabled, selected: isSelected }}
              accessibilityLabel={
                isSelected
                  ? `${accountTypeLabel}, ${tCommon("selected")}`
                  : accountTypeLabel
              }
              disabled={disabled}
              className={`h-[66px] min-w-[124px] flex-row items-center rounded-2xl border px-3 py-2 ${
                isSelected
                  ? "border-nileGreen-500 bg-nileGreen-50"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              }`}
              style={getSelectedRowStyle(isSelected, isDark)}
            >
              <View
                className={`me-2 h-[34px] w-[34px] items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-nileGreen-100 dark:bg-nileGreen-800"
                    : "bg-slate-100 dark:bg-slate-700"
                }`}
              >
                <Ionicons
                  name={type.icon}
                  size={17}
                  color={
                    isSelected
                      ? palette.nileGreen[700]
                      : isDark
                        ? palette.slate[300]
                        : palette.slate[600]
                  }
                />
              </View>
              <Text
                className="flex-1 text-[13px] font-semibold text-text-primary"
                numberOfLines={2}
              >
                {accountTypeLabel}
              </Text>
              {isSelected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.primary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
