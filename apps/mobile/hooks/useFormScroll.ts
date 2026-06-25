import React, { useCallback, useEffect, useRef } from "react";
import {
  Keyboard,
  ScrollView,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

const DEFAULT_FIELD_GAP = 24;

interface UseFormScrollOptions {
  readonly bottomInset: number;
  readonly fieldGap?: number;
}

interface UseFormScrollResult<TField extends string> {
  readonly scrollViewRef: React.RefObject<ScrollView | null>;
  readonly getFieldRef: (field: TField) => React.RefObject<View | null>;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  readonly scrollToField: (field: TField) => void;
  readonly scrollToFirstError: (
    errors: Partial<Record<TField, unknown>>,
    fieldOrder: readonly TField[]
  ) => TField | null;
}

export function useFormScroll<TField extends string>({
  bottomInset,
  fieldGap = DEFAULT_FIELD_GAP,
}: UseFormScrollOptions): UseFormScrollResult<TField> {
  const { height: windowHeight } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollYRef = useRef(0);
  const keyboardHeightRef = useRef(0);
  const activeKeyboardTargetRef = useRef<React.RefObject<View | null> | null>(
    null
  );
  const fieldRefsRef = useRef(new Map<TField, React.RefObject<View | null>>());

  const getFieldRef = useCallback((field: TField) => {
    const existingRef = fieldRefsRef.current.get(field);

    if (existingRef) return existingRef;

    const fieldRef = React.createRef<View>();
    fieldRefsRef.current.set(field, fieldRef);
    return fieldRef;
  }, []);

  const scrollToRef = useCallback(
    (targetRef: React.RefObject<View | null>): void => {
      activeKeyboardTargetRef.current = targetRef;

      requestAnimationFrame(() => {
        targetRef.current?.measureInWindow((_x, y, _width, height) => {
          const visibleBottom =
            windowHeight - keyboardHeightRef.current - bottomInset - fieldGap;
          const overflow = y + height - visibleBottom;

          if (overflow > 0) {
            scrollViewRef.current?.scrollTo({
              y: currentScrollYRef.current + overflow,
              animated: true,
            });
          }
        });
      });
    },
    [bottomInset, fieldGap, windowHeight]
  );

  const scrollToField = useCallback(
    (field: TField): void => {
      scrollToRef(getFieldRef(field));
    },
    [getFieldRef, scrollToRef]
  );

  const scrollToFirstError = useCallback(
    (
      errors: Partial<Record<TField, unknown>>,
      fieldOrder: readonly TField[]
    ): TField | null => {
      const firstErrorField =
        fieldOrder.find((field) => Boolean(errors[field])) ?? null;

      if (firstErrorField) {
        scrollToField(firstErrorField);
      }

      return firstErrorField;
    },
    [scrollToField]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
      currentScrollYRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardHeightRef.current = event.endCoordinates.height;

      if (activeKeyboardTargetRef.current) {
        scrollToRef(activeKeyboardTargetRef.current);
      }
    });
    const keyboardDidHide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardHeightRef.current = 0;
      activeKeyboardTargetRef.current = null;
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, [scrollToRef]);

  return {
    scrollViewRef,
    getFieldRef,
    onScroll,
    scrollToField,
    scrollToFirstError,
  };
}
