/**
 * useTransferById Hook
 * Observes a single transfer by ID from WatermelonDB.
 */

import { database, Transfer } from "@monyvi/db";
import { useEffect, useState } from "react";
import { observeOwnedById } from "@/services/user-data-access";
import { useCurrentUserId } from "./useCurrentUserId";
import { logger } from "@/utils/logger";

interface UseTransferByIdResult {
  readonly transfer: Transfer | null;
  readonly isLoading: boolean;
}

/**
 * Observes a single transfer record reactively.
 * Automatically subscribes to changes and unsubscribes on unmount.
 *
 * @param id - The WatermelonDB record ID of the transfer
 * @returns The observed transfer and loading state
 */
export function useTransferById(id: string): UseTransferByIdResult {
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userId, isResolvingUser } = useCurrentUserId();

  useEffect(() => {
    if (!id) {
      setTransfer(null);
      setIsLoading(false);
      return;
    }

    if (isResolvingUser) {
      setTransfer(null);
      setIsLoading(true);
      return;
    }

    if (!userId) {
      setTransfer(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const collection = database.get<Transfer>("transfers");
    const subscription = observeOwnedById<Transfer>(
      collection,
      id,
      userId
    ).subscribe({
      next: (record) => {
        setTransfer(record);
        setIsLoading(false);
      },
      error: (err) => {
        logger.error("transferById.observe.failed", err, { userId });
        setTransfer(null);
        setIsLoading(false);
      },
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, [id, userId, isResolvingUser]);

  return { transfer, isLoading };
}
