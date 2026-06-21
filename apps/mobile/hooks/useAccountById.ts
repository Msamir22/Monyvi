/**
 * useAccountById Hook
 *
 * Observes a single account by ID from WatermelonDB, including its
 * associated bank details (if it's a bank-type account).
 *
 * Architecture & Design Rationale:
 * - Pattern: Custom Hook with reactive observable (findAndObserve)
 * - SOLID: SRP — data observation only, no mutation logic
 * - Modelled after useTransactionById for consistency
 *
 * @module useAccountById
 */

import { Account, AccountSmsSender, BankDetails, database } from "@monyvi/db";
import { useEffect, useState } from "react";
import { observeOwnedById } from "@/services/user-data-access";
import { formatCardLast4ForInput } from "@/services/card-last4-normalizer";
import { useCurrentUser } from "./useCurrentUser";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankDetailsData {
  readonly bankName?: string;
  readonly cardLast4?: string;
  readonly smsSenderName?: string;
  readonly smsSenderNames?: readonly string[];
}

interface RelationSubscription {
  unsubscribe: () => void;
}

interface ObservableRelation<TRecord> {
  observe?: () => {
    subscribe: (handlers: {
      readonly next: (rows: readonly TRecord[]) => void;
      readonly error: (error: unknown) => void;
    }) => RelationSubscription;
  };
  fetch?: () => Promise<readonly TRecord[]>;
}

function subscribeToRelationRows<TRecord>(
  relation: ObservableRelation<TRecord>,
  onNext: (rows: readonly TRecord[]) => void,
  onError: (error: unknown) => void
): RelationSubscription {
  if (typeof relation.observe === "function") {
    return relation.observe().subscribe({ next: onNext, error: onError });
  }

  let isSubscribed = true;
  if (typeof relation.fetch !== "function") {
    onNext([]);
    return {
      unsubscribe: () => {
        isSubscribed = false;
      },
    };
  }

  void relation
    .fetch()
    .then((rows) => {
      if (isSubscribed) {
        onNext(rows);
      }
    })
    .catch((error: unknown) => {
      if (isSubscribed) {
        onError(error);
      }
    });

  return {
    unsubscribe: () => {
      isSubscribed = false;
    },
  };
}

export interface UseAccountByIdResult {
  /** The observed Account model or null when not found / loading */
  readonly account: Account | null;
  /** Pre-fetched bank details (null for non-bank accounts) */
  readonly bankDetails: BankDetailsData | null;
  /** Whether the initial fetch is still in progress */
  readonly isLoading: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Observes a single Account record reactively by its ID.
 *
 * Automatically subscribes to changes and unsubscribes on unmount.
 * Also fetches associated bank details for bank-type accounts.
 *
 * @param id - The WatermelonDB record ID of the account
 * @returns The observed account, its bank details, and loading state
 */
export function useAccountById(id: string | null): UseAccountByIdResult {
  const [account, setAccount] = useState<Account | null>(null);
  const [bankDetails, setBankDetails] = useState<BankDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { userId, isResolvingUser } = useCurrentUser();

  useEffect(() => {
    if (!id) {
      setAccount(null);
      setBankDetails(null);
      setIsLoading(false);
      return undefined;
    }

    if (isResolvingUser) {
      setIsLoading(true);
      return undefined;
    }

    if (!userId) {
      setAccount(null);
      setBankDetails(null);
      setIsLoading(false);
      return undefined;
    }

    setIsLoading(true);

    const collection = database.get<Account>("accounts");
    const subscription = observeOwnedById<Account>(
      collection,
      id,
      userId
    ).subscribe({
      next: (record) => {
        if (record === null) {
          setAccount(null);
          setBankDetails(null);
          setIsLoading(false);
          return;
        }
        setAccount(record);
      },
      error: (err: unknown) => {
        logger.error("useAccountById_observation_failed", err);
        setAccount(null);
        setBankDetails(null);
        setIsLoading(false);
      },
    });

    return (): void => {
      subscription.unsubscribe();
    };
  }, [id, userId, isResolvingUser]);

  useEffect(() => {
    if (!account) {
      return undefined;
    }

    if (!account.isBank && !account.isDigitalWallet) {
      setBankDetails(null);
      setIsLoading(false);
      return undefined;
    }

    let latestDetails: readonly BankDetails[] = [];
    let latestSenders: readonly AccountSmsSender[] = [];
    let hasDetailsEmission = !account.isBank;
    let hasSenderEmission = false;

    const emitDetails = (): void => {
      if (!hasDetailsEmission || !hasSenderEmission) {
        return;
      }

      const smsSenderNames = latestSenders
        .filter((row) => !row.deleted)
        .map((row) => row.senderName);
      const [details] = latestDetails;
      const cardLast4 = details?.cardLast4;

      setBankDetails({
        bankName: account.providerDisplayName,
        cardLast4:
          cardLast4 === null || cardLast4 === undefined
            ? undefined
            : formatCardLast4ForInput(cardLast4),
        smsSenderName: smsSenderNames.join(", "),
        smsSenderNames,
      });
      setIsLoading(false);
    };

    const senderSubscription = subscribeToRelationRows<AccountSmsSender>(
      account.accountSmsSenders as unknown as ObservableRelation<AccountSmsSender>,
      (senderRows) => {
        latestSenders = senderRows;
        hasSenderEmission = true;
        emitDetails();
      },
      (err: unknown) => {
        logger.error("useAccountById_sender_rows_observe_failed", err);
        setBankDetails(null);
        setIsLoading(false);
      }
    );

    const bankDetailsSubscription = account.isBank
      ? subscribeToRelationRows<BankDetails>(
          account.bankDetails as unknown as ObservableRelation<BankDetails>,
          (detailsRows) => {
            latestDetails = detailsRows;
            hasDetailsEmission = true;
            emitDetails();
          },
          (err: unknown) => {
            logger.error("useAccountById_bank_details_observe_failed", err);
            setBankDetails(null);
            setIsLoading(false);
          }
        )
      : null;

    return (): void => {
      senderSubscription.unsubscribe();
      bankDetailsSubscription?.unsubscribe();
    };
  }, [account]);

  return { account, bankDetails, isLoading };
}
