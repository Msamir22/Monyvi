import React from "react";

const mockUseCurrentUserId = jest.fn();
const mockQuery = jest.fn<unknown, unknown[]>();
const mockObserve = jest.fn();
const mockSubscribe = jest.fn();
const mockQueryAccessibleCategories = jest.fn(
  (
    collection: { query: (...clauses: unknown[]) => unknown },
    currentUserId: string,
    ...conditions: unknown[]
  ) => {
    return collection.query(
      { accessibleCategoriesFor: currentUserId },
      { systemScope: ["is_system", "user_id"] },
      ...conditions
    );
  }
);
const mockWhere = jest.fn((column: string, value: unknown) => ({
  column,
  value,
}));
const mockOr = jest.fn((...clauses: unknown[]) => ({ or: clauses }));
const mockAnd = jest.fn((...clauses: unknown[]) => ({ and: clauses }));
const mockSortBy = jest.fn((column: string, direction: string) => ({
  sortBy: [column, direction],
}));

jest.mock("@/hooks/useCurrentUserId", () => ({
  useCurrentUserId: (): unknown => mockUseCurrentUserId(),
}));

jest.mock("@monyvi/db", () => ({
  database: {
    get: jest.fn(() => ({
      query: (...clauses: unknown[]): unknown => mockQuery(...clauses),
    })),
  },
}));

jest.mock("@nozbe/watermelondb", () => ({
  Q: {
    asc: "asc",
    where: (column: string, value: unknown): unknown =>
      mockWhere(column, value),
    or: (...clauses: unknown[]): unknown => mockOr(...clauses),
    and: (...clauses: unknown[]): unknown => mockAnd(...clauses),
    sortBy: (column: string, direction: string): unknown =>
      mockSortBy(column, direction),
  },
}));

jest.mock("@/services/user-data-access", () => ({
  queryAccessibleCategories: (
    collection: { query: (...clauses: unknown[]) => unknown },
    currentUserId: string,
    ...conditions: unknown[]
  ): unknown =>
    mockQueryAccessibleCategories(collection, currentUserId, ...conditions),
}));

import {
  CategoriesProvider,
  useAllCategories,
} from "@/context/CategoriesContext";

interface ReactTestRendererInstance {
  readonly unmount: () => void;
}

interface ReactTestRendererModule {
  readonly act: (callback: () => void) => void;
  readonly create: (element: React.ReactElement) => ReactTestRendererInstance;
}

function getRTR(): ReactTestRendererModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
  return require("react-test-renderer");
}

function renderProvider(): ReactTestRendererInstance {
  function Capture(): null {
    useAllCategories();
    return null;
  }

  let renderer: ReactTestRendererInstance | null = null;
  getRTR().act(() => {
    renderer = getRTR().create(
      <CategoriesProvider>
        <Capture />
      </CategoriesProvider>
    );
  });

  if (!renderer) {
    throw new Error("renderer-not-created");
  }

  return renderer;
}

describe("CategoriesProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockObserve.mockReturnValue({ subscribe: mockSubscribe });
    mockSubscribe.mockImplementation(
      ({ next }: { next: (items: []) => void }) => {
        next([]);
        return { unsubscribe: jest.fn() };
      }
    );
    mockQuery.mockReturnValue({ observe: mockObserve });
  });

  it("observes only ownerless system categories plus current-user custom categories", () => {
    mockUseCurrentUserId.mockReturnValue({
      userId: "user-1",
      isResolvingUser: false,
    });

    renderProvider();

    const queryPayload = JSON.stringify(mockQuery.mock.calls[0]);
    expect(queryPayload).toContain("is_system");
    expect(queryPayload).toContain("user_id");
    expect(queryPayload).toContain("user-1");
    expect(queryPayload).toContain("deleted");
  });

  it("does not observe custom category rows while signed out", () => {
    mockUseCurrentUserId.mockReturnValue({
      userId: null,
      isResolvingUser: false,
    });

    renderProvider();

    const queryPayload = JSON.stringify(mockQuery.mock.calls[0]);
    expect(queryPayload).toContain("is_system");
    expect(queryPayload).toContain("user_id");
    expect(queryPayload).toContain("null");
    expect(queryPayload).not.toContain("user-1");
  });
});
