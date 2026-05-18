import { RecentTransactionsSkeleton } from "@/components/dashboard/skeletons/RecentTransactionsSkeleton";
import { palette } from "@/constants/colors";
import { useCategoryLookup } from "@/context/CategoriesContext";
import { getCategoryIconConfig } from "@/utils/category-icon-config";
import { formatTransactionDate } from "@/utils/transactions";
import { Category, Transaction } from "@monyvi/db";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";
import { CategoryIcon } from "../common/CategoryIcon";
import { EmptyStateCard } from "../ui/EmptyStateCard";

interface RecentTransactionsProps {
  readonly transactions: Transaction[];
  readonly isLoading: boolean;
}

interface TransactionItemProps {
  readonly transaction: Transaction;
  readonly isLast: boolean;
  readonly category?: Category;
}

function TransactionItem({
  transaction,
  isLast,
  category,
}: TransactionItemProps): React.JSX.Element {
  const isExpense = transaction.isExpense;
  const { t } = useTranslation("common");
  const iconConfig = category
    ? getCategoryIconConfig(category)
    : {
        iconName: isExpense ? "cart" : "wallet",
        iconLibrary: "Ionicons" as const,
        iconColor: isExpense ? palette.danger[500] : palette.brandGreen[500],
      };

  const handlePress = useCallback((): void => {
    router.push(`/edit-transaction?id=${transaction.id}`);
  }, [transaction.id]);

  return (
    <View>
      <TouchableOpacity
        activeOpacity={0.82}
        className="flex-row items-center px-4 py-2.5"
        onPress={handlePress}
      >
        <View
          className={`me-3 h-11 w-11 items-center justify-center rounded-full ${
            isExpense
              ? "bg-danger/10 dark:bg-danger-dark/20"
              : "bg-success/10 dark:bg-success-dark/20"
          }`}
        >
          <CategoryIcon
            iconName={iconConfig.iconName}
            iconLibrary={iconConfig.iconLibrary}
            size={20}
            color={isExpense ? palette.danger[500] : palette.brandGreen[500]}
          />
        </View>

        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="text-[15px] font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {transaction.counterparty ||
              category?.displayName ||
              t("transaction_fallback")}
          </Text>
          <Text className="mt-0.5 text-[12px] text-text-secondary dark:text-text-secondary-dark">
            {formatTransactionDate(transaction.date)}
          </Text>
        </View>

        <Text
          numberOfLines={1}
          className={`me-4 text-[16px] font-bold ${
            isExpense
              ? "text-danger dark:text-danger-dark"
              : "text-success dark:text-success-dark"
          }`}
        >
          {transaction.signedFormatedAmount}
        </Text>
        <Ionicons name="chevron-forward" size={22} color={palette.slate[500]} />
      </TouchableOpacity>

      {!isLast ? (
        <View className="ms-[68px] h-[1px] bg-border-card dark:bg-border-card-dark" />
      ) : null}
    </View>
  );
}

function RecentTransactionsComponent({
  transactions,
  isLoading = false,
}: RecentTransactionsProps): React.JSX.Element {
  const categoryMap = useCategoryLookup();
  const { t } = useTranslation("common");

  const handleViewAll = useCallback((): void => {
    router.push("/(private)/(tabs)/transactions");
  }, []);

  const handleAddTransaction = useCallback((): void => {
    router.push("/add-transaction");
  }, []);

  if (isLoading && transactions.length === 0) {
    return <RecentTransactionsSkeleton />;
  }

  return (
    <View className="mb-8">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="text-[19px] font-bold text-text-primary dark:text-text-primary-dark">
          {t("recent_transactions")}
        </Text>
        <TouchableOpacity
          onPress={handleViewAll}
          activeOpacity={0.7}
          className="flex-row items-center"
        >
          <Text className="text-[15px] font-semibold text-action dark:text-action-dark">
            {t("view_all_rates")}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={palette.brandGreen[500]}
          />
        </TouchableOpacity>
      </View>

      {transactions.length === 0 ? (
        <EmptyStateCard
          onPress={handleAddTransaction}
          icon="receipt-outline"
          title={t("no_transactions_yet")}
          description={t("tap_to_add")}
        />
      ) : (
        <View className="overflow-hidden rounded-2xl border border-border-card bg-glass dark:border-border-card-dark dark:bg-glass-dark">
          {transactions.map((transaction, index) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              isLast={index === transactions.length - 1}
              category={categoryMap.get(transaction.categoryId)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export const RecentTransactions = React.memo(RecentTransactionsComponent);
