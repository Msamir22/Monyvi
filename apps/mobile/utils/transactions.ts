/**
 * Format a transaction date for display.
 * Returns relative labels (Today, Yesterday, weekday) for recent dates.
 */
export function formatTransactionDate(date: Date): string {
  const now = new Date();
  const txDate = new Date(date);
  const diffDays = Math.floor(
    (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const timeStr = txDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (diffDays === 0) {
    return `Today, ${timeStr}`;
  }

  if (diffDays === 1) {
    return `Yesterday, ${timeStr}`;
  }

  if (diffDays < 7) {
    const dayName = txDate.toLocaleDateString("en-US", { weekday: "long" });
    return `${dayName}, ${timeStr}`;
  }

  return txDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
