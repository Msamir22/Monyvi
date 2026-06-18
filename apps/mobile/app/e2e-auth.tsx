import { isE2eTestMode } from "@/config/e2e-test-config";
import { signInWithEmail } from "@/services/auth-service";
import { logger } from "@/utils/logger";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default function E2eAuthRoute(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string | string[];
    password?: string | string[];
  }>();
  const email = getSingleParam(params.email);
  const password = getSingleParam(params.password);

  useEffect(() => {
    if (!isE2eTestMode()) {
      router.replace("/auth");
      return;
    }

    if (!email || !password) {
      logger.warn("e2eAuth.missingCredentials");
      router.replace("/auth");
      return;
    }

    let isCancelled = false;

    signInWithEmail(email, password)
      .then((result) => {
        if (isCancelled) {
          return;
        }

        if (result.error) {
          logger.error("e2eAuth.signIn.failed", {
            message: result.error.message,
          });
          router.replace("/auth");
          return;
        }

        router.replace("/");
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        logger.error(
          "e2eAuth.signIn.unexpected",
          error instanceof Error ? { message: error.message } : { error }
        );
        router.replace("/auth");
      });

    return () => {
      isCancelled = true;
    };
  }, [email, password, router]);

  return <View className="flex-1 bg-background dark:bg-background-dark" />;
}
