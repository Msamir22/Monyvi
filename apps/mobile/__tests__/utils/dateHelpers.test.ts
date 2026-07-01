import { calculateNextDueDate } from "@/utils/dateHelpers";

describe("dateHelpers", () => {
  it("clamps monthly next due dates to the target month end", () => {
    expect(
      calculateNextDueDate(new Date("2026-01-31T00:00:00.000Z"), "MONTHLY")
    ).toEqual(new Date("2026-02-28T00:00:00.000Z"));
  });
});
