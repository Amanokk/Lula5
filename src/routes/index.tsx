import { createFileRoute } from "@tanstack/react-router";
import { ControlPanel } from "@/components/combat/control-panel";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <ControlPanel />;
}
