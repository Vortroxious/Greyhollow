import { useEffect, useRef } from "react";
import { Chrome } from "@/components/game/Chrome";
import { Engine } from "@/game/engine";
import { useGame } from "@/game/store";

export function GameView() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let dead = false;
    let engine: Engine | null = null;
    void Engine.create(canvas)
      .then((created) => {
        if (dead) {
          created.dispose();
          return;
        }
        engine = created;
        engineRef.current = created;
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : "WebGL failed to start.";
        useGame.setState({ screen: "error", bootError: message, ready: true });
      });
    return () => {
      dead = true;
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 touch-none overflow-hidden bg-bg font-sans text-fg select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div className="vignette pointer-events-none absolute inset-0" />
      <Chrome engineRef={engineRef} />
    </div>
  );
}
