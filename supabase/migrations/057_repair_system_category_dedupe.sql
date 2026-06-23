-- Re-run the corrected system category dedupe logic for databases that already
-- applied migration 056 before child categories were grouped by canonical parent.

ALTER TABLE public.user_category_settings
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_category_settings
  DROP CONSTRAINT IF EXISTS user_category_settings_user_id_category_id_key;

DROP INDEX IF EXISTS public.idx_user_category_settings_unique_active;
DROP INDEX IF EXISTS public.idx_categories_unique_active_system_root_typed;
DROP INDEX IF EXISTS public.idx_categories_unique_active_system_child_typed;
DROP INDEX IF EXISTS public.idx_categories_unique_active_system_root_untyped;
DROP INDEX IF EXISTS public.idx_categories_unique_active_system_child_untyped;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_root;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_child;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_root_typed;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_root_untyped;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_child_typed;
DROP INDEX IF EXISTS public.idx_categories_unique_active_custom_child_untyped;

CREATE TEMP TABLE duplicate_system_categories_to_merge ON COMMIT DROP AS
WITH root_candidates AS (
  SELECT
    id,
    system_name,
    level,
    type,
    created_at,
    NULL::uuid AS canonical_parent_id
  FROM public.categories
  WHERE user_id IS NULL
    AND is_system = true
    AND deleted = false
    AND parent_id IS NULL
),
root_ranked AS (
  SELECT
    id AS duplicate_id,
    first_value(id) OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM root_candidates
),
level2_candidates AS (
  SELECT
    categories.id,
    categories.system_name,
    categories.level,
    categories.type,
    categories.created_at,
    coalesce(root_parent.canonical_id, categories.parent_id) AS canonical_parent_id
  FROM public.categories
  LEFT JOIN root_ranked AS root_parent
    ON root_parent.duplicate_id = categories.parent_id
  WHERE categories.user_id IS NULL
    AND categories.is_system = true
    AND categories.deleted = false
    AND categories.parent_id IS NOT NULL
    AND categories.level = 2
),
level2_ranked AS (
  SELECT
    id AS duplicate_id,
    first_value(id) OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM level2_candidates
),
level3_candidates AS (
  SELECT
    categories.id,
    categories.system_name,
    categories.level,
    categories.type,
    categories.created_at,
    coalesce(level2_parent.canonical_id, categories.parent_id) AS canonical_parent_id
  FROM public.categories
  LEFT JOIN level2_ranked AS level2_parent
    ON level2_parent.duplicate_id = categories.parent_id
  WHERE categories.user_id IS NULL
    AND categories.is_system = true
    AND categories.deleted = false
    AND categories.parent_id IS NOT NULL
    AND categories.level = 3
),
level3_ranked AS (
  SELECT
    id AS duplicate_id,
    first_value(id) OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS canonical_id,
    row_number() OVER (
      PARTITION BY canonical_parent_id, system_name, level, type
      ORDER BY created_at ASC, id ASC
    ) AS duplicate_rank
  FROM level3_candidates
),
ranked_system_categories AS (
  SELECT duplicate_id, canonical_id, duplicate_rank
  FROM root_ranked
  UNION ALL
  SELECT duplicate_id, canonical_id, duplicate_rank
  FROM level2_ranked
  UNION ALL
  SELECT duplicate_id, canonical_id, duplicate_rank
  FROM level3_ranked
)
SELECT duplicate_id, canonical_id
FROM ranked_system_categories
WHERE duplicate_rank > 1;

CREATE TEMP TABLE user_category_settings_to_merge ON COMMIT DROP AS
WITH duplicate_category_lookup AS (
  SELECT canonical_id AS category_id, canonical_id
  FROM duplicate_system_categories_to_merge
  UNION
  SELECT duplicate_id AS category_id, canonical_id
  FROM duplicate_system_categories_to_merge
),
ranked_settings AS (
  SELECT
    settings.id,
    settings.category_id,
    duplicate_category_lookup.canonical_id,
    row_number() OVER (
      PARTITION BY settings.user_id, duplicate_category_lookup.canonical_id
      ORDER BY
        settings.updated_at DESC,
        settings.created_at DESC,
        (settings.category_id = duplicate_category_lookup.canonical_id) DESC,
        settings.id ASC
    ) AS rank_in_logical_category
  FROM public.user_category_settings AS settings
  INNER JOIN duplicate_category_lookup
    ON duplicate_category_lookup.category_id = settings.category_id
  WHERE settings.deleted = false
)
SELECT id, category_id, canonical_id, rank_in_logical_category
FROM ranked_settings;

