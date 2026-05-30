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
import { useEffect, useRef, useState } from "react";
import { observeOwnedById } from "@/services/user-data-access";
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

function fetchAccountSmsSenders(account: Account): Promise<AccountSmsSender[]> {
  const relation = account.accountSmsSenders;
  if (!relation) {
    return Promise.resolve([]);
  }

  return relation.fetch() as Promise<AccountSmsSender[]>;
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
  const bankDetailsRequestIdRef = useRef(0);
  const bankDetailsKeyRef = useRef<string | null>(null);
  const { userId, isResolvingUser } = useCurrentUser();

  useEffect(() => {
    if (!id) {
      setAccount(null);
      setBankDetails(null);
      setIsLoading(false);
      bankDetailsKeyRef.current = null;
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
      bankDetailsKeyRef.current = null;
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
    let isActive = true;

    if (!account) {
      bankDetailsKeyRef.current = null;
      return undefined;
    }

    const detailsKey = `${account.id}:${account.type}`;
    if (bankDetailsKeyRef.current === detailsKey) {
      return undefined;
    }
    bankDetailsKeyRef.current = detailsKey;

    const loadBankDetails = async (): Promise<void> => {
      const requestId = ++bankDetailsRequestIdRef.current;
      if (!account.isBank && !account.isDigitalWallet) {
        if (!isActive || requestId !== bankDetailsRequestIdRef.current) return;
        setBankDetails(null);
        setIsLoading(false);
        return;
      }

      try {
        const [details, senderRows] = await Promise.all([
          account.isBank
            ? (account.bankDetails.fetch() as Promise<BankDetails[]>)
            : Promise.resolve([]),
          fetchAccountSmsSenders(account),
        ]);
        if (!isActive || requestId !== bankDetailsRequestIdRef.current) return;

        const smsSenderNames = senderRows
          .filter((row) => !row.deleted)
          .map((row) => row.senderName);

        if (details.length > 0) {
          const bd = details[0];
          setBankDetails({
            bankName: account.providerDisplayName,
            cardLast4: bd.cardLast4,
            smsSenderName: smsSenderNames.join(", "),
            smsSenderNames,
          });
        } else {
          setBankDetails({
            bankName: account.providerDisplayName,
            smsSenderName: smsSenderNames.join(", "),
            smsSenderNames,
          });
        }
      } catch (err: unknown) {
        if (!isActive || requestId !== bankDetailsRequestIdRef.current) return;
        logger.error("useAccountById_bank_details_fetch_failed", err);
        setBankDetails(null);
      } finally {
        if (isActive && requestId === bankDetailsRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    };

    void loadBankDetails();

    return (): void => {
      isActive = false;
    };
  }, [account]);

  return { account, bankDetails, isLoading };
}
