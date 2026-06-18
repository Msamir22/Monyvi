import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type JSX } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { useTranslation } from "react-i18next";

import { palette } from "@/constants/colors";

interface SenderChipsFieldProps {
  readonly value: readonly string[];
  readonly verifiedSenders?: readonly string[];
  readonly onChange: (value: readonly string[]) => void;
  readonly onInputFocus?: () => void;
}

function normalizeSenderName(value: string): string {
  return value.trim().toLowerCase();
}

export function SenderChipsField({
  value,
  verifiedSenders = value,
  onChange,
  onInputFocus,
}: SenderChipsFieldProps): JSX.Element {
  const { t } = useTranslation("accounts");
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const normalizedVerifiedSenders = useMemo(
    () => new Set(verifiedSenders.map(normalizeSenderName)),
    [verifiedSenders]
  );
  const hasPendingUnverifiedSender = useMemo(
    () =>
      value.some(
        (sender) => !normalizedVerifiedSenders.has(normalizeSenderName(sender))
      ),
    [normalizedVerifiedSenders, value]
  );

  const addSender = (): void => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    const normalized = normalizeSenderName(trimmed);
    if (value.some((sender) => normalizeSenderName(sender) === normalized)) {
      setError(t("sender_duplicate_error"));
      return;
    }

    setError(null);
    onChange([...value, trimmed]);
    setInputValue("");
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2">
        {value.map((sender) => {
          const isVerified = normalizedVerifiedSenders.has(
            normalizeSenderName(sender)
          );
          return (
            <View
              key={sender}
              className="flex-row items-center rounded-full bg-slate-100 px-3 py-2 dark:bg-slate-700"
            >
              <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
                {sender}
              </Text>
              {!isVerified ? (
                <Text className="ms-2 text-xs font-bold text-amber-600">
                  {t("sender_unverified")}
                </Text>
              ) : null}
              <TouchableOpacity
                accessibilityLabel={t("sender_remove_accessibility", {
                  sender,
                })}
                accessibilityRole="button"
                onPress={() =>
                  onChange(
                    value.filter(
                      (existing) =>
                        normalizeSenderName(existing) !==
                        normalizeSenderName(sender)
                    )
                  )
                }
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="ms-2 h-5 w-5 items-center justify-center rounded-full"
              >
                <Ionicons name="close" size={14} color={palette.slate[500]} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <View className="mt-3 flex-row items-center gap-2">
        <TextInput
          placeholder={t("sender_add_placeholder")}
          value={inputValue}
          onChangeText={setInputValue}
          onFocus={onInputFocus}
          testID="sms-sender-input"
          placeholderTextColor={palette.slate[400]}
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-text-primary dark:border-slate-700 dark:bg-slate-800 dark:text-text-primary-dark"
        />
        <TouchableOpacity
          accessibilityLabel={t("sender_add_accessibility")}
          testID="sms-sender-add"
          onPress={addSender}
          className="rounded-xl bg-nileGreen-500 px-4 py-3"
        >
          <Text className="font-bold text-white">{t("sender_add_action")}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text className="mt-2 text-xs font-bold text-red-600">{error}</Text>
      ) : null}
      {hasPendingUnverifiedSender ? (
        <Text className="mt-2 text-xs font-bold text-amber-600">
          {t("sender_unverified")}
        </Text>
      ) : null}
    </View>
  );
}
