const CARD_LAST4_PATTERN = /^\d{1,4}$/;

export function normalizeCardLast4ForStorage(
  value?: string | number | null
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();
  if (!normalized || !CARD_LAST4_PATTERN.test(normalized)) {
    return undefined;
  }

  return Number.parseInt(normalized, 10);
}

export function formatCardLast4ForInput(value?: number | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).padStart(4, "0");
}
