import { dashboardAssets } from "@/components/dashboard/dashboard-assets";
import { AccountsSectionSkeleton } from "@/components/dashboard/skeletons/AccountsSectionSkeleton";
import { palette } from "@/constants/colors";
import { buildAccountDisplayNames } from "@/utils/account-display";
import { Account, AccountType } from "@monyvi/db";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { EmptyStateCard } from "../ui/EmptyStateCard";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 10;
const CARD_WIDTH = Math.min(128, (SCREEN_WIDTH - 80) / 3);
const CARD_HEIGHT = 84;
const PAGE_SIZE = 3;

interface AccountsSectionProps {
  readonly accounts: Account[];
  readonly isLoading: boolean;
  readonly cashAccountRef?: React.RefObject<View>;
}

interface AccountCardData {
  readonly id: string;
  readonly name: string;
  readonly balance: string;
  readonly type: AccountType;
  readonly iconSource: number | null;
}

function getAccountIconSource(account: Account): number | null {
  const name = account.name.toLowerCase();
  if (account.type === "CASH") return dashboardAssets.accountCash;
  if (name.includes("cib")) return dashboardAssets.accountCib;
  if (name.includes("vodafone")) return dashboardAssets.accountVodafoneCash;
  return null;
}

function getFallbackIcon(type: AccountType): keyof typeof Ionicons.glyphMap {
  if (type === "BANK") return "business";
  if (type === "DIGITAL_WALLET") return "phone-portrait";
  return "wallet";
}

function AccountIcon({
  data,
}: {
  readonly data: AccountCardData;
}): React.JSX.Element {
  if (data.iconSource) {
    return (
      <Image
        source={data.iconSource}
        resizeMode="contain"
        style={{ width: 44, height: 44 }}
      />
    );
  }

  return (
    <View className="h-11 w-11 items-center justify-center rounded-xl bg-info/10 dark:bg-info-dark/20">
      <Ionicons
        name={getFallbackIcon(data.type)}
        size={22}
        color={palette.info[600]}
      />
    </View>
  );
}

function AccountCard({
  data,
}: {
  readonly data: AccountCardData;
}): React.JSX.Element {
  const handlePress = useCallback((): void => {
    router.push(`/edit-account?id=${data.id}`);
  }, [data.id]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      className="rounded-2xl border border-border-card bg-glass px-3 py-3 dark:border-border-card-dark dark:bg-glass-dark"
    >
      <View className="flex-row items-center">
        <AccountIcon data={data} />
        <View className="ms-2 min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[13px] font-medium text-text-primary dark:text-text-primary-dark"
          >
            {data.name}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={palette.slate[500]} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.76}
        className="mt-2 text-[19px] font-bold text-text-primary dark:text-text-primary-dark"
      >
        {data.balance}
      </Text>
    </TouchableOpacity>
  );
}

function PaginationDots({
  pageCount,
  activePage,
}: {
  readonly pageCount: number;
  readonly activePage: number;
}): React.JSX.Element | null {
  if (pageCount <= 1) return null;

  return (
    <View className="mt-3 flex-row justify-center gap-3">
      {Array.from({ length: pageCount }).map((_, index) => (
        <View
          key={index}
          className={`h-2 w-2 rounded-full ${
            index === activePage
              ? "bg-action dark:bg-action-dark"
              : "bg-text-muted/35 dark:bg-text-muted-dark/45"
          }`}
        />
      ))}
    </View>
  );
}

function AccountsSectionComponent({
  accounts,
  isLoading,
  cashAccountRef,
}: AccountsSectionProps): React.JSX.Element {
  const { t } = useTranslation("accounts");
  const { t: tc } = useTranslation("common");
  const [activePage, setActivePage] = useState(0);

  const displayNames = useMemo(
    (): Map<string, string> => buildAccountDisplayNames(accounts),
    [accounts]
  );

  const cardData = useMemo<AccountCardData[]>(() => {
    return accounts.map((account) => ({
      id: account.id,
      name: displayNames.get(account.id) ?? account.name,
      balance: account.formattedBalance,
      type: account.type,
      iconSource: getAccountIconSource(account),
    }));
  }, [accounts, displayNames]);

  const handleViewAll = useCallback((): void => {
    router.push("/accounts");
  }, []);

  const handleAddAccount = useCallback((): void => {
    router.push("/add-account");
  }, []);

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }): void => {
      const pageWidth = (CARD_WIDTH + CARD_GAP) * PAGE_SIZE;
      setActivePage(Math.round(event.nativeEvent.contentOffset.x / pageWidth));
    },
    []
  );

  if (isLoading) {
    return <AccountsSectionSkeleton />;
  }

  return (
    <View className="mb-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[19px] font-bold text-text-primary dark:text-text-primary-dark">
          {tc("accounts")}
        </Text>
        <TouchableOpacity
          onPress={handleViewAll}
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <Text className="text-[15px] font-semibold text-action dark:text-action-dark">
            {tc("view_all_rates")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.brandGreen[500]}
          />
        </TouchableOpacity>
      </View>

      {cardData.length === 0 ? (
        <EmptyStateCard
          onPress={handleAddAccount}
          icon="wallet-outline"
          title={t("no_accounts_title")}
          description={tc("tap_to_add")}
          height={CARD_HEIGHT}
          borderRadius={14}
        />
      ) : (
        <>
          <FlatList
            data={cardData}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            ItemSeparatorComponent={() => <View className="w-2.5" />}
            contentContainerStyle={{ paddingEnd: 28 }}
            renderItem={({ item }) => {
              const card = <AccountCard data={item} />;

              if (item.type === "CASH" && cashAccountRef) {
                return (
                  <View ref={cashAccountRef} collapsable={false}>
                    {card}
                  </View>
                );
              }

              return card;
            }}
          />
          <PaginationDots
            pageCount={Math.ceil(cardData.length / PAGE_SIZE)}
            activePage={activePage}
          />
        </>
      )}
    </View>
  );
}

export const AccountsSection = React.memo(AccountsSectionComponent);
