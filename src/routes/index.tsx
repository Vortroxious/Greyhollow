import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ComponentType } from "react";
import { BootScreen } from "@/components/game/BootScreen";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [View, setView] = useState<ComponentType | null>(null);
  useEffect(() => {
    let dead = false;
    void import("@/game/GameView").then((mod) => {
      if (!dead) setView(() => mod.GameView);
    });
    return () => {
      dead = true;
    };
  }, []);
  if (!View) return <BootScreen label="Unsealing the parish records…" />;
  return <View />;
}