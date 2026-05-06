import React from "react";

interface ReactTestRendererInstance {
  root: {
    findAllByProps: (m: Record<string, unknown>) => unknown[];
  };
  unmount: () => void;
}

interface ReactTestRendererModule {
  create: (element: React.ReactElement) => ReactTestRendererInstance;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const RTR: ReactTestRendererModule = require("react-test-renderer");

const mockUseDatabaseReady = jest.fn();
const mockUseSync = jest.fn();

jest.mock("@/components/currency/CurrencyPicker", () => ({
  CurrencyPicker: (): null => null,
}));

jest.mock("@/components/dashboard/AccountsSection", () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const ReactMod = require("react");
  const RN = require("react-native");
  return {
    AccountsSection: (): React.ReactElement =>
      ReactMod.createElement(RN.View, { testID: "accounts-section" }, null),
  };
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
});

jest.mock("@/components/dashboard/CashAccountTooltip", () => ({
  CashAccountTooltip: (): null => null,
}));

jest.mock("@/components/dashboard/MicButtonTooltip", () => ({
  MicButtonTooltip: (): null => null,
}));

jest.mock("@/components/dashboard/LiveRates", () => ({
  LiveRates: (): null => null,
}));

jest.mock("@/components/dashboard/OnboardingGuideCard", () => ({
  OnboardingGuideCard: (): null => null,
}));

jest.mock("@/components/dashboard/RecentTransactions", () => ({
  RecentTransactions: (): null => null,
}));

jest.mock("@/components/dashboard/ThisMonth", () => ({
  ThisMonth: (): null => null,
}));

jest.mock("@/components/dashboard/TopNav", () => ({
  TopNav: (): null => null,
}));

jest.mock("@/components/dashboard/TotalNetWorthCard", () => ({
  TotalNetWorthCard: (): null => null,
}));

jest.mock("@/components/dashboard/UpcomingPayments", () => ({
  UpcomingPayments: (): null => null,
}));

jest.mock("@/components/dashboard/skeletons/DashboardSkeleton", () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
  const ReactMod = require("react");
  const RN = require("react-native");
  return {
    DashboardSkeleton: (): React.ReactElement =>
      ReactMod.createElement(RN.View, { testID: "dashboard-skeleton" }, null),
  };
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
});

jest.mock("@/components/navigation/AppDrawer", () => ({
  AppDrawer: (): null => null,
}));

jest.mock("@/components/sms-sync/SmsPermissionPrompt", () => ({
  SmsPermissionPrompt: (): null => null,
}));

jest.mock("@/components/ui/SectionErrorBoundary", () => ({
  SectionErrorBoundary: ({
    children,
  }: {
    readonly children: React.ReactNode;
  }): React.ReactNode => children,
}));

jest.mock("@/components/ui/StarryBackground", () => ({
  StarryBackground: ({
    children,
  }: {
    readonly children: React.ReactNode;
  }): React.ReactNode => children,
}));

jest.mock("@/components/ui/Toast", () => ({
  useToast: (): { showToast: jest.Mock } => ({ showToast: jest.fn() }),
}));

jest.mock("@/hooks/useAccounts", () => ({
  useTopAccounts: (): { accounts: never[]; isLoading: boolean } => ({
    accounts: [],
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useMarketRates", () => ({
  useMarketRates: (): {
    latestRates: never[];
    previousDayRate: null;
    isLoading: boolean;
    lastUpdated: null;
    isStale: boolean;
  } => ({
    latestRates: [],
    previousDayRate: null,
    isLoading: false,
    lastUpdated: null,
    isStale: false,
  }),
}));

jest.mock("@/hooks/useNetWorth", () => ({
  useMonthlyPercentageChange: (): { monthlyPercentageChange: number } => ({
    monthlyPercentageChange: 0,
  }),
  useNetWorth: (): {
    totalNetWorth: number;
    totalNetWorthUsd: number;
    isLoading: boolean;
  } => ({
    totalNetWorth: 0,
    totalNetWorthUsd: 0,
    isLoading: false,
  }),
}));

jest.mock("@/hooks/usePreferredCurrency", () => ({
  usePreferredCurrency: (): {
    preferredCurrency: string;
    setPreferredCurrency: jest.Mock;
    isLoading: boolean;
  } => ({
    preferredCurrency: "EGP",
    setPreferredCurrency: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: (): { profile: null } => ({ profile: null }),
}));

jest.mock("@/hooks/useSmsPermission", () => ({
  useSmsPermission: (): { requestPermission: jest.Mock } => ({
    requestPermission: jest.fn(),
  }),
}));

jest.mock("@/hooks/useSmsSync", () => ({
  useSmsSync: (): { shouldShowPrompt: boolean; dismissPrompt: jest.Mock } => ({
    shouldShowPrompt: false,
    dismissPrompt: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock("@/hooks/useTransactions", () => ({
  useRecentTransactions: (): { transactions: never[]; isLoading: boolean } => ({
    transactions: [],
    isLoading: false,
  }),
}));

jest.mock("@/providers/DatabaseProvider", () => ({
  useDatabaseReady: (): boolean => mockUseDatabaseReady() as boolean,
}));

jest.mock("@/providers/SyncProvider", () => ({
  useSync: (): unknown => mockUseSync(),
}));

jest.mock("expo-router", () => ({
  useRouter: (): { push: jest.Mock } => ({ push: jest.fn() }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: (): { t: (key: string) => string } => ({
    t: (key: string): string => key,
  }),
}));

jest.mock("@monyvi/logic", () => ({
  CURRENCY_INFO_MAP: {
    EGP: { flag: "EG" },
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const DashboardModule = require("../../app/(tabs)/index.tsx") as {
  default: () => React.ReactElement;
};
const DashboardScreen = DashboardModule.default;

function renderDashboard(): ReactTestRendererInstance {
  return RTR.create(React.createElement(DashboardScreen));
}

describe("DashboardScreen startup loading", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDatabaseReady.mockReturnValue(true);
    mockUseSync.mockReturnValue({
      sync: jest.fn().mockResolvedValue(undefined),
      isPostBootstrapSyncing: false,
    });
  });

  it("keeps the dashboard skeleton visible while post-bootstrap data refresh is running", () => {
    mockUseSync.mockReturnValue({
      sync: jest.fn().mockResolvedValue(undefined),
      isPostBootstrapSyncing: true,
    });

    const renderer = renderDashboard();

    expect(
      renderer.root.findAllByProps({ testID: "dashboard-skeleton" })
    ).not.toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "accounts-section" })
    ).toHaveLength(0);
  });

  it("renders dashboard content after the post-bootstrap data refresh settles", () => {
    const renderer = renderDashboard();

    expect(
      renderer.root.findAllByProps({ testID: "dashboard-skeleton" })
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: "accounts-section" })
    ).not.toHaveLength(0);
  });
});
