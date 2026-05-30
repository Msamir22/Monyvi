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
  const activeSenders = await queryChildrenOfOwnedParent(
    database.get<AccountSmsSender>("account_sms_senders"),
    account,
    currentUserId,
    "account_id",
    Q.where("deleted", false)
  ).fetch();

  for (const sender of activeSenders) {
    await sender.update((draft) => {
      draft.deleted = true;
    });
  }

  await createAccountSmsSendersWithinWriter(account.id, senderNames);
}
