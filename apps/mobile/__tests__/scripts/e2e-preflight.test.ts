interface E2ePreflightModule {
  appendAndroidPlatform(url: string): string;
  buildDevMenuPreferencesXml(): string;
  currentFocusShowsDevMenu(currentFocus: string): boolean;
  currentFocusShowsLauncher(currentFocus: string): boolean;
  getHttpClientNameForUrl(url: string): "http" | "https";
  isAppReady(uiXml: string): boolean;
  resolveMetroUrls(env?: Readonly<Record<string, string | undefined>>): {
    hostMetroUrl: string;
    metroUrl: string;
  };
}

const preflight = jest.requireActual(
  "../../scripts/e2e-preflight"
) as E2ePreflightModule;

describe("e2e-preflight", () => {
  it("forces Android platform in Metro URLs", () => {
    expect(
      preflight.appendAndroidPlatform(
        "http://127.0.0.1:8081/status?platform=ios"
      )
    ).toBe("http://127.0.0.1:8081/status?platform=android");
  });

  it("uses the HTTPS client for HTTPS Metro endpoints", () => {
    expect(
      preflight.getHttpClientNameForUrl("https://metro.example/status")
    ).toBe("https");
    expect(
      preflight.getHttpClientNameForUrl("http://127.0.0.1:8081/status")
    ).toBe("http");
  });

  it("uses the emulator host Metro URL in CI to avoid adb reverse drops", () => {
    expect(preflight.resolveMetroUrls({ CI: "true" })).toEqual({
      hostMetroUrl: "http://127.0.0.1:8081",
      metroUrl: "http://10.0.2.2:8081/?platform=android",
    });

    expect(
      preflight.resolveMetroUrls({
        CI: "true",
        E2E_DEVICE_METRO_URL: "http://custom-device:8081",
      }).metroUrl
    ).toBe("http://custom-device:8081/?platform=android");
  });

  it("builds dev menu preferences that hide the Expo tools button", () => {
    expect(preflight.buildDevMenuPreferencesXml()).toContain(
      '<boolean name="showFab" value="false" />'
    );
    expect(preflight.buildDevMenuPreferencesXml()).toContain(
      '<boolean name="isOnboardingFinished" value="true" />'
    );
  });

  it("treats the pre-auth pitch carousel as loaded product UI", () => {
    expect(preflight.isAppReady('<node text="Skip" />')).toBe(true);
    expect(preflight.isAppReady('<node text="Track with your voice." />')).toBe(
      true
    );
  });

  it("does not treat the Expo developer menu as product UI", () => {
    expect(
      preflight.isAppReady(
        '<node text="This is the developer menu" /><node text="Skip" />'
      )
    ).toBe(false);
  });

  it("does not treat stale DevMenuActivity records as the focused dev menu", () => {
    expect(
      preflight.currentFocusShowsDevMenu(`
        Display #0 currentFocus=Window{ad25cd0 u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
        mFocusedApp=ActivityRecord{e4594ea u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity t10}
        Window #9 Window{b4ae2b7 u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity}
      `)
    ).toBe(false);
  });

  it("detects the developer menu when it owns the focused window", () => {
    expect(
      preflight.currentFocusShowsDevMenu(
        "mCurrentFocus=Window{b4ae2b7 u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity}"
      )
    ).toBe(true);
  });

  it("detects launcher focus even when stale dev menu records are present", () => {
    expect(
      preflight.currentFocusShowsLauncher(`
        Display #0 currentFocus=Window{ad25cd0 u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
        focusedApp=ActivityRecord{4efef91 u0 com.google.android.apps.nexuslauncher/.NexusLauncherActivity t7}
        mFocusedApp=ActivityRecord{e4594ea u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity t10}
        Window #9 Window{b4ae2b7 u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity}
      `)
    ).toBe(true);
  });

  it("detects launcher ANR focus from dumpsys", () => {
    expect(
      preflight.currentFocusShowsLauncher(`
        WINDOW MANAGER WINDOWS (dumpsys window windows)
        mCurrentFocus=Window{c343781 u0 Application Not Responding: com.google.android.apps.nexuslauncher}
        mFocusedApp=ActivityRecord{e4594ea u0 com.monyvi.app/expo.modules.devmenu.DevMenuActivity t10}
      `)
    ).toBe(true);
  });

  it("ignores stale launcher focus from the last ANR section", () => {
    expect(
      preflight.currentFocusShowsLauncher(`
        WINDOW MANAGER LAST ANR (dumpsys window lastanr)
        Display #0 currentFocus=Window{e5ceca1 u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
        WINDOW MANAGER WINDOWS (dumpsys window windows)
        mCurrentFocus=Window{31b944f u0 com.monyvi.app/com.monyvi.MainActivity}
      `)
    ).toBe(false);
  });

  it("detects current launcher focus after a stale last ANR section", () => {
    expect(
      preflight.currentFocusShowsLauncher(`
        WINDOW MANAGER LAST ANR (dumpsys window lastanr)
        Display #0 currentFocus=Window{31b944f u0 com.monyvi.app/com.monyvi.MainActivity}
        WINDOW MANAGER WINDOWS (dumpsys window windows)
        mCurrentFocus=Window{e5ceca1 u0 com.google.android.apps.nexuslauncher/com.google.android.apps.nexuslauncher.NexusLauncherActivity}
      `)
    ).toBe(true);
  });
});
