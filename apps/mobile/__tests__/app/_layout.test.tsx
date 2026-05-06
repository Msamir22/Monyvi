import { readFileSync } from "fs";
import path from "path";

describe("Root layout startup chrome", () => {
  it("does not mount InitialSyncOverlay during normal authenticated startup", () => {
    const layoutSource = readFileSync(
      path.join(__dirname, "../../app/_layout.tsx"),
      "utf8"
    );

    expect(layoutSource).not.toContain("<InitialSyncOverlay");
  });

  it("does not import InitialSyncOverlay for sign-up startup either", () => {
    const layoutSource = readFileSync(
      path.join(__dirname, "../../app/_layout.tsx"),
      "utf8"
    );

    expect(layoutSource).not.toContain("InitialSyncOverlay");
  });
});
