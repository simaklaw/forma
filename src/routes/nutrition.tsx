import { createFileRoute } from "@tanstack/react-router";
import { OnboardingScreen } from "@/features/onboarding";
import { NutritionScreen } from "@/features/nutrition";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/nutrition")({ component: Page });

function Page() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  return onboarded ? <NutritionScreen /> : <OnboardingScreen />;
}
