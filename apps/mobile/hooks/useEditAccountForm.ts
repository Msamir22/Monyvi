/**
 * useEditAccountForm Hook
 *
 * Manages edit account form state with pre-filled data from an existing account,
 * dirty tracking to enable/disable the Save button, and inline uniqueness
 * validation with debounce.
 *
 * Architecture & Design Rationale:
 * - Pattern: Custom Hook (encapsulates form state + validation logic)
 * - SOLID: SRP — form state management only, no persistence
 * - Debounced uniqueness check avoids excessive queries
 *
 * @module useEditAccountForm
 */

import type { Account, AccountType, CurrencyType } from "@monyvi/db";
import {
  getInstitutionById,
  getSenderPatternsForInstitution,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import { t } from "i18next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type EditAccountFormData,
  type EditValidationErrors,
  validateEditAccountForm,
} from "../validation/account-validation";
import { checkAccountNameUniqueness } from "../services/edit-account-service";
import { logger } from "../utils/logger";
import { UseAccountByIdResult } from "./useAccountById";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UNIQUENESS_DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Form data snapshot used for dirty tracking. */
interface OriginalAccountData {
  readonly name: string;
  readonly balance: string;
  readonly isDefault: boolean;
  readonly bankName: string;
  readonly cardLast4: string;
  readonly smsSenderName: string;
  readonly institutionId: string | null;
  readonly providerDisplayName: string;
  readonly senderNames: readonly string[];
}

interface UseEditAccountFormResult {
  /** Current form field values */
  readonly formData: EditAccountFormData;
  /** Current field-level validation errors */
  readonly errors: EditValidationErrors;
  /** Whether the form passes validation */
  readonly isValid: boolean;
  /** Whether any field has been modified from its original value */
  readonly isDirty: boolean;
  /** Which fields the user has interacted with */
  readonly isTouched: Partial<Record<keyof EditAccountFormData, boolean>>;
  /** Whether a uniqueness check is in progress */
  readonly isCheckingUniqueness: boolean;
  /** Account type (read-only, for conditional field display) */
  readonly accountType: AccountType;
  /** Account currency (read-only, for display) */
  readonly currency: CurrencyType;
  /** Whether the account is currently set as default */
  readonly isDefault: boolean;
  /** Original balance before edits (needed for balance change detection) */
  readonly originalBalance: number;
  /** Update a single form field */
  readonly updateField: <K extends keyof EditAccountFormData>(
    field: K,
    value: EditAccountFormData[K]
  ) => void;
  readonly selectKnownInstitution: (
    institutionId: SelectableEgyptianInstitutionId
  ) => void;
  readonly selectOtherInstitution: () => void;
  readonly updateSenderNames: (senderNames: readonly string[]) => void;
  /** Toggle the isDefault flag */
  readonly toggleDefault: () => void;
  /** Run full form validation; returns true if valid */
  readonly validate: () => boolean;
}

function validateEditFormForAccountType(
  data: EditAccountFormData,
  accountType: AccountType
): {
  readonly isValid: boolean;
  readonly errors: EditValidationErrors;
} {
  return validateEditAccountForm(data, accountType);
}

function normalizeSenderName(value: string): string {
  return value.trim().toLowerCase();
}

