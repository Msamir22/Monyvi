import { palette } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface FormRowProps {
  readonly testID: string;
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly label: string;
  readonly value: string;
  readonly iconColor: string;
  readonly iconContainerClassName: string;
  readonly onPress: () => void;
}

export function FormRow({
  testID,
  icon,
  label,
  value,
  iconColor,
  iconContainerClassName,
  onPress,
}: FormRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      testID={testID}
      className="flex-row items-center px-4 py-3"
      onPress={onPress}
    >
      <View
        testID="recurring-payment-schedule-icon"
        className={`w-8 h-8 rounded-xl items-center justify-center me-3 ${iconContainerClassName}`}
      >
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-semibold text-text-muted dark:text-text-muted-dark">
          {label}
        </Text>
        <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.slate[400]} />
    </TouchableOpacity>
  );
}

export function Divider({
  index,
}: {
  readonly index: number;
}): React.JSX.Element {
  return (
    <View
      testID={`recurring-payment-divider-${index}`}
      className="h-px mx-4 bg-slate-200 dark:bg-slate-700"
    />
  );
}

export function ErrorText({
  children,
}: {
  readonly children: string;
}): React.JSX.Element {
  return <Text className="input-error">{children}</Text>;
}
