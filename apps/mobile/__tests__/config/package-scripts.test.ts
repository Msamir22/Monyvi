interface MobilePackageJson {
  readonly scripts: {
    readonly "android:release": string;
  };
}

const mobilePackage =
  jest.requireActual<MobilePackageJson>("../../package.json");

describe("mobile package scripts", () => {
  it("clears stale Metro workspace opt-out values for release starts", () => {
    expect(mobilePackage.scripts["android:release"]).toContain(
      "EXPO_NO_METRO_WORKSPACE_ROOT=false"
    );
  });
});
