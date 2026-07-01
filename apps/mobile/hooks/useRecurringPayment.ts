import { database, type RecurringPayment } from "@monyvi/db";
import { useEffect, useState } from "react";
import { observeOwnedById } from "@/services/user-data-access";
import { logger } from "@/utils/logger";
import { runUserScopedEffect, useCurrentUser } from "./useCurrentUser";

interface UseRecurringPaymentResult {
  readonly payment: RecurringPayment | null;
  readonly isLoading: boolean;
}

export function useRecurringPayment(
  paymentId: string | undefined
): UseRecurringPaymentResult {
  const [payment, setPayment] = useState<RecurringPayment | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(paymentId));
  const [, setObservedRevision] = useState(0);
  const { userId, isResolvingUser } = useCurrentUser();

  useEffect(() => {
    if (!paymentId) {
      setPayment(null);
      setIsLoading(false);
      return undefined;
    }

    return runUserScopedEffect({
      userId,
      isResolvingUser,
      onResolving: () => {
        setPayment(null);
        setIsLoading(true);
      },
      onSignedOut: () => {
        setPayment(null);
        setIsLoading(false);
      },
      onAuthenticated: (currentUserId) => {
        setPayment(null);
        setIsLoading(true);
        const subscription = observeOwnedById<RecurringPayment>(
          database.get<RecurringPayment>("recurring_payments"),
          paymentId,
          currentUserId
        ).subscribe({
          next: (result) => {
            setPayment(result && !result.deleted ? result : null);
            setObservedRevision((revision) => revision + 1);
            setIsLoading(false);
          },
          error: (error: unknown) => {
            logger.error("recurringPayment.observe.failed", error);
            setPayment(null);
            setIsLoading(false);
          },
        });

        return () => subscription.unsubscribe();
      },
    });
  }, [paymentId, userId, isResolvingUser]);

  return { payment, isLoading };
}
