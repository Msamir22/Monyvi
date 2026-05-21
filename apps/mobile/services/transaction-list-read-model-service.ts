import {
  formatDate,
  getEndOfDay,
  getEndOfMonth,
  getEndOfWeek,
  getStartOfDay,
  getStartOfMonth,
  getStartOfWeek,
  isSameDay,
} from "@/utils/dateHelpers";
import { buildAccountDisplayNames } from "@/utils/account-display";
import { queryOwned } from "@/services/user-data-access";
import {
  Account,
  database,
  Transaction,
  Transfer,
  type CurrencyType,
  type MarketRate,
} from "@monyvi/db";
import { convertCurrency } from "@monyvi/logic";
import { Q, type Query } from "@nozbe/watermelondb";

export type TransactionTypeFilter = "All" | "Income" | "Expense" | "Transfer";
export type GroupingPeriod =
  | "today"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month"
  | "six_months"
  | "this_year"
  | "all_time";

type TransactionWithType = Transaction & { _type: "transaction" };
type TransferWithType = Transfer & { _type: "transfer" };

export type DisplayTransaction =
  | (TransactionWithType & {
      displayNetWorth: number;
      accountName: string;
      categoryName: string;
      categoryIconName: string;
      categoryIconLibrary: string;
    })
  | (TransferWithType & {
      displayNetWorth: number;
      fromAccountName: string;
      toAccountName: string;
    });

export interface GroupedTransaction {
  readonly title: string;
  readonly transactions: readonly DisplayTransaction[];
  readonly groupNetWorth?: number;
  readonly groupTotalIncome: number;
  readonly groupTotalExpense: number;
}

export interface TransactionListReadModel {
  readonly futureTransactions: readonly Transaction[];
  readonly displayedItems: readonly DisplayTransaction[];
}

export interface GetTransactionListReadModelInput {
  readonly userId: string;
  readonly period: GroupingPeriod;
  readonly selectedTypes: readonly TransactionTypeFilter[];
  readonly searchQuery: string;
}

export interface BuildTransactionGroupsInput extends TransactionListReadModel {
  readonly totalNetWorth: number | null;
  readonly latestRates: MarketRate | null;
  readonly preferredCurrency: CurrencyType;
  readonly period: GroupingPeriod;
  readonly searchQuery: string;
}

export interface TransactionListInvalidationInput {
  readonly userId: string;
}

export interface TransactionListInvalidationQueries {
  readonly transactionsQuery: Query<Transaction>;
  readonly transfersQuery: Query<Transfer>;
}

export const TRANSACTION_LIST_TRANSACTION_COLUMNS = [
  "category_id",
  "amount",
  "type",
  "note",
  "counterparty",
  "account_id",
  "date",
] as const;

export const TRANSACTION_LIST_TRANSFER_COLUMNS = [
  "amount",
  "from_account_id",
  "to_account_id",
  "notes",
  "date",
] as const;

export function observeTransactionListInvalidationSources(
  input: TransactionListInvalidationInput
): TransactionListInvalidationQueries {
  return {
    transactionsQuery: queryOwned(transactionsCollection(), input.userId),
    transfersQuery: queryOwned(transfersCollection(), input.userId),
  };
}

export async function getTransactionListReadModel(
  input: GetTransactionListReadModelInput
): Promise<TransactionListReadModel> {
  const { startDate, endDate } = getPeriodDateRange(input.period);
  const futureTransactions = await queryOwned(
    transactionsCollection(),
    input.userId,
    Q.where("deleted", false),
    Q.where("date", Q.gt(endDate)),
    Q.sortBy("date", Q.desc)
  ).fetch();
  const displayTransfers = await fetchDisplayTransfers(
    input,
    startDate,
    endDate
  );
  const displayTransactions = await fetchDisplayTransactions(
    input,
    startDate,
    endDate
  );
  const displayedItems = await enrichDisplayItems(
    input.userId,
    combineDisplayItems(displayTransactions, displayTransfers)
  );

  return {
    futureTransactions,
    displayedItems: filterDisplayItems(displayedItems, input.searchQuery),
  };
}

