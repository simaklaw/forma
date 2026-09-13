import { createFileRoute } from "@tanstack/react-router";
import { PlayerScreen } from "@/features/player";

export const Route = createFileRoute("/play/$planId")({
  component: Page,
});

function Page() {
  const { planId } = Route.useParams();
  return <PlayerScreen planId={planId} />;
}
