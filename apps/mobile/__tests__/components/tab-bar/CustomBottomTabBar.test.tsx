import { TAB_LABELS, TAB_ORDER } from "@/components/tab-bar/CustomBottomTabBar";

describe("CustomBottomTabBar configuration", () => {
  it("matches the approved dashboard tab order around the center mic", () => {
    expect(TAB_ORDER).toEqual([
      "index",
      "transactions",
      "__mic__",
      "stats",
      "metals",
      "accounts",
    ]);
  });

  it("includes the stats tab label used in the approved dashboard mockup", () => {
    expect(TAB_LABELS.stats).toBe("Stats");
  });
});
