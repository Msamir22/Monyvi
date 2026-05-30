import {
  getSelectableEgyptianInstitutions,
  type SelectableEgyptianInstitutionId,
} from "@monyvi/logic";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type JSX } from "react";
import {
  Image,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

import {
  getEgyptianInstitutionAsset,
  type InstitutionLogo,
} from "@/constants/egyptian-institution-assets";
import { palette } from "@/constants/colors";

type InstitutionPickerType = "bank" | "wallet";

interface InstitutionPickerProps {
  readonly type: InstitutionPickerType;
  readonly selectedInstitutionId: SelectableEgyptianInstitutionId | null;
  readonly isOtherSelected?: boolean;
  readonly onSelectInstitution: (
    institutionId: SelectableEgyptianInstitutionId
  ) => void;
  readonly onSelectOther: () => void;
}

function getInstitutionLabel(institution: {
  readonly shortName: string;
  readonly fullName: string;
  readonly nameAr?: string;
  readonly language: string;
}): string {
  const fullName =
    institution.language.startsWith("ar") && institution.nameAr
      ? institution.nameAr
      : institution.fullName;
  return `${institution.shortName} (${fullName})`;
}

function getPickerTitleKey(type: InstitutionPickerType): string {
  return type === "bank"
    ? "institution_bank_label"
    : "institution_wallet_label";
}

function getPickerPlaceholderKey(type: InstitutionPickerType): string {
  return type === "bank"
    ? "institution_bank_dropdown_placeholder"
    : "institution_wallet_dropdown_placeholder";
}

function getPickerAccessibilityKey(type: InstitutionPickerType): string {
  return type === "bank"
    ? "institution_bank_dropdown_accessibility"
    : "institution_wallet_dropdown_accessibility";
}

function getPickerCloseKey(type: InstitutionPickerType): string {
  return type === "bank"
    ? "institution_bank_dropdown_close"
    : "institution_wallet_dropdown_close";
}

interface InstitutionLogoMarkProps {
  readonly logo: InstitutionLogo;
  readonly accessibilityLabel: string;
}

function InstitutionLogoMark({
  logo,
  accessibilityLabel,
}: InstitutionLogoMarkProps): JSX.Element {
  const InstitutionSvgLogo =
    logo.format === "svg" && typeof logo.source === "function"
      ? logo.source
      : null;

  return (
    <View
      className="me-3 h-11 w-11 items-center justify-center rounded-xl border border-slate-100 bg-white dark:border-slate-700 dark:bg-slate-800"
      accessibilityLabel={accessibilityLabel}
      testID={accessibilityLabel}
    >
      {InstitutionSvgLogo ? (
        <InstitutionSvgLogo width={32} height={32} />
      ) : logo.format === "image" ? (
        <Image source={logo.source} resizeMode="contain" className="h-8 w-8" />
      ) : null}
    </View>
  );
}

export function InstitutionPicker({
  type,
  selectedInstitutionId,
  isOtherSelected = false,
  onSelectInstitution,
  onSelectOther,
}: InstitutionPickerProps): JSX.Element {
  const { t, i18n } = useTranslation("accounts");
  const language = i18n?.language ?? "en";
  const { height: windowHeight } = useWindowDimensions();
  const [searchText, setSearchText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const institutions = getSelectableEgyptianInstitutions(type);
  const normalizedSearch = searchText.trim().toLowerCase();
  const selectedInstitution =
    selectedInstitutionId === null
      ? null
      : (institutions.find(
          (institution) => institution.id === selectedInstitutionId
        ) ?? null);
  const otherLogo = getEgyptianInstitutionAsset(null, type).logo;
  const selectedLabel =
    selectedInstitution === null
      ? isOtherSelected
        ? t("institution_other")
        : null
      : getInstitutionLabel({
          ...selectedInstitution,
          language,
        });
  const selectedLogo =
    selectedInstitution === null
      ? isOtherSelected
        ? otherLogo
        : null
      : getEgyptianInstitutionAsset(selectedInstitution.id, type).logo;

  useEffect(() => {
    setSearchText("");
    setIsDropdownOpen(false);
  }, [type]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0)
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const filteredInstitutions = useMemo(
    () =>
      institutions.filter((institution) => {
        if (!normalizedSearch) {
          return true;
        }

        return (
          institution.shortName.toLowerCase().includes(normalizedSearch) ||
          institution.fullName.toLowerCase().includes(normalizedSearch) ||
          (institution.nameAr?.toLowerCase().includes(normalizedSearch) ??
            false)
        );
      }),
    [institutions, normalizedSearch]
  );
  const pickerTitle = t(getPickerTitleKey(type));
  const sheetMaxHeight =
    keyboardHeight > 0
      ? Math.max(windowHeight - keyboardHeight - 96, windowHeight * 0.38)
      : windowHeight * 0.72;

  return (
    <View className="mb-3">
      <TouchableOpacity
        onPress={() => {
          setSearchText("");
          setIsDropdownOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={t(getPickerAccessibilityKey(type))}
        className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 flex-row items-center">
            {selectedLogo ? (
              <InstitutionLogoMark
                logo={selectedLogo}
                accessibilityLabel={`${selectedLabel ?? ""} logo`}
              />
            ) : null}
            <Text
              className={`flex-1 text-base font-semibold ${
                selectedLabel
                  ? "text-text-primary"
                  : "text-slate-400 dark:text-slate-500"
              }`}
              numberOfLines={2}
            >
              {selectedLabel ?? t(getPickerPlaceholderKey(type))}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={palette.slate[500]} />
        </View>
      </TouchableOpacity>

      <Modal
        visible={isDropdownOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDropdownOpen(false)}>
          <View className="flex-1 justify-end bg-black/60">
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              className="flex-1 justify-end"
            >
              <TouchableWithoutFeedback>
                <View
                  className="rounded-t-3xl bg-white px-5 pb-6 pt-5 dark:bg-slate-900"
                  style={{
                    maxHeight: sheetMaxHeight,
                  }}
                >
                  <View className="mb-4 flex-row items-center justify-between">
                    <Text className="text-lg font-black text-text-primary">
                      {pickerTitle}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsDropdownOpen(false)}
                      accessibilityRole="button"
                      accessibilityLabel={t(getPickerCloseKey(type))}
                      className="p-2"
                    >
                      <Ionicons
                        name="close"
                        size={22}
                        color={palette.slate[500]}
                      />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    placeholder={t("institution_search_placeholder")}
                    value={searchText}
                    onChangeText={setSearchText}
                    className="mb-3 rounded-xl border border-slate-300 px-4 py-3 text-text-primary dark:border-slate-700"
                  />

                  <FlatList
                    data={filteredInstitutions}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                      const label = getInstitutionLabel({
                        ...item,
                        language,
                      });
                      const isSelected = item.id === selectedInstitutionId;
                      const asset = getEgyptianInstitutionAsset(item.id, type);

                      return (
                        <TouchableOpacity
                          onPress={() => {
                            onSelectInstitution(item.id);
                            setIsDropdownOpen(false);
                          }}
                          className={`mb-2 flex-row items-center rounded-xl border px-4 py-3 ${
                            isSelected
                              ? "border-nileGreen-500"
                              : "border-slate-200"
                          }`}
                          accessibilityLabel={label}
                        >
                          <InstitutionLogoMark
                            logo={asset.logo}
                            accessibilityLabel={`${label} logo`}
                          />
                          <Text className="flex-1 font-bold text-text-primary">
                            {label}
                          </Text>
                          {isSelected ? (
                            <Ionicons
                              name="checkmark-circle"
                              size={20}
                              color={palette.nileGreen[600]}
                            />
                          ) : null}
                        </TouchableOpacity>
                      );
                    }}
                    ListFooterComponent={
                      <TouchableOpacity
                        onPress={() => {
                          onSelectOther();
                          setIsDropdownOpen(false);
                        }}
                        className={`mt-1 flex-row items-center rounded-xl border border-dashed px-4 py-3 ${
                          isOtherSelected
                            ? "border-nileGreen-500"
                            : "border-slate-300"
                        }`}
                        accessibilityLabel={t("institution_other")}
                      >
                        <InstitutionLogoMark
                          logo={otherLogo}
                          accessibilityLabel={`${t("institution_other")} logo`}
                        />
                        <Text className="flex-1 font-bold text-text-primary">
                          {t("institution_other")}
                        </Text>
                        {isOtherSelected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={palette.nileGreen[600]}
                          />
                        ) : null}
                      </TouchableOpacity>
                    }
                  />
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
