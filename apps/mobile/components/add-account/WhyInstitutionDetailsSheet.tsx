import { Ionicons } from "@expo/vector-icons";
import { useEffect, type JSX } from "react";
import {
  BackHandler,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import { palette } from "@/constants/colors";

interface WhyInstitutionDetailsSheetProps {
  readonly visible: boolean;
  readonly onClose: () => void;
}

export function WhyInstitutionDetailsSheet({
  visible,
  onClose,
}: WhyInstitutionDetailsSheetProps): JSX.Element {
  const { t } = useTranslation("accounts");

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onClose();
        return true;
      }
    );

    return () => subscription.remove();
  }, [visible, onClose]);

  if (!visible) {
    return <></>;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        testID="provider-details-tooltip-backdrop"
        onPress={onClose}
        className="flex-1 justify-center px-6"
        // eslint-disable-next-line react-native/no-inline-styles
        style={{ backgroundColor: `${palette.slate[900]}33` }}
      >
        <Pressable
          onPress={(event) => event.stopPropagation()}
          className="w-full max-w-[320px] self-center rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        >
          <View className="flex-row items-start">
            <View className="me-2 h-7 w-7 items-center justify-center rounded-lg bg-nileGreen-50 dark:bg-nileGreen-900/20">
              <Ionicons
                name="information-circle-outline"
                size={14}
                color={palette.nileGreen[500]}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-slate-900 dark:text-white">
                {t("why_provider_details_title")}
              </Text>
              <Text className="mt-1 text-xs font-medium leading-4 text-slate-500 dark:text-slate-400">
                {t("why_provider_details_body")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            className="mt-3 self-end rounded-lg bg-nileGreen-500 px-3 py-2"
          >
            <Text className="text-xs font-bold text-white">{t("got_it")}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