export function buildTransactionGroups(
  input: BuildTransactionGroupsInput
): GroupedTransaction[] {
  if (input.totalNetWorth === null) {
    return [];
  }

  const toPreferred = (amount: number, currency: CurrencyType): number =>
    convertCurrency(
      amount,
      currency,
      input.preferredCurrency,
      input.latestRates
    );
  const getSignedAmount = (item: DisplayTransaction): number => {
    if (item._type !== "transaction") {
      return 0;
    }

    const preferredAmount = toPreferred(item.amount, item.currency);
    if (item.isIncome) return preferredAmount;
    if (item.isExpense) return -preferredAmount;
    return 0;
  };
  let anchorNetWorth = input.totalNetWorth;

  for (const transaction of input.futureTransactions) {
    const preferredAmount = toPreferred(
      transaction.amount,
      transaction.currency
    );
    if (transaction.isIncome) anchorNetWorth -= preferredAmount;
    if (transaction.isExpense) anchorNetWorth += preferredAmount;
  }

  let runningNetWorth = anchorNetWorth;
  const processedItems = input.displayedItems.map((item) => {
    const itemWithNetWorth = Object.create(item) as DisplayTransaction;
    Object.assign(itemWithNetWorth, { displayNetWorth: runningNetWorth });
    runningNetWorth -= getSignedAmount(item);
    return itemWithNetWorth;
  });

  return groupDisplayItems(processedItems, input);
}

function transactionsCollection(): ReturnType<
  typeof database.get<Transaction>
> {
  return database.get<Transaction>("transactions");
}

function transfersCollection(): ReturnType<typeof database.get<Transfer>> {
  return database.get<Transfer>("transfers");
}

function accountsCollection(): ReturnType<typeof database.get<Account>> {
  return database.get<Account>("accounts");
}

function getPeriodDateRange(period: GroupingPeriod): {
  readonly startDate: number;
  readonly endDate: number;
} {
  const now = new Date();

  switch (period) {
    case "today":
      return { startDate: getStartOfDay(now), endDate: getEndOfDay(now) };
    case "this_week":
      return { startDate: getStartOfWeek(now), endDate: getEndOfWeek(now) };
    case "last_week": {
      const lastWeek = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - 7
      );
      return {
        startDate: getStartOfWeek(lastWeek),
        endDate: getEndOfWeek(lastWeek),
      };
    }
    case "this_month":
      return { startDate: getStartOfMonth(now), endDate: getEndOfMonth(now) };
    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return {
        startDate: getStartOfMonth(lastMonth),
        endDate: getEndOfMonth(lastMonth),
      };
    }
    case "six_months": {
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      return {
        startDate: getStartOfMonth(sixMonthsAgo),
        endDate: getEndOfDay(now),
      };
    }
    case "this_year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.getTime(), endDate: getEndOfDay(now) };
    }
    case "all_time":
      return { startDate: 0, endDate: Date.now() };
    default:
      return { startDate: 0, endDate: Date.now() };
  }
}

async function fetchDisplayTransactions(
  input: GetTransactionListReadModelInput,
  startDate: number,
  endDate: number
): Promise<Transaction[]> {
  const includesIncome = input.selectedTypes.includes("Income");
  const includesExpense = input.selectedTypes.includes("Expense");
  const includesAll = input.selectedTypes.includes("All");

  if (!includesAll && !includesIncome && !includesExpense) {
    return [];
  }

  const conditions = [
    Q.where("deleted", false),
    Q.where("date", Q.gte(startDate)),
    Q.where("date", Q.lte(endDate)),
    Q.sortBy("date", Q.desc),
  ];

  if (!includesAll && includesIncome !== includesExpense) {
    conditions.push(Q.where("type", includesIncome ? "INCOME" : "EXPENSE"));
  }

  return queryOwned(
    transactionsCollection(),
    input.userId,
    ...conditions
  ).fetch();
}

async function fetchDisplayTransfers(
  input: GetTransactionListReadModelInput,
  startDate: number,
  endDate: number
): Promise<Transfer[]> {
  const includesTransfer = input.selectedTypes.includes("Transfer");
  const includesAll = input.selectedTypes.includes("All");

  if (!includesTransfer && !includesAll) {
    return [];
  }

  return queryOwned(
    transfersCollection(),
    input.userId,
    Q.where("deleted", false),
    Q.where("date", Q.gte(startDate)),
    Q.where("date", Q.lte(endDate)),
    Q.sortBy("date", Q.desc)
  ).fetch();
}

function combineDisplayItems(
  transactions: readonly Transaction[],
  transfers: readonly Transfer[]
): Array<TransactionWithType | TransferWithType> {
  return [
    ...transactions.map(
      (transaction) =>
        Object.assign(Object.create(transaction), {
          _type: "transaction" as const,
        }) as TransactionWithType
    ),
    ...transfers.map(
      (transfer) =>
        Object.assign(Object.create(transfer), {
          _type: "transfer" as const,
        }) as TransferWithType
    ),
  ].sort((a, b) => b.dateInMs - a.dateInMs);
}

