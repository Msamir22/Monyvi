const MAX_IDENTIFIER_PREFIX_LENGTH = 6;
const MIN_HIDDEN_IDENTIFIER_SUFFIX_LENGTH = 4;

export function redactIdentifierForLog(
  value: string | null | undefined
): string {
  const normalized = value?.trim();

  if (!normalized) {
    return "[redacted:missing]";
  }

  const prefixLength =
    normalized.length <= MIN_HIDDEN_IDENTIFIER_SUFFIX_LENGTH
      ? 0
      : Math.min(
          MAX_IDENTIFIER_PREFIX_LENGTH,
          normalized.length - MIN_HIDDEN_IDENTIFIER_SUFFIX_LENGTH
        );
  const prefix =
    prefixLength > 0 ? `prefix=${normalized.slice(0, prefixLength)};` : "";

  return `[redacted:${prefix}length=${normalized.length}]`;
}
