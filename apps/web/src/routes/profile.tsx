import { createFileRoute } from "@tanstack/react-router";
import { OnboardingScreen } from "@/features/onboarding";
import { ProfileScreen } from "@/features/profile";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({ component: Page });

function Page() {
  const onboarded = useAppStore((s) => s.profile.onboarded);
  return onboarded ? <ProfileScreen /> : <OnboardingScreen />;
}
