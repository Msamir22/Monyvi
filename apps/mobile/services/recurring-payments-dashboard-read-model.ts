import type { CurrencyType, MarketRate, RecurringPayment } from "@monyvi/db";
import { convertCurrency } from "@monyvi/logic";
import { getRecurringPaymentDueGroupTitle } from "@/utils/recurring-payment-due-labels";

export type SortOption =
  | "next_due"
  | "highest_amount"
  | "lowest_amount"
  | "name_a_z";

export interface PaymentSection {
  readonly title: string;
  readonly data: readonly RecurringPayment[];
}

interface SortPaymentsOptions {
  readonly preferredCurrency?: CurrencyType;
  readonly latestRates?: MarketRate | null;
}

export function sortPayments(
  payments: readonly RecurringPayment[],
  sort: SortOption,
  options: SortPaymentsOptions = {}
): RecurringPayment[] {
  return [...payments].sort((a, b) => {
    switch (sort) {
      case "highest_amount":
        return (
          getComparableAmount(b, options) - getComparableAmount(a, options)
        );
      case "lowest_amount":
        return (
          getComparableAmount(a, options) - getComparableAmount(b, options)
        );
      case "name_a_z":
        return a.name.localeCompare(b.name);
      case "next_due":
        return a.nextDueDate.getTime() - b.nextDueDate.getTime();
    }
  });
}

export function groupPaymentsByDueDate(
  payments: readonly RecurringPayment[]
): PaymentSection[] {
  return payments.reduce<PaymentSection[]>((sections, payment) => {
    const title = getRecurringPaymentDueGroupTitle(payment);
    const existingSection = sections.find((section) => section.title === title);

    if (existingSection) {
      return sections.map((section) =>
        section.title === title
          ? { ...section, data: [...section.data, payment] }
          : section
      );
    }

    return [...sections, { title, data: [payment] }];
  }, []);
}

function getComparableAmount(
  payment: RecurringPayment,
  options: SortPaymentsOptions
): number {
  if (!options.preferredCurrency) {
    return payment.amount;
  }

  return convertCurrency(
    payment.amount,
    payment.currency,
    options.preferredCurrency,
    options.latestRates ?? null
  );
}
