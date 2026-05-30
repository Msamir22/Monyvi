import { Account, AccountSmsSender, database } from "@monyvi/db";
import { Q } from "@nozbe/watermelondb";

import { queryChildrenOfOwnedParent } from "./user-data-access";

export function normalizeAccountSmsSender(senderName: string): string {
  return senderName.trim().toLowerCase();
}

function uniqueTrimmedSenderNames(
  senderNames: readonly string[]
): readonly string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const senderName of senderNames) {
    const trimmed = senderName.trim();
    const normalized = normalizeAccountSmsSender(trimmed);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

export async function createAccountSmsSendersWithinWriter(
  accountId: string,
  senderNames: readonly string[]
): Promise<void> {
  const uniqueSenderNames = uniqueTrimmedSenderNames(senderNames);

  for (const senderName of uniqueSenderNames) {
    await database
      .get<AccountSmsSender>("account_sms_senders")
      .create((sender) => {
        sender.accountId = accountId;
        sender.senderName = senderName;
        sender.normalizedSenderName = normalizeAccountSmsSender(senderName);
        sender.deleted = false;
      });
  }
}

export async function replaceAccountSmsSendersWithinWriter(
  account: Account,
  currentUserId: string,
  senderNames: readonly string[]
): Promise<void> {
  const desiredSenderNames = uniqueTrimmedSenderNames(senderNames);
  const desiredByNormalizedSender = new Map<string, string>();
  for (const senderName of desiredSenderNames) {
    desiredByNormalizedSender.set(
      normalizeAccountSmsSender(senderName),
      senderName
    );
  }

  const activeSenders = await queryChildrenOfOwnedParent(
    database.get<AccountSmsSender>("account_sms_senders"),
    account,
    currentUserId,
    "account_id",
    Q.where("deleted", false)
  ).fetch();

  const activeByNormalizedSender = new Map<string, AccountSmsSender>();
  for (const sender of activeSenders) {
    const normalized = normalizeAccountSmsSender(sender.senderName);
    if (!activeByNormalizedSender.has(normalized)) {
      activeByNormalizedSender.set(normalized, sender);
    }
  }

  for (const sender of activeSenders) {
    const normalized = normalizeAccountSmsSender(sender.senderName);
    const desiredSenderName = desiredByNormalizedSender.get(normalized);

    if (desiredSenderName === undefined) {
      await sender.update((draft) => {
        draft.deleted = true;
      });
      continue;
    }

    if (sender.senderName !== desiredSenderName) {
      await sender.update((draft) => {
        draft.senderName = desiredSenderName;
        draft.normalizedSenderName = normalized;
      });
    }
  }

  for (const [normalized, senderName] of desiredByNormalizedSender) {
    if (activeByNormalizedSender.has(normalized)) {
      continue;
    }

    await database
      .get<AccountSmsSender>("account_sms_senders")
      .create((sender) => {
        sender.accountId = account.id;
        sender.senderName = senderName;
        sender.normalizedSenderName = normalized;
        sender.deleted = false;
      });
  }
}
