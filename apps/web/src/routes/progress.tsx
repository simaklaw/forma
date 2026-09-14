import { createFileRoute } from "@tanstack/react-router";
import { OnboardingScreen } from "@/features/onboarding";
import { ProgressScreen } from "@/features/progress";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/progress")({ component: Page });

function Page() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  return onboarded ? <ProgressScreen /> : <OnboardingScreen />;
}
