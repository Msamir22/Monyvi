import { Ionicons } from "@expo/vector-icons";
import {
  getInstitutionById,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import type { AccountType } from "@monyvi/db";
import { LinearGradient } from "expo-linear-gradient";
import type { JSX } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { palette } from "@/constants/colors";
import {
  getEgyptianInstitutionAsset,
  type InstitutionLogo,
} from "@/constants/egyptian-institution-assets";
import { InstitutionLogoMark } from "@/components/institutions/InstitutionLogoMark";
import { useTheme } from "@/context/ThemeContext";

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

function formatBalance(balance: string): string {
  const trimmed = balance.trim();
  if (!trimmed) {
    return "0";
  }
  return trimmed;
}

interface PreviewLogoProps {
  readonly accountType: AccountType;
  readonly logo: InstitutionLogo | null;
}

function PreviewLogo({ accountType, logo }: PreviewLogoProps): JSX.Element {
  return (
    <InstitutionLogoMark
      logo={logo}
      size="preview"
      surfaceContext="colored-card"
      testID="account-preview-institution-logo"
      defaultSurfaceClassName="border-transparent bg-transparent"
      fallback={
        <Ionicons
          name={getFallbackIcon(accountType)}
          size={24}
          color={palette.nileGreen[700]}
        />
      }
    />
  );
}

function getPreviewInstitutionLogo(
  accountType: AccountType,
  institutionId: string | null
): InstitutionLogo | null {
  const kind = getInstitutionKind(accountType);
  const institution =
    institutionId === null ? null : getInstitutionById(institutionId);
  const selectableInstitutionId =
    institutionId !== null &&
    institution?.selectable &&
    institution.type === kind
      ? (institutionId as SelectableEgyptianInstitutionId)
      : null;

  if (kind === null) {
    return null;
  }

  return getEgyptianInstitutionAsset(selectableInstitutionId, kind).logo;
}

function getPreviewCardGradient({
  accountType,
  logo,
  isDark,
}: {
  readonly accountType: AccountType;
  readonly logo: InstitutionLogo | null;
  readonly isDark: boolean;
}): readonly [string, string] {
  const themeKey = isDark ? "dark" : "light";

  if (logo?.presentation?.cardGradientByMode?.[themeKey]) {
    return logo.presentation.cardGradientByMode[themeKey];
  }

  if (accountType === "BANK") {
    return [
      palette.blue[800],
      isDark ? palette.slate[950] : palette.slate[800],
    ];
  }

  if (accountType === "DIGITAL_WALLET") {
    return [
      palette.nileGreen[700],
      isDark ? palette.slate[950] : palette.slate[800],
    ];
  }

  return [
    palette.nileGreen[700],
    isDark ? palette.slate[950] : palette.nileGreen[800],
  ];
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
  const { isDark } = useTheme();
  const displayName = accountName.trim() || t("account_preview");
  const providerName = formatProviderName(
    accountType,
    institutionId,
    providerDisplayName,
    (type) => t(`account_type_${type.toLowerCase()}`)
  );
  const logo = getPreviewInstitutionLogo(accountType, institutionId);
  const gradient = getPreviewCardGradient({ accountType, logo, isDark });

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="mb-5 overflow-hidden rounded-[30px] px-5 py-4"
      style={{
        borderColor: `${palette.slate[25]}33`,
        borderRadius: 30,
        borderWidth: 1,
        elevation: 4,
        shadowColor: palette.slate[950],
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: isDark ? 0.28 : 0.14,
        shadowRadius: 18,
      }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <PreviewLogo accountType={accountType} logo={logo} />
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
            {formatBalance(balance)}
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}
