/**
 * BaseAccountSmsSender - Abstract Base Model for WatermelonDB
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run 'npm run db:sync' to regenerate
 *
 * Extend this class in ../AccountSmsSender.ts to add custom methods
 */

import { Model, type Relation } from "@nozbe/watermelondb";
import {
  date,
  field,
  readonly,
  relation,
} from "@nozbe/watermelondb/decorators";
import type { Associations } from "@nozbe/watermelondb/Model";
import type { BaseAccount } from "./base-account";

export abstract class BaseAccountSmsSender extends Model {
  static table = "account_sms_senders";
  static associations: Associations = {
    accounts: { type: "belongs_to", key: "account_id" },
  };

  @field("account_id") accountId!: string;
  @readonly @date("created_at") createdAt!: Date;
  @field("deleted") deleted!: boolean;
  @field("normalized_sender_name") normalizedSenderName!: string;
  @field("sender_name") senderName!: string;
  @date("updated_at") updatedAt!: Date;

  @relation("accounts", "account_id") account!: Relation<BaseAccount>;
}
