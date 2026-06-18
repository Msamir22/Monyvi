import { shouldEnableAccountsScroll } from "@/components/dashboard/AccountsSection";

describe("AccountsSection layout helpers", () => {
  it("enables horizontal scroll when exactly three cards overflow the available width", () => {
    expect(
      shouldEnableAccountsScroll({
        accountCount: 3,
        cardWidth: 116,
        cardGap: 10,
        availableWidth: 340,
      })
    ).toBe(true);
  });

  it("keeps horizontal scroll disabled when three cards fit", () => {
    expect(
      shouldEnableAccountsScroll({
        accountCount: 3,
        cardWidth: 100,
        cardGap: 10,
        availableWidth: 340,
      })
    ).toBe(false);
  });
});
