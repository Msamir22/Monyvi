interface RunSmsSyncJourneysModule {
  buildSmsSyncProbeCleanupSql(): string;
}

const smsSyncJourneys = jest.requireActual(
  "../../scripts/run-sms-sync-journeys"
) as RunSmsSyncJourneysModule;

describe("run-sms-sync-journeys helpers", () => {
  it("cleans only current-user SMS sync probe rows and fails on SQL errors", () => {
    const sql = smsSyncJourneys.buildSmsSyncProbeCleanupSql();

    expect(sql).toContain("delete from transactions where");
    expect(sql).toContain("counterparty = 'PR622 BATCH DUPLICATE SHOP'");
    expect(sql).toContain("delete from transfers where");
    expect(sql).toContain("notes = 'ATM Withdrawal'");
    expect(sql).toContain("amount = 2000");
    expect(sql).toContain("sms_fingerprint is not null");
    expect(sql).toContain(
      "user_id = (select user_id from profiles where deleted = 0 order by updated_at desc limit 1)"
    );
  });
});