function getCustomSenderNames(
  institutionId: string | null,
  senderNames: readonly string[]
): readonly string[] {
  if (!institutionId) {
    return senderNames;
  }

  const institution = getInstitutionById(institutionId);
  if (!institution?.selectable) {
    return senderNames;
  }

  const registrySenders = new Set(
    getSenderPatternsForInstitution(
      institutionId as SelectableEgyptianInstitutionId
    ).map(normalizeSenderName)
  );

  return senderNames.filter(
    (senderName) => !registrySenders.has(normalizeSenderName(senderName))
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages edit account form state.
 *
 * Pre-fills from an existing Account model record.
 * Tracks dirty state (whether any field differs from the original).
 * Debounces account name uniqueness checks (300 ms).
 *
 * @param account - The WatermelonDB Account model record to edit
 * @param bankDetails - Optional bank details (bank name, card last 4, SMS sender)
 * @returns Form state, errors, dirty flag, and field update functions
 */
export function useEditAccountForm(
  account: Account,
  bankDetails: UseAccountByIdResult["bankDetails"]
): UseEditAccountFormResult {
  const initialSenderNames = getCustomSenderNames(
    account.institutionId ?? null,
    bankDetails?.smsSenderNames ?? []
  );

  // Snapshot the original data for dirty tracking.
  // useRef to avoid re-creating on each render.
  const originalData = useRef<OriginalAccountData>({
    name: account.name,
    balance: String(account.balance),
    isDefault: account.isDefault,
    bankName: bankDetails?.bankName ?? "",
    cardLast4: bankDetails?.cardLast4 ?? "",
    smsSenderName: initialSenderNames.join(", "),
    institutionId: account.institutionId ?? null,
    providerDisplayName: account.providerDisplayName ?? "",
    senderNames: initialSenderNames,
  });

  const [formData, setFormData] = useState<EditAccountFormData>({
    name: account.name,
    balance: String(account.balance),
    bankName: bankDetails?.bankName ?? "",
    institutionId: account.institutionId ?? null,
    providerDisplayName: account.providerDisplayName ?? "",
    senderNames: [...initialSenderNames],
    cardLast4: bankDetails?.cardLast4 ?? "",
    smsSenderName: initialSenderNames.join(", "),
  });
  const latestFormDataRef = useRef<EditAccountFormData>(formData);

  const [isDefault, setIsDefault] = useState(account.isDefault);
  const [errors, setErrors] = useState<EditValidationErrors>({});
  const [isSchemaValid, setIsSchemaValid] = useState((): boolean => {
    return validateEditFormForAccountType(
      {
        name: account.name,
        balance: String(account.balance),
        bankName: bankDetails?.bankName ?? "",
        cardLast4: bankDetails?.cardLast4 ?? "",
        smsSenderName: initialSenderNames.join(", "),
        institutionId: account.institutionId ?? null,
        providerDisplayName: account.providerDisplayName ?? "",
        senderNames: [...initialSenderNames],
      },
      account.type
    ).isValid;
  });
  const [isTouched, setIsTouched] = useState<
    Partial<Record<keyof EditAccountFormData, boolean>>
  >({});
  const [isCheckingUniqueness, setIsCheckingUniqueness] = useState(false);
  const [hasNameUniquenessError, setHasNameUniquenessError] = useState(false);

  // Debounce timer ref for uniqueness check
  const uniquenessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeUniquenessRequestRef = useRef(0);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      activeUniquenessRequestRef.current += 1;
      if (uniquenessTimerRef.current) {
        clearTimeout(uniquenessTimerRef.current);
      }
    };
  }, []);

  /**
   * Run debounced account name uniqueness check.
   */
  const checkUniqueness = useCallback(
    (name: string): void => {
      // Clear any pending timer
      if (uniquenessTimerRef.current) {
        clearTimeout(uniquenessTimerRef.current);
      }
      const requestId = activeUniquenessRequestRef.current + 1;
      activeUniquenessRequestRef.current = requestId;

      const trimmedName = name.trim();
      const institutionId = latestFormDataRef.current.institutionId ?? null;
      const providerDisplayName =
        latestFormDataRef.current.providerDisplayName ?? "";
      if (!trimmedName) {
        setHasNameUniquenessError(false);
        setIsCheckingUniqueness(false);
        return;
      }

      setIsCheckingUniqueness(true);

      uniquenessTimerRef.current = setTimeout(() => {
        void (async () => {
          const result = await checkAccountNameUniqueness(
            account.userId,
            trimmedName,
            account.currency,
            account.id,
            institutionId,
            providerDisplayName
          );

          const latestFormData = latestFormDataRef.current;
          if (
            requestId !== activeUniquenessRequestRef.current ||
            latestFormData.name.trim() !== trimmedName ||
            (latestFormData.institutionId ?? null) !== institutionId ||
            latestFormData.providerDisplayName !== providerDisplayName
          ) {
            return;
          }

          if (result.isUnique && !result.error) {
            setHasNameUniquenessError(false);
            const validation = validateEditFormForAccountType(
              latestFormData,
              account.type
            );
            setErrors((prev) => {
              if (validation.errors.name) {
                return { ...prev, name: validation.errors.name };
              }
              const { name: _removed, ...rest } = prev;
              return rest;
            });
          } else if (!result.isUnique && !result.error) {
            setErrors((prev) => ({
              ...prev,
              name: t("accounts:validation_account_name_taken"),
            }));
            setHasNameUniquenessError(true);
          } else if (result.error) {
            // Don't block the user on uniqueness check errors
            logger.warn("uniqueness_check_failed", { error: result.error });
            setHasNameUniquenessError(false);
          }

          if (requestId === activeUniquenessRequestRef.current) {
            setIsCheckingUniqueness(false);
          }
        })();
      }, UNIQUENESS_DEBOUNCE_MS);
    },
    [account.userId, account.currency, account.id, account.type]
  );

  /**
   * Update a single form field with validation.
   */
  const updateField = useCallback(
    <K extends keyof EditAccountFormData>(
      field: K,
      value: EditAccountFormData[K]
    ): void => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };
        latestFormDataRef.current = newData;

        // Run field-level validation
        const validation = validateEditFormForAccountType(
          newData,
          account.type
        );
        setIsSchemaValid(validation.isValid);
        setErrors((prevErrors) => ({
          ...prevErrors,
          [field]: validation.errors[field],
        }));

        return newData;
      });

      setIsTouched((prev) => ({ ...prev, [field]: true }));

      // Trigger uniqueness check for fields that affect the account identity.
      if (field === "name") {
        checkUniqueness(value as string);
      } else if (field === "providerDisplayName") {
        checkUniqueness(latestFormDataRef.current.name);
      }
    },
    [account.type, checkUniqueness]
  );

  const selectKnownInstitution = useCallback(
    (institutionId: SelectableEgyptianInstitutionId): void => {
      const institution = getInstitutionById(institutionId);
      if (!institution || !institution.selectable) {
        return;
      }

      setFormData((prev) => {
        if (prev.institutionId === institutionId) {
          return prev;
        }
        const newData = {
          ...prev,
          institutionId,
          providerDisplayName: institution.shortName,
          bankName: institution.shortName,
          senderNames: [],
          smsSenderName: "",
        };
        latestFormDataRef.current = newData;
        const validation = validateEditFormForAccountType(
          newData,
          account.type
        );
        setIsSchemaValid(validation.isValid);
        setErrors(validation.errors);
        if (newData.name.trim()) {
          checkUniqueness(newData.name);
        }
        return newData;
      });
    },
    [account.type, checkUniqueness]
  );

  const selectOtherInstitution = useCallback((): void => {
    setFormData((prev) => {
      const newData = {
        ...prev,
        institutionId: null,
        providerDisplayName: "",
        bankName: "",
        senderNames: [],
        smsSenderName: "",
      };
      latestFormDataRef.current = newData;
      const validation = validateEditFormForAccountType(newData, account.type);
      setIsSchemaValid(validation.isValid);
      setErrors(validation.errors);
      if (newData.name.trim()) {
        checkUniqueness(newData.name);
      }
      return newData;
    });
  }, [account.type, checkUniqueness]);

  const updateSenderNames = useCallback(
    (senderNames: readonly string[]): void => {
      setFormData((prev) => {
        const newData = {
          ...prev,
          senderNames: [...senderNames],
          smsSenderName: senderNames.join(", "),
        };
        latestFormDataRef.current = newData;
        const validation = validateEditFormForAccountType(
          newData,
          account.type
        );
        setIsSchemaValid(validation.isValid);
        setErrors(validation.errors);
        return newData;
      });
    },
    [account.type]
  );

  /**
   * Toggle the isDefault flag.
   */
  const toggleDefault = useCallback((): void => {
    setIsDefault((prev) => !prev);
  }, []);

  /**
   * Run full form validation.
   */
  const validate = useCallback((): boolean => {
    const { isValid, errors: newErrors } = validateEditFormForAccountType(
      formData,
      account.type
    );
    setIsSchemaValid(isValid);
    setErrors(newErrors);
    return isValid;
  }, [formData, account.type]);

  /**
   * Whether the form passes all validation rules.
   */
  const isValid = useMemo((): boolean => {
    return isSchemaValid && !isCheckingUniqueness && !hasNameUniquenessError;
  }, [isSchemaValid, isCheckingUniqueness, hasNameUniquenessError]);

  /**
   * Whether any field differs from the original account data.
   */
  const isDirty = useMemo((): boolean => {
    const orig = originalData.current;
    const currentSenderNames = formData.senderNames ?? [];
    return (
      formData.name !== orig.name ||
      formData.balance !== orig.balance ||
      isDefault !== orig.isDefault ||
      formData.bankName !== orig.bankName ||
      formData.cardLast4 !== orig.cardLast4 ||
      formData.smsSenderName !== orig.smsSenderName ||
      formData.institutionId !== orig.institutionId ||
      formData.providerDisplayName !== orig.providerDisplayName ||
      currentSenderNames.length !== orig.senderNames.length ||
      currentSenderNames.some(
        (senderName, index) => senderName !== orig.senderNames[index]
      )
    );
  }, [formData, isDefault]);

  return {
    formData,
    errors,
    isValid,
    isDirty,
    isTouched,
    isCheckingUniqueness,
    accountType: account.type,
    currency: account.currency,
    isDefault,
    originalBalance: account.balance,
    updateField,
    selectKnownInstitution,
    selectOtherInstitution,
    updateSenderNames,
    toggleDefault,
    validate,
  };
}
