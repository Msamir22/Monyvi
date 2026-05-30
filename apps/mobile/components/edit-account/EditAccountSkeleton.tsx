/**
 * EditAccountSkeleton — content-loading placeholder for edit-account.tsx.
 *
 * Replaces the previous `<ActivityIndicator>` per
 * `.claude/rules/skeleton-loading.md`. Mirrors the form layout users
 * will see once the account hydrates so the transition feels stable.
 *
 * Layout reference: `app/edit-account.tsx` EditAccountForm render.
 *
 * @module EditAccountSkeleton
 */

import { Skeleton } from "@/components/ui/Skeleton";
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** A label + field row placeholder. */
function FormRowSkeleton(): React.JSX.Element {
  return (
    <View className="mb-5">
      <Skeleton width={100} height={12} borderRadius={4} />
      <View className="mt-2">
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>
    </View>
  );
}

/**
 * Form-shaped skeleton for the Edit Account screen.
 */
export function EditAccountSkeleton(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-background dark:bg-background-dark"
      style={{ paddingTop: insets.top }}
    >
      {/* Header strip placeholder */}
      <View className="flex-row items-center justify-between px-5 py-4">
        <Skeleton width={32} height={32} borderRadius={16} />
        <Skeleton width={120} height={20} borderRadius={4} />
        <Skeleton width={56} height={20} borderRadius={4} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4">
          {/* Compact account preview card */}
          <View className="mb-6 h-36 flex-row items-center rounded-[40px] bg-nileGreen-700 px-6">
            <Skeleton width={72} height={72} borderRadius={22} />
            <View className="ms-4 flex-1">
              <Skeleton width="72%" height={22} borderRadius={5} />
              <View className="mt-3">
                <Skeleton width="45%" height={14} borderRadius={4} />
              </View>
            </View>
            <View className="items-end">
              <Skeleton width={48} height={14} borderRadius={4} />
              <View className="mt-3">
                <Skeleton width={84} height={24} borderRadius={5} />
              </View>
            </View>
          </View>

          {/* Account type selector skeleton */}
          <View className="mb-5">
            <Skeleton width={120} height={12} borderRadius={4} />
            <View className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
              <Skeleton width="100%" height={52} borderRadius={0} />
              <View className="h-px bg-slate-100 dark:bg-slate-700" />
              <Skeleton width="100%" height={52} borderRadius={0} />
              <View className="h-px bg-slate-100 dark:bg-slate-700" />
              <Skeleton width="100%" height={52} borderRadius={0} />
            </View>
          </View>

          <FormRowSkeleton />
          <FormRowSkeleton />
          <FormRowSkeleton />
          <FormRowSkeleton />

          {/* Default toggle row */}
          <View className="flex-row items-center justify-between py-4 px-1 mb-3">
            <View className="flex-row items-center flex-1">
              <Skeleton width={22} height={22} borderRadius={11} />
              <View className="ms-3 flex-1">
                <Skeleton width={130} height={16} borderRadius={4} />
                <View className="mt-1.5">
                  <Skeleton width="80%" height={12} borderRadius={4} />
                </View>
              </View>
            </View>
            <Skeleton width={48} height={28} borderRadius={14} />
          </View>

          {/* Danger zone */}
          <View className="mt-8 rounded-2xl border border-red-200 dark:border-red-800/30 bg-red-50/50 dark:bg-red-900/10 p-4">
            <Skeleton width={110} height={14} borderRadius={4} />
            <View className="mt-2">
              <Skeleton width="90%" height={14} borderRadius={4} />
            </View>
            <View className="mt-4">
              <Skeleton width="100%" height={44} borderRadius={12} />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
