import { LinearGradient } from "expo-linear-gradient";
import type { JSX, ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/context/ThemeContext";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  className?: string;
}

export function GradientBackground({
  children,
  style,
  className,
}: Props): JSX.Element {
  const { theme, isDark } = useTheme();

  if (isDark && theme.backgroundGradient) {
    return (
      <LinearGradient
        colors={theme.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={style}
        className={`flex-1 ${className || ""}`}
      >
        <SafeAreaView className="flex-1" edges={["top"]}>
          {children}
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <View
      style={[{ backgroundColor: theme.background }, style]}
      className={`flex-1 ${className || ""}`}
    >
      <SafeAreaView className="flex-1" edges={["top"]}>
        {children}
      </SafeAreaView>
    </View>
  );
}