UPDATE public.user_category_settings AS settings
SET
  deleted = true,
  updated_at = now()
FROM user_category_settings_to_merge AS settings_to_merge
WHERE settings.id = settings_to_merge.id
  AND settings_to_merge.rank_in_logical_category > 1;

UPDATE public.user_category_settings AS settings
SET
  category_id = settings_to_merge.canonical_id,
  updated_at = now()
FROM user_category_settings_to_merge AS settings_to_merge
WHERE settings.id = settings_to_merge.id
  AND settings_to_merge.rank_in_logical_category = 1
  AND settings.category_id <> settings_to_merge.canonical_id;

UPDATE public.transactions AS transactions
SET
  category_id = duplicate_map.canonical_id,
  updated_at = now()
FROM duplicate_system_categories_to_merge AS duplicate_map
WHERE transactions.category_id = duplicate_map.duplicate_id;

UPDATE public.recurring_payments AS recurring_payments
SET
  category_id = duplicate_map.canonical_id,
  updated_at = now()
FROM duplicate_system_categories_to_merge AS duplicate_map
WHERE recurring_payments.category_id = duplicate_map.duplicate_id;

UPDATE public.budgets AS budgets
SET
  category_id = duplicate_map.canonical_id,
  updated_at = now()
FROM duplicate_system_categories_to_merge AS duplicate_map
WHERE budgets.category_id = duplicate_map.duplicate_id;

UPDATE public.categories AS categories
SET
  parent_id = duplicate_map.canonical_id,
  updated_at = now()
FROM duplicate_system_categories_to_merge AS duplicate_map
WHERE categories.parent_id = duplicate_map.duplicate_id;

UPDATE public.categories AS categories
SET
  deleted = true,
  updated_at = now()
FROM duplicate_system_categories_to_merge AS duplicate_map
WHERE categories.id = duplicate_map.duplicate_id;

DROP INDEX IF EXISTS public.idx_categories_unique_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_system_root_typed
  ON public.categories (system_name, level, type)
  WHERE deleted = false
    AND is_system = true
    AND user_id IS NULL
    AND parent_id IS NULL
    AND type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_system_child_typed
  ON public.categories (parent_id, system_name, level, type)
  WHERE deleted = false
    AND is_system = true
    AND user_id IS NULL
    AND parent_id IS NOT NULL
    AND type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_system_root_untyped
  ON public.categories (system_name, level)
  WHERE deleted = false
    AND is_system = true
    AND user_id IS NULL
    AND parent_id IS NULL
    AND type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_system_child_untyped
  ON public.categories (parent_id, system_name, level)
  WHERE deleted = false
    AND is_system = true
    AND user_id IS NULL
    AND parent_id IS NOT NULL
    AND type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_root_typed
  ON public.categories (user_id, system_name, type)
  WHERE deleted = false
    AND is_system = false
    AND user_id IS NOT NULL
    AND parent_id IS NULL
    AND type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_root_untyped
  ON public.categories (user_id, system_name)
  WHERE deleted = false
    AND is_system = false
    AND user_id IS NOT NULL
    AND parent_id IS NULL
    AND type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_child_typed
  ON public.categories (user_id, parent_id, system_name, type)
  WHERE deleted = false
    AND is_system = false
    AND user_id IS NOT NULL
    AND parent_id IS NOT NULL
    AND type IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_unique_active_custom_child_untyped
  ON public.categories (user_id, parent_id, system_name)
  WHERE deleted = false
    AND is_system = false
    AND user_id IS NOT NULL
    AND parent_id IS NOT NULL
    AND type IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_category_settings_unique_active
  ON public.user_category_settings (user_id, category_id)
  WHERE deleted = false;
