/**
 * BaseBankDetails - Abstract Base Model for WatermelonDB
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Run 'npm run db:sync' to regenerate
 *
 * Extend this class in ../BankDetails.ts to add custom methods
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

export abstract class BaseBankDetails extends Model {
  static table = "bank_details";
  static associations: Associations = {
    accounts: { type: "belongs_to", key: "account_id" },
  };

  @field("account_id") accountId!: string;
  @field("account_number") accountNumber?: string;
  @field("card_last_4") cardLast4?: number;
  @readonly @date("created_at") createdAt!: Date;
  @field("deleted") deleted!: boolean;
  @date("updated_at") updatedAt!: Date;

  @relation("accounts", "account_id") account!: Relation<BaseAccount>;
}
