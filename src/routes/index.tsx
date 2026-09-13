import { createFileRoute } from "@tanstack/react-router";
import { OnboardingScreen } from "@/features/onboarding";
import { TodayScreen } from "@/features/today";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  return onboarded ? <TodayScreen /> : <OnboardingScreen />;
}
