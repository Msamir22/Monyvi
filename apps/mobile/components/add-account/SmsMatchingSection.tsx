import { Ionicons } from "@expo/vector-icons";
import {
  getInstitutionById,
  getSenderPatternsForInstitution,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import type { AccountType } from "@monyvi/db";
import { useMemo, type JSX } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { palette } from "@/constants/colors";
import { SenderChipsField } from "./SenderChipsField";
import { TextField } from "../ui/TextField";

interface SmsMatchingSectionProps {
  readonly accountType: AccountType;
  readonly institutionId: string | null;
  readonly senderNames: readonly string[];
  readonly cardLast4?: string;
  readonly cardLast4Error?: string;
  readonly expanded: boolean;
  readonly onToggleExpanded: () => void;
  readonly onSenderNamesChange: (value: readonly string[]) => void;
  readonly onCardLast4Change?: (value: string) => void;
  readonly onFieldFocus?: () => void;
}

function canUseKnownSenders(
  institutionId: string | null
): institutionId is SelectableEgyptianInstitutionId {
  return (
    institutionId !== null &&
    Boolean(getInstitutionById(institutionId)?.selectable)
  );
}

export function SmsMatchingSection({
  accountType,
  institutionId,
  senderNames,
  cardLast4 = "",
  cardLast4Error,
  expanded,
  onToggleExpanded,
  onSenderNamesChange,
  onCardLast4Change,
  onFieldFocus,
}: SmsMatchingSectionProps): JSX.Element | null {
  const { t } = useTranslation("accounts");
  const verifiedSenderNames = useMemo(() => {
    return canUseKnownSenders(institutionId)
      ? getSenderPatternsForInstitution(institutionId)
      : [];
  }, [institutionId]);
  const hasKnownProvider = verifiedSenderNames.length > 0;
  const providerReference = t(
    accountType === "BANK"
      ? "provider_reference_bank"
      : "provider_reference_wallet"
  );

  if (accountType !== "BANK" && accountType !== "DIGITAL_WALLET") {
    return null;
  }

  const shouldShowCardLast4 =
    accountType === "BANK" && onCardLast4Change !== undefined;

  return (
    <View className="mb-5 rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <TouchableOpacity
        onPress={onToggleExpanded}
        activeOpacity={0.7}
        className="flex-row items-center px-4 py-4"
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="me-3 h-9 w-9 items-center justify-center rounded-xl bg-nileGreen-50 dark:bg-nileGreen-900/30">
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={19}
            color={palette.nileGreen[600]}
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-text-primary dark:text-text-primary-dark">
            {t("sms_matching_optional")}
          </Text>
          <Text className="mt-0.5 text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
            {t("sms_matching_help")}
          </Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={18}
          color={palette.slate[500]}
        />
      </TouchableOpacity>

      {expanded ? (
        <View className="border-t border-slate-100 px-4 pb-4 pt-3 dark:border-slate-700">
          <Text className="input-label">
            {hasKnownProvider
              ? t("sms_sender_custom_names")
              : t("sms_sender_names")}
          </Text>
          <Text className="mb-3 ms-2 text-xs font-bold text-slate-500 dark:text-slate-500">
            {hasKnownProvider
              ? t("sms_sender_known_provider_help", { providerReference })
              : t("sms_sender_manual_provider_help", { providerReference })}
          </Text>
          <SenderChipsField
            value={senderNames}
            verifiedSenders={hasKnownProvider ? verifiedSenderNames : []}
            onChange={onSenderNamesChange}
            onInputFocus={onFieldFocus}
          />

          {shouldShowCardLast4 ? (
            <View className="mt-4">
              <TextField
                label={t("card_last_4_digits")}
                placeholder="1234"
                value={cardLast4}
                onChangeText={onCardLast4Change}
                keyboardType="numeric"
                maxLength={4}
                error={cardLast4Error}
                onFocus={onFieldFocus}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
