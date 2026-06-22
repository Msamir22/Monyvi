import type { Category } from "@monyvi/db";

export function dedupeSystemCategoriesForDisplay(
  categories: readonly Category[]
): Category[] {
  const seenSystemKeys = new Set<string>();
  const result: Category[] = [];

  for (const category of categories) {
    if (category.userId) {
      result.push(category);
      continue;
    }

    const key = [
      category.parentId ?? "root",
      category.level,
      category.type ?? "none",
      category.systemName,
    ].join(":");

    if (seenSystemKeys.has(key)) {
      continue;
    }

    seenSystemKeys.add(key);
    result.push(category);
  }

  return result;
}
