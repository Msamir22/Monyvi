import { palette } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import type { JSX } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { TextField } from "../ui/TextField";

interface BankCardDetailsSectionProps {
  readonly expanded: boolean;
  readonly onToggleExpand: () => void;
  readonly cardLast4: string;
  readonly cardLast4Error?: string;
  readonly onCardLast4Change: (value: string) => void;
}

export function BankCardDetailsSection({
  expanded,
  onToggleExpand,
  cardLast4,
  cardLast4Error,
  onCardLast4Change,
}: BankCardDetailsSectionProps): JSX.Element {
  const { t } = useTranslation("accounts");

  if (!expanded) {
    return (
      <View className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
        <TouchableOpacity
          onPress={onToggleExpand}
          activeOpacity={0.7}
          className="flex-row items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-100 py-5 dark:border-slate-700 dark:bg-slate-900"
        >
          <Ionicons
            name="card-outline"
            size={20}
            color={palette.nileGreen[500]}
          />
          <Text className="ms-2.5 text-sm font-bold text-slate-700 dark:text-slate-300">
            {t("add_card_details_optional")}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={palette.slate[400]}
            style={{ marginStart: 6 }}
          />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800">
      <TouchableOpacity
        onPress={onToggleExpand}
        activeOpacity={0.7}
        className="mb-6 flex-row items-center justify-center"
      >
        <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {t("hide_card_details")}
        </Text>
        <Ionicons
          name="chevron-up"
          size={14}
          color={palette.slate[400]}
          style={{ marginStart: 4 }}
        />
      </TouchableOpacity>

      <View className="mb-6 px-1">
        <Text className="mb-1 text-xs font-black uppercase tracking-widest text-slate-800 dark:text-white">
          {t("card_details_section")}
        </Text>
        <Text className="text-xs font-bold text-slate-400 dark:text-slate-500">
          {t("card_details_help")}
        </Text>
      </View>

      <View className="mb-6">
        <TextField
          label={t("card_last_4_digits")}
          placeholder="1234"
          value={cardLast4}
          onChangeText={onCardLast4Change}
          keyboardType="numeric"
          maxLength={4}
          error={cardLast4Error}
        />
        <Text className="ms-2 mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-600">
          {t("card_last_4_help")}
        </Text>
      </View>
    </View>
  );
}
