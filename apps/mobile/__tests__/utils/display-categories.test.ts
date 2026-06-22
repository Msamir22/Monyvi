import type { Category } from "@monyvi/db";

import { dedupeSystemCategoriesForDisplay } from "@/utils/display-categories";

function category(overrides: Partial<Category>): Category {
  return Object.assign(
    {
      id: "category-1",
      userId: null,
      parentId: null,
      systemName: "shopping",
      displayName: "Shopping",
      level: 1,
      type: "EXPENSE",
      sortOrder: 1,
    },
    overrides
  ) as Category;
}

describe("dedupeSystemCategoriesForDisplay", () => {
  it("dedupes duplicated shared system categories under the same parent", () => {
    const firstClothes = category({
      id: "clothes-1",
      parentId: "shopping",
      systemName: "clothes",
      displayName: "Clothes",
      level: 2,
      sortOrder: 1,
    });
    const duplicateClothes = category({
      id: "clothes-2",
      parentId: "shopping",
      systemName: "clothes",
      displayName: "Clothes",
      level: 2,
      sortOrder: 1,
    });
    const footwear = category({
      id: "footwear",
      parentId: "shopping",
      systemName: "footwear",
      displayName: "Footwear",
      level: 2,
      sortOrder: 2,
    });

    expect(
      dedupeSystemCategoriesForDisplay([
        firstClothes,
        duplicateClothes,
        footwear,
      ])
    ).toEqual([firstClothes, footwear]);
  });

  it("keeps user-owned categories even when their labels match system categories", () => {
    const systemClothes = category({
      id: "system-clothes",
      parentId: "shopping",
      systemName: "clothes",
      displayName: "Clothes",
      level: 2,
    });
    const customClothes = category({
      id: "custom-clothes",
      userId: "user-1",
      parentId: "shopping",
      systemName: "clothes",
      displayName: "Clothes",
      level: 2,
    });

    expect(
      dedupeSystemCategoriesForDisplay([systemClothes, customClothes])
    ).toEqual([systemClothes, customClothes]);
  });
});
