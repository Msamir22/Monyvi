import { useEffect, useMemo, useState, type JSX } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, Text, TouchableOpacity, View } from "react-native";
import {
  getInstitutionById,
  getSenderPatternsForInstitution,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import type { AccountType } from "@monyvi/db";
import { useTranslation } from "react-i18next";

import { TextField } from "../ui/TextField";
import { Tooltip } from "../ui/Tooltip";
import { InstitutionPicker } from "./InstitutionPicker";
import { SenderChipsField } from "./SenderChipsField";
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

function getManualNameLabelKey(accountType: AccountType): string {
  return accountType === "BANK" ? "manual_bank_name" : "manual_wallet_name";
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
  const [isWhyTooltipVisible, setIsWhyTooltipVisible] = useState(false);
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

  useEffect(() => {
    if (
      pickerType !== null &&
      selectedInstitutionId === null &&
      providerDisplayName.trim().length > 0
    ) {
      setHasSelectedOther(true);
    }
  }, [pickerType, providerDisplayName, selectedInstitutionId]);

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
  const providerReference = t(
    accountType === "BANK"
      ? "provider_reference_bank"
      : "provider_reference_wallet"
  );
  const handleSectionResponderCapture = (): boolean => {
    if (isWhyTooltipVisible) {
      setIsWhyTooltipVisible(false);
    }
    return false;
  };
  const handleManualProviderDisplayNameChange = (value: string): void => {
    if (selectedInstitutionId !== null) {
      setHasSelectedOther(true);
      onSelectOtherInstitution();
    }
    onProviderDisplayNameChange(value);
  };

  return (
    <View
      className={className || "mt-6"}
      testID="institution-provider-section"
      onStartShouldSetResponderCapture={handleSectionResponderCapture}
    >
      <View className="mb-2 flex-row items-center px-1">
        <View className="flex-row items-center">
          <Text className="text-xs font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            {t(getSectionTitleKey(accountType))}
          </Text>
          <View className="relative ms-1 h-4 w-4 items-center justify-center">
            <TouchableOpacity
              onPress={() => setIsWhyTooltipVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t("provider_details_info")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="h-4 w-4 items-center justify-center"
            >
              <Ionicons
                name="information-circle-outline"
                size={13}
                color={palette.nileGreen[500]}
              />
            </TouchableOpacity>
            <Tooltip
              text={t("why_provider_details_body")}
              visible={isWhyTooltipVisible}
              onDismiss={() => setIsWhyTooltipVisible(false)}
              position="top"
              arrowAlignment="left"
              autoDismissMs={0}
            />
            <Modal
              visible={isWhyTooltipVisible}
              transparent
              animationType="none"
              onRequestClose={() => setIsWhyTooltipVisible(false)}
            >
              <Pressable
                className="flex-1 bg-transparent"
                accessibilityRole="button"
                accessibilityLabel={t("provider_details_info_dismiss")}
                onPress={() => setIsWhyTooltipVisible(false)}
              />
            </Modal>
          </View>
        </View>
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
          label={t(getManualNameLabelKey(accountType))}
          accessibilityLabel={t(getManualNameLabelKey(accountType))}
          testID={`manual-provider-name-${pickerType}`}
          placeholder={
            pickerType === "bank"
              ? t("provider_name_placeholder_bank")
              : t("provider_name_placeholder_wallet")
          }
          value={providerDisplayName}
          onChangeText={handleManualProviderDisplayNameChange}
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
            {t("sms_sender_help", { providerReference })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