async function enrichDisplayItems(
  userId: string,
  items: ReadonlyArray<TransactionWithType | TransferWithType>
): Promise<DisplayTransaction[]> {
  const ownedAccounts = await queryOwned(
    accountsCollection(),
    userId,
    Q.where("deleted", Q.notEq(true))
  ).fetch();
  const displayNames = buildAccountDisplayNames(ownedAccounts);
  const resolveName = (account: {
    readonly id?: string;
    readonly name: string;
  }): string =>
    (account.id !== undefined ? displayNames.get(account.id) : undefined) ??
    account.name;

  return Promise.all(
    items.map(async (item): Promise<DisplayTransaction> => {
      if (item._type === "transaction") {
        const account = await item.account.fetch().catch(() => ({
          id: undefined,
          name: "Unknown",
        }));
        const category = await item.category.fetch().catch(() => null);
        const iconConfig = (
          category as {
            readonly iconConfig?: {
              readonly iconName: string;
              readonly iconLibrary: string;
            };
          } | null
        )?.iconConfig;

        return Object.assign(Object.create(item), {
          accountName: resolveName(account),
          categoryName: category?.displayName ?? "Unknown",
          categoryIconName: iconConfig?.iconName ?? "help-circle",
          categoryIconLibrary: iconConfig?.iconLibrary ?? "Ionicons",
        }) as DisplayTransaction;
      }

      const fromAccount = await item.fromAccount.fetch().catch(() => ({
        id: undefined,
        name: "Unknown",
      }));
      const toAccount = await item.toAccount.fetch().catch(() => ({
        id: undefined,
        name: "Unknown",
      }));

      return Object.assign(Object.create(item), {
        fromAccountName: resolveName(fromAccount),
        toAccountName: resolveName(toAccount),
      }) as DisplayTransaction;
    })
  );
}

function filterDisplayItems(
  items: readonly DisplayTransaction[],
  searchQuery: string
): DisplayTransaction[] {
  if (!searchQuery) {
    return [...items];
  }

  const lowerQuery = searchQuery.toLowerCase();
  return items.filter((item) => {
    if (item._type === "transaction") {
      return (
        (item.note && item.note.toLowerCase().includes(lowerQuery)) ||
        (item.counterparty &&
          item.counterparty.toLowerCase().includes(lowerQuery)) ||
        item.categoryName.toLowerCase().includes(lowerQuery) ||
        item.amount.toString().includes(lowerQuery)
      );
    }

    return (
      (item.notes && item.notes.toLowerCase().includes(lowerQuery)) ||
      item.amount.toString().includes(lowerQuery)
    );
  });
}

function groupDisplayItems(
  items: readonly DisplayTransaction[],
  input: BuildTransactionGroupsInput
): GroupedTransaction[] {
  const groups: GroupedTransaction[] = [];
  let currentGroup: {
    title: string;
    transactions: DisplayTransaction[];
    groupNetWorth?: number;
    groupTotalIncome: number;
    groupTotalExpense: number;
  } | null = null;

  for (const item of items) {
    const groupTitle = getGroupKey(item.date, input);

    if (!currentGroup || currentGroup.title !== groupTitle) {
      if (currentGroup) groups.push(currentGroup);
      currentGroup = {
        title: groupTitle,
        transactions: [],
        groupNetWorth: item.displayNetWorth,
        groupTotalIncome: 0,
        groupTotalExpense: 0,
      };
    }

    currentGroup.transactions.push(item);
    if (item._type === "transaction") {
      const preferredAmount = convertCurrency(
        item.amount,
        item.currency,
        input.preferredCurrency,
        input.latestRates
      );
      if (item.isIncome) {
        currentGroup.groupTotalIncome += preferredAmount;
      } else if (item.isExpense) {
        currentGroup.groupTotalExpense += preferredAmount;
      }
    }
  }

  if (currentGroup) groups.push(currentGroup);
  return groups;
}

function getGroupKey(
  date: Date,
  input: Pick<BuildTransactionGroupsInput, "period" | "searchQuery">
): string {
  if (input.searchQuery) return formatDate(date, "MMM d, yyyy");

  if (input.period === "this_week" || input.period === "last_week") {
    if (isSameDay(date, new Date())) return "Today";
    if (isSameDay(date, new Date(Date.now() - 86400000))) return "Yesterday";
    return formatDate(date, "EEEE, MMM d");
  }

  if (input.period === "this_month" || input.period === "last_month") {
    const start = new Date(getStartOfWeek(date));
    const end = new Date(getEndOfWeek(date));
    return `${formatDate(start, "MMM d")} - ${formatDate(end, "MMM d")}`;
  }

  if (input.period === "six_months" || input.period === "this_year") {
    return formatDate(date, "MMMM yyyy");
  }

  return formatDate(date, "MMM d, yyyy");
}
