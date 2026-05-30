import { Ionicons } from "@expo/vector-icons";
import { useEffect, type JSX } from "react";
import {
  BackHandler,
  Modal,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
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
      <TouchableWithoutFeedback onPress={onClose}>
        <View
          testID="provider-details-tooltip-backdrop"
          className="flex-1 justify-center bg-black/20 px-6"
        >
          <TouchableWithoutFeedback>
            <View className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <View className="flex-row items-start">
                <View className="me-3 h-8 w-8 items-center justify-center rounded-xl bg-nileGreen-50 dark:bg-nileGreen-900/20">
                  <Ionicons
                    name="information-circle-outline"
                    size={17}
                    color={palette.nileGreen[500]}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-slate-900 dark:text-white">
                    {t("why_provider_details_title")}
                  </Text>
                  <Text className="mt-1 text-sm font-medium leading-5 text-slate-500 dark:text-slate-400">
                    {t("why_provider_details_body")}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                accessibilityRole="button"
                className="mt-4 self-end rounded-xl bg-nileGreen-500 px-4 py-2.5"
              >
                <Text className="text-sm font-bold text-white">
                  {t("got_it")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
