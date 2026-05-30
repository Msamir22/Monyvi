import { Ionicons } from "@expo/vector-icons";
import {
  getInstitutionById,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import type { AccountType } from "@monyvi/db";
import type { JSX } from "react";
import { Image, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { palette } from "@/constants/colors";
import { getEgyptianInstitutionAsset } from "@/constants/egyptian-institution-assets";

interface AccountPreviewCardProps {
  readonly accountType: AccountType;
  readonly accountName: string;
  readonly balance: string;
  readonly currency: string;
  readonly institutionId: string | null;
  readonly providerDisplayName: string;
}

function getFallbackIcon(
  accountType: AccountType
): keyof typeof Ionicons.glyphMap {
  if (accountType === "BANK") {
    return "business-outline";
  }
  if (accountType === "DIGITAL_WALLET") {
    return "phone-portrait-outline";
  }
  return "cash-outline";
}

function getInstitutionKind(
  accountType: AccountType
): "bank" | "wallet" | null {
  if (accountType === "BANK") {
    return "bank";
  }
  if (accountType === "DIGITAL_WALLET") {
    return "wallet";
  }
  return null;
}

function formatProviderName(
  accountType: AccountType,
  institutionId: string | null,
  providerDisplayName: string,
  translateAccountType: (accountType: AccountType) => string
): string {
  const institution =
    institutionId === null ? null : getInstitutionById(institutionId);
  if (institution?.selectable) {
    return institution.shortName;
  }
  if (providerDisplayName.trim()) {
    return providerDisplayName.trim();
  }
  return translateAccountType(accountType);
}

function formatBalance(balance: string, currency: string): string {
  const trimmed = balance.trim();
  if (!trimmed) {
    return `0 ${currency}`;
  }
  return `${trimmed} ${currency}`;
}

interface PreviewLogoProps {
  readonly accountType: AccountType;
  readonly institutionId: string | null;
}

function PreviewLogo({
  accountType,
  institutionId,
}: PreviewLogoProps): JSX.Element {
  const kind = getInstitutionKind(accountType);
  const selectableInstitutionId =
    institutionId !== null && getInstitutionById(institutionId)?.selectable
      ? (institutionId as SelectableEgyptianInstitutionId)
      : null;
  const logo =
    kind === null
      ? null
      : getEgyptianInstitutionAsset(selectableInstitutionId, kind).logo;
  const SvgLogo = logo?.format === "svg" ? logo.source : null;

  return (
    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/95">
      {SvgLogo ? (
        <SvgLogo width={30} height={30} />
      ) : logo?.format === "image" ? (
        <Image source={logo.source} resizeMode="contain" className="h-8 w-8" />
      ) : (
        <Ionicons
          name={getFallbackIcon(accountType)}
          size={24}
          color={palette.nileGreen[700]}
        />
      )}
    </View>
  );
}

export function AccountPreviewCard({
  accountType,
  accountName,
  balance,
  currency,
  institutionId,
  providerDisplayName,
}: AccountPreviewCardProps): JSX.Element {
  const { t } = useTranslation("accounts");
  const displayName = accountName.trim() || t("account_preview");
  const providerName = formatProviderName(
    accountType,
    institutionId,
    providerDisplayName,
    (type) => t(`account_type_${type.toLowerCase()}`)
  );

  return (
    <View className="mb-5 rounded-[28px] bg-nileGreen-700 px-5 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <PreviewLogo
            accountType={accountType}
            institutionId={institutionId}
          />
          <View className="ms-3 flex-1">
            <Text className="text-base font-black text-white" numberOfLines={1}>
              {displayName}
            </Text>
            <Text
              className="mt-0.5 text-xs font-bold text-nileGreen-100"
              numberOfLines={1}
            >
              {providerName}
            </Text>
          </View>
        </View>
        <View className="ms-3 items-end">
          <Text className="text-xs font-bold text-nileGreen-100">
            {currency}
          </Text>
          <Text className="mt-0.5 text-lg font-black text-white">
            {formatBalance(balance, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}
