import { useEffect, useMemo, useState, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";
import {
  getInstitutionById,
  getSenderPatternsForInstitution,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import type { AccountType } from "@monyvi/db";
import { useTranslation } from "react-i18next";

import { TextField } from "../ui/TextField";
import { InstitutionPicker } from "./InstitutionPicker";
import { SenderChipsField } from "./SenderChipsField";
import { WhyInstitutionDetailsSheet } from "./WhyInstitutionDetailsSheet";
import { palette } from "@/constants/colors";

interface InstitutionProviderSectionProps {
  readonly accountType: AccountType;
  readonly isKnownProviderEligible: boolean;
  readonly institutionId: string | null;
  readonly providerDisplayName: string;
  readonly providerDisplayNameError?: string;
  readonly senderNames: readonly string[];
  readonly showSenderChips?: boolean;
  readonly showHelpText?: boolean;
  readonly className?: string;
  readonly onSelectKnownInstitution: (
    institutionId: SelectableEgyptianInstitutionId
  ) => void;
  readonly onSelectOtherInstitution: () => void;
  readonly onProviderDisplayNameChange: (value: string) => void;
  readonly onSenderNamesChange: (value: readonly string[]) => void;
}

function getPickerType(accountType: AccountType): "bank" | "wallet" | null {
  if (accountType === "BANK") {
    return "bank";
  }
  if (accountType === "DIGITAL_WALLET") {
    return "wallet";
  }
  return null;
}

function getSectionTitleKey(accountType: AccountType): string {
  return accountType === "BANK"
    ? "institution_bank_label"
    : "institution_wallet_label";
}

function getSectionHelpKey(accountType: AccountType): string {
  return accountType === "BANK"
    ? "institution_bank_help"
    : "institution_wallet_help";
}

export function InstitutionProviderSection({
  accountType,
  isKnownProviderEligible,
  institutionId,
  providerDisplayName,
  providerDisplayNameError,
  senderNames,
  showSenderChips = true,
  showHelpText = true,
  className = "",
  onSelectKnownInstitution,
  onSelectOtherInstitution,
  onProviderDisplayNameChange,
  onSenderNamesChange,
}: InstitutionProviderSectionProps): JSX.Element | null {
  const { t } = useTranslation("accounts");
  const pickerType = getPickerType(accountType);
  const [hasSelectedOther, setHasSelectedOther] = useState(false);
  const [isWhySheetVisible, setIsWhySheetVisible] = useState(false);
  const selectedInstitution =
    institutionId === null ? null : getInstitutionById(institutionId);
  const selectedInstitutionId =
    institutionId &&
    selectedInstitution?.selectable &&
    selectedInstitution.type === pickerType
      ? (institutionId as SelectableEgyptianInstitutionId)
      : null;

  useEffect(() => {
    setHasSelectedOther(false);
  }, [accountType]);

  const verifiedSenderNames = useMemo(() => {
    return selectedInstitutionId
      ? getSenderPatternsForInstitution(selectedInstitutionId)
      : [];
  }, [selectedInstitutionId]);

  if (pickerType === null) {
    return null;
  }

  const isManualMode =
    !isKnownProviderEligible ||
    hasSelectedOther ||
    (selectedInstitutionId === null && providerDisplayName.trim().length > 0);
  const shouldShowSenderChips =
    showSenderChips && (isManualMode || selectedInstitutionId !== null);

  return (
    <View className={className || "mt-6"}>
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="input-label mb-0">
          {t(getSectionTitleKey(accountType))}
        </Text>
        <TouchableOpacity
          onPress={() => setIsWhySheetVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t("provider_details_info")}
          className="p-1.5"
        >
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={palette.nileGreen[500]}
          />
        </TouchableOpacity>
      </View>

      {isKnownProviderEligible ? (
        <InstitutionPicker
          type={pickerType}
          selectedInstitutionId={selectedInstitutionId}
          isOtherSelected={isManualMode && selectedInstitutionId === null}
          onSelectInstitution={(selectedInstitutionId) => {
            setHasSelectedOther(false);
            onSelectKnownInstitution(selectedInstitutionId);
          }}
          onSelectOther={() => {
            setHasSelectedOther(true);
            onSelectOtherInstitution();
          }}
        />
      ) : null}

      {isManualMode ? (
        <TextField
          label={t("provider_name")}
          accessibilityLabel={t("provider_name")}
          placeholder={
            pickerType === "bank"
              ? t("provider_name_placeholder_bank")
              : t("provider_name_placeholder_wallet")
          }
          value={providerDisplayName}
          onChangeText={onProviderDisplayNameChange}
          error={providerDisplayNameError}
          maxLength={100}
        />
      ) : null}

      {showHelpText ? (
        <Text className="mb-2 ms-2 text-xs font-bold text-slate-400 dark:text-slate-500">
          {t(getSectionHelpKey(accountType))}
        </Text>
      ) : null}

      {shouldShowSenderChips ? (
        <View className="mt-2">
          <Text className="input-label">{t("sms_sender_names")}</Text>
          <SenderChipsField
            value={senderNames}
            verifiedSenders={verifiedSenderNames}
            onChange={onSenderNamesChange}
          />
          <Text className="mt-2 ms-2 text-[11px] font-bold text-slate-500 dark:text-slate-600">
            {t("sms_sender_help")}
          </Text>
        </View>
      ) : null}

      <WhyInstitutionDetailsSheet
        visible={isWhySheetVisible}
        onClose={() => setIsWhySheetVisible(false)}
      />
    </View>
  );
}
