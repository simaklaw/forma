import { createFileRoute } from "@tanstack/react-router";
import { CoachScreen } from "@/features/coach";
import { OnboardingScreen } from "@/features/onboarding";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/coach")({ component: Page });

function Page() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  return onboarded ? <CoachScreen /> : <OnboardingScreen />;
}
