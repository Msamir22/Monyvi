import {
  RecurringPaymentForm,
  type RecurringPaymentFormHandle,
  type RecurringPaymentFormValues,
} from "@/components/recurring-payments";
import { PageHeader } from "@/components/navigation/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useAccounts } from "@/hooks/useAccounts";
import { useCategories } from "@/hooks/useCategories";
import { createRecurringPayment } from "@/services/recurring-payment-service";
import { router } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { View } from "react-native";

export default function CreateRecurringPaymentScreen(): React.JSX.Element {
  const { t } = useTranslation("transactions");
  const { t: tCommon } = useTranslation("common");
  const { accounts } = useAccounts();
  const { expenseCategories, incomeCategories } = useCategories();
  const { categories: allCategories } = useCategories({ topLevelOnly: false });
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<RecurringPaymentFormHandle>(null);

  const initialValues = useMemo<RecurringPaymentFormValues>(
    () => ({
      name: "",
      amount: "",
      type: "EXPENSE",
      accountId: accounts[0]?.id ?? null,
      categoryId: null,
      frequency: "MONTHLY",
      startDate: new Date(),
      action: "NOTIFY",
      notes: "",
    }),
    [accounts]
  );

  const handleSubmit = async (
    values: RecurringPaymentFormValues
  ): Promise<void> => {
    const selectedAccount =
      accounts.find((account) => account.id === values.accountId) ?? null;

    if (!selectedAccount || !values.accountId || !values.categoryId) {
      showToast({
        title: tCommon("error"),
        message: t("account_not_found"),
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createRecurringPayment({
        name: values.name.trim(),
        amount: Number.parseFloat(values.amount),
        currency: selectedAccount.currency,
        type: values.type,
        frequency: values.frequency,
        startDate: values.startDate,
        accountId: values.accountId,
        categoryId: values.categoryId,
        action: values.action,
        notes: values.notes.trim() || undefined,
      });
      router.back();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : tCommon("error_generic");
      showToast({
        type: "error",
        title: t("failed_to_create_payment"),
        message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View
      testID="create-recurring-payment-screen"
      className="flex-1 bg-background dark:bg-background-dark"
    >
      <PageHeader
        title={t("new_payment")}
        showBackButton
        backIcon="close"
        rightAction={{
          label: t("save"),
          onPress: () => formRef.current?.submit(),
          disabled: isSubmitting,
          loading: isSubmitting,
        }}
      />
      <RecurringPaymentForm
        ref={formRef}
        mode="create"
        initialValues={initialValues}
        accounts={accounts}
        expenseCategories={expenseCategories}
        incomeCategories={incomeCategories}
        allCategories={allCategories}
        isSubmitting={isSubmitting}
        submitLabel={t("add_recurring_payment")}
        onSubmit={handleSubmit}
      />
    </View>
  );
}
