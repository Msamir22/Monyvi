jest.mock("@monyvi/db", () => ({
  schema: {
    tables: {
      accounts: {},
      account_sms_senders: {},
      asset_metals: {},
      bank_details: {},
      profiles: {},
    },
  },
}));

import {
  CHILD_TABLE_NAMES,
  CHILD_TABLES_MAP,
  SYNCABLE_TABLES,
} from "../../services/sync/config";

describe("sync child table configuration", () => {
  it("treats account_sms_senders as an account-owned child table", () => {
    expect(CHILD_TABLE_NAMES).toContain("account_sms_senders");
    expect(CHILD_TABLES_MAP.account_sms_senders).toEqual({
      parentTable: "accounts",
      foreignKey: "account_id",
    });
  });

  it("includes account_sms_senders in syncable local tables", () => {
    expect(SYNCABLE_TABLES).toContain("account_sms_senders");
  });
});
