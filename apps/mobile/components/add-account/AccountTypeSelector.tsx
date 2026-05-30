import { Ionicons } from "@expo/vector-icons";
import type { AccountType } from "@monyvi/db";
import type { JSX } from "react";
import { Text, TouchableOpacity, View } from "react-native";
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

export function AccountTypeSelector({
  value,
  onChange,
  disabled = false,
}: AccountTypeSelectorProps): JSX.Element {
  const { isDark } = useTheme();
  const { t } = useTranslation("accounts");
  const { t: tCommon } = useTranslation("common");

  return (
    <View className="mb-5" accessibilityRole="radiogroup">
      <Text className="input-label">{t("account_type")}</Text>
      <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        {ACCOUNT_TYPES.map((type, index) => {
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
              className={`flex-row items-center px-4 py-4 ${
                index > 0
                  ? "border-t border-slate-200 dark:border-slate-700"
                  : ""
              } ${
                isSelected
                  ? "bg-nileGreen-50 dark:bg-nileGreen-900/20"
                  : "bg-white dark:bg-slate-800"
              }`}
            >
              <View
                className={`me-3 h-9 w-9 items-center justify-center rounded-xl ${
                  isSelected
                    ? "bg-nileGreen-100 dark:bg-nileGreen-800"
                    : "bg-slate-100 dark:bg-slate-700"
                }`}
              >
                <Ionicons
                  name={type.icon}
                  size={19}
                  color={
                    isSelected
                      ? palette.nileGreen[700]
                      : isDark
                        ? palette.slate[300]
                        : palette.slate[600]
                  }
                />
              </View>
              <Text className="flex-1 text-base font-semibold text-text-primary">
                {accountTypeLabel}
              </Text>
              {isSelected ? (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
