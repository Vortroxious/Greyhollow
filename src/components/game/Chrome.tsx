import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Crosshair, Settings } from "lucide-react";
import type { Engine } from "@/game/engine";
import { cellsUsed, COLS, ITEM_INFO, neighborId, ROWS, sizeOf } from "@/game/inventory";
import { useGame } from "@/game/store";
import type { Item, Settings as SettingsState } from "@/game/types";

export function Chrome({ engineRef }: { engineRef: RefObject<Engine | null> }) {
  const screen = useGame((s) => s.screen);
  const ready = useGame((s) => s.ready);

  return (
    <>
      {screen === "boot" && (
        <div className="absolute inset-0 z-30 flex items-end bg-bg/80 p-8">
          <div>
            <p className="font-display text-sm tracking-widest text-muted uppercase">Ashline Bureau</p>
            <h1 className="mt-2 font-display text-4xl">Greyhollow</h1>
            <p className="mt-3 text-muted">{useGame.getState().bootLabel}</p>
          </div>
        </div>
      )}
      {screen === "error" && <ErrorPanel />}
      {screen === "menu" && <MainMenu engineRef={engineRef} ready={ready} />}
      {screen === "settings" && <SettingsPanel engineRef={engineRef} />}
      {screen === "pause" && <PauseMenu engineRef={engineRef} />}
      {screen === "inventory" && <Inventory engineRef={engineRef} />}
      {screen === "dead" && <EndScreen engineRef={engineRef} dead />}
      {screen === "won" && <EndScreen engineRef={engineRef} dead={false} />}
      {(screen === "play" || screen === "pause" || screen === "inventory") && <Hud />}
      {screen === "play" && <TouchControls engineRef={engineRef} />}
    </>
  );
}

function MainMenu({ engineRef, ready }: { engineRef: RefObject<Engine | null>; ready: boolean }) {
  const hasSave = useGame((s) => s.hasSave);
  const act = (fn: (e: Engine) => void) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.unlockAudio();
    fn(engine);
  };
  return (
    <div className="menu-rise pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-12">
      <p className="font-display text-sm tracking-widest text-muted uppercase">Ashline Bureau · Field report 04</p>
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <h1 className="font-display text-5xl text-fg sm:text-7xl">Greyhollow</h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
            The parish went dark three nights ago. You are Mara Voss. The hollowed do not negotiate, and every round
            you fire is one you will not get back.
          </p>
        </div>
        <div className="pointer-events-auto flex w-full max-w-xs flex-col gap-3">
          <MenuButton disabled={!ready} onClick={() => act((e) => e.newGame())}>
            New Game
          </MenuButton>
          <MenuButton disabled={!ready || !hasSave} onClick={() => act((e) => e.continueGame())}>
            Continue
          </MenuButton>
          <MenuButton disabled={!ready} onClick={() => engineRef.current?.openSettings("menu")}>
            Settings
          </MenuButton>
        </div>
      </div>
      <p className="max-w-2xl text-sm text-muted">
        WASD move · mouse aim · click to shoot · R reload · F knife · Space dodge · Shift sprint · E use · Tab pack ·
        Esc pause
      </p>
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  disabled,
}: {
  children: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="border border-line bg-surface/90 px-5 py-3 text-left font-display text-lg text-fg transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  );
}

function Hud() {
  const health = useGame((s) => s.health);
  const stamina = useGame((s) => s.stamina);
  const mag = useGame((s) => s.mag);
  const reserve = useGame((s) => s.reserve);
  const weapon = useGame((s) => s.weapon);
  const reloading = useGame((s) => s.reloading);
  const prompt = useGame((s) => s.prompt);
  const objective = useGame((s) => s.objective);
  const subtitle = useGame((s) => s.subtitle);
  const toast = useGame((s) => s.toast);
  const hurt = useGame((s) => s.hurt);
  const hit = useGame((s) => s.hit);
  const aimHot = useGame((s) => s.aimHot);
  const boss = useGame((s) => s.boss);
  const bossHp = useGame((s) => s.bossHp);
  const bossMax = useGame((s) => s.bossMax);
  const lookHint = useGame((s) => s.lookHint);
  const screen = useGame((s) => s.screen);
  if (screen === "menu" || screen === "settings") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {hurt > 0 && <div key={hurt} className="damage-flash absolute inset-0" />}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <Crosshair className={aimHot ? "size-7 text-primary" : "size-7 text-fg/80"} strokeWidth={1.5} />
        {hit > 0 && <span key={hit} className="hit-mark absolute inset-0 border border-fg" />}
      </div>
      <div className="absolute top-4 left-4 max-w-xs sm:top-6 sm:left-6">
        <p className="text-xs tracking-widest text-muted uppercase">Objective</p>
        <p className="mt-1 text-sm text-fg">{objective}</p>
      </div>
      {boss && (
        <div className="absolute top-16 left-1/2 w-64 -translate-x-1/2 sm:top-8">
          <p className="text-center font-display text-sm tracking-widest text-primary uppercase">The Warden</p>
          <div className="mt-2 h-2 bg-line">
            <div className="h-full bg-primary" style={{ width: `${Math.max(0, (bossHp / bossMax) * 100)}%` }} />
          </div>
        </div>
      )}
      <div className="absolute bottom-28 left-4 sm:bottom-8 sm:left-8">
        <p className="text-xs tracking-widest text-muted uppercase">Condition</p>
        <div className="mt-2 h-2 w-40 bg-line">
          <div className="h-full bg-primary" style={{ width: `${health}%` }} />
        </div>
        <div className="mt-1 h-1 w-40 bg-line">
          <div className="h-full bg-fg/70" style={{ width: `${stamina}%` }} />
        </div>
        <p className="mt-1 text-sm text-fg">{Math.ceil(health)}</p>
      </div>
      <div className="absolute right-4 bottom-28 text-right sm:right-8 sm:bottom-8">
        <p className="font-display text-lg text-fg">{weapon}</p>
        <p className="font-display text-3xl text-fg">
          {mag}
          <span className="text-lg text-muted"> / {reserve}</span>
        </p>
        {reloading && <p className="text-sm text-primary">Reloading</p>}
      </div>
      <div className="absolute bottom-44 left-1/2 w-full max-w-lg -translate-x-1/2 px-6 text-center sm:bottom-28">
        {prompt && <p className="text-sm text-fg">E — {prompt}</p>}
        {subtitle && <p className="mt-2 font-display text-lg text-fg">{subtitle}</p>}
        {toast && <p className="mt-2 text-sm text-muted">{toast}</p>}
        {lookHint && <p className="mt-2 text-xs text-muted">{lookHint}</p>}
      </div>
    </div>
  );
}

function PauseMenu({ engineRef }: { engineRef: RefObject<Engine | null> }) {
  const goals = useGame((s) => s.goals);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/75 p-6">
      <div className="w-full max-w-md border border-line bg-surface p-6">
        <h2 className="font-display text-3xl">Held breath</h2>
        <p className="mt-2 text-sm text-muted">Radios keep your report. Dying returns you to the last one.</p>
        <ul className="mt-4 space-y-2 text-sm">
          {goals.map((g) => (
            <li key={g.text} className={g.done ? "text-muted line-through" : "text-fg"}>
              {g.text}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3">
          <MenuButton onClick={() => engineRef.current?.resume()}>Resume</MenuButton>
          <MenuButton onClick={() => engineRef.current?.openInventory()}>Pack</MenuButton>
          <MenuButton onClick={() => engineRef.current?.openSettings("pause")}>Settings</MenuButton>
          <MenuButton onClick={() => engineRef.current?.quitToMenu()}>Abandon to menu</MenuButton>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ engineRef }: { engineRef: RefObject<Engine | null> }) {
  const settings = useGame((s) => s.settings);
  const patch = (partial: Partial<SettingsState>) => engineRef.current?.updateSettings(partial);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-6">
      <div className="w-full max-w-md border border-line bg-surface p-6">
        <div className="flex items-center gap-2">
          <Settings className="size-5 text-primary" />
          <h2 className="font-display text-3xl">Settings</h2>
        </div>
        <div className="mt-5 flex flex-col gap-4 text-sm">
          <Slider label="Look sensitivity" min={0.0008} max={0.0045} step={0.0001} value={settings.sensitivity} onChange={(v) => patch({ sensitivity: v })} />
          <Slider label="Master volume" min={0} max={1} step={0.01} value={settings.volume} onChange={(v) => patch({ volume: v })} />
          <Slider label="Effects" min={0} max={1} step={0.01} value={settings.sfx} onChange={(v) => patch({ sfx: v })} />
          <Slider label="Drone" min={0} max={1} step={0.01} value={settings.music} onChange={(v) => patch({ music: v })} />
          <div className="flex items-center justify-between gap-3">
            <span>Quality</span>
            <select
              className="border border-line bg-bg px-3 py-2 text-fg"
              value={settings.quality}
              onChange={(e) => patch({ quality: e.target.value as SettingsState["quality"] })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Difficulty</span>
            <select
              className="border border-line bg-bg px-3 py-2 text-fg"
              value={settings.difficulty}
              onChange={(e) => patch({ difficulty: e.target.value as SettingsState["difficulty"] })}
            >
              <option value="normal">Normal</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span>Touch controls</span>
            <select
              className="border border-line bg-bg px-3 py-2 text-fg"
              value={settings.touch}
              onChange={(e) => patch({ touch: e.target.value as SettingsState["touch"] })}
            >
              <option value="auto">Auto</option>
              <option value="on">On</option>
              <option value="off">Off</option>
            </select>
          </div>
          <label className="flex items-center justify-between gap-3">
            <span>Invert look</span>
            <input type="checkbox" checked={settings.invertY} onChange={(e) => patch({ invertY: e.target.checked })} />
          </label>
          <p className="text-muted">Difficulty applies the next time you begin a new game.</p>
        </div>
        <div className="mt-6">
          <MenuButton onClick={() => engineRef.current?.closeSettings()}>Back</MenuButton>
        </div>
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex justify-between">
        {label}
        <span className="text-muted">{value < 0.01 ? value.toFixed(4) : value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-primary"
      />
    </label>
  );
}

function Inventory({ engineRef }: { engineRef: RefObject<Engine | null> }) {
  const items = useGame((s) => s.items);
  const [selected, setSelected] = useState<string | null>(items[0]?.id ?? null);
  const boardRef = useRef<HTMLDivElement>(null);
  const item = items.find((it) => it.id === selected) ?? null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Enter" && selected) engineRef.current?.useSelected(selected);
      const dir =
        e.code === "ArrowLeft" ? "left" : e.code === "ArrowRight" ? "right" : e.code === "ArrowUp" ? "up" : e.code === "ArrowDown" ? "down" : null;
      if (!dir) return;
      e.preventDefault();
      setSelected((cur) => neighborId(useGame.getState().items, cur, dir));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [engineRef, selected]);

  const drop = (id: string, clientX: number, clientY: number) => {
    const board = boardRef.current;
    if (!board) return;
    const rect = board.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * COLS);
    const y = Math.floor(((clientY - rect.top) / rect.height) * ROWS);
    engineRef.current?.moveInventory(id, x, y);
  };

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-4">
      <div className="grid w-full max-w-3xl gap-4 border border-line bg-surface p-4 sm:grid-cols-[1fr_16rem] sm:p-6">
        <div>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl">Pack</h2>
            <p className="text-sm text-muted">
              {cellsUsed(items)} / {COLS * ROWS}
            </p>
          </div>
          <div
            ref={boardRef}
            className="relative mt-4 grid gap-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${ROWS}, 3.25rem)` }}
          >
            {Array.from({ length: COLS * ROWS }, (_, i) => (
              <div key={i} className="border border-line bg-bg" />
            ))}
            {items.map((it) => (
              <PackItem
                key={it.id}
                item={it}
                selected={it.id === selected}
                onSelect={() => setSelected(it.id)}
                onDrop={(x, y) => drop(it.id, x, y)}
                onUse={() => engineRef.current?.useSelected(it.id)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">Drag to rearrange. Arrows select. Enter or double-click uses herbs and draws weapons.</p>
        </div>
        <aside className="border border-line bg-bg p-4">
          {item ? (
            <>
              <h3 className="font-display text-2xl">{ITEM_INFO[item.kind].name}</h3>
              {item.qty > 1 && <p className="text-sm text-muted">Quantity {item.qty}</p>}
              <p className="mt-3 text-sm leading-relaxed text-fg">{ITEM_INFO[item.kind].blurb}</p>
              <button
                type="button"
                className="mt-4 border border-line px-4 py-2 text-sm"
                onClick={() => engineRef.current?.useSelected(item.id)}
              >
                {item.kind === "herb" ? "Use" : item.kind === "pistol" || item.kind === "shotgun" ? "Draw" : "Examine"}
              </button>
            </>
          ) : (
            <p className="text-sm text-muted">Select a thing you are carrying.</p>
          )}
          <button type="button" className="mt-6 text-sm text-muted" onClick={() => engineRef.current?.resume()}>
            Close pack
          </button>
        </aside>
      </div>
    </div>
  );
}

function PackItem({
  item,
  selected,
  onSelect,
  onDrop,
  onUse,
}: {
  item: Item
  selected: boolean
  onSelect: () => void
  onDrop: (x: number, y: number) => void
  onUse: () => void
}) {
  const size = sizeOf(item.kind);
  const drag = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.type === "pointerdown") {
      onSelect();
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  return (
    <button
      type="button"
      onPointerDown={drag}
      onPointerUp={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrop(e.clientX, e.clientY);
      }}
      onDoubleClick={onUse}
      className={
        "z-10 border px-1 text-left text-xs " +
        (selected ? "border-primary bg-primary text-bg" : "border-line bg-surface text-fg")
      }
      style={{
        gridColumn: `${item.x + 1} / span ${size.w}`,
        gridRow: `${item.y + 1} / span ${size.h}`,
      }}
    >
      {ITEM_INFO[item.kind].name}
      {item.qty > 1 ? ` ×${item.qty}` : ""}
    </button>
  );
}

function EndScreen({ engineRef, dead }: { engineRef: RefObject<Engine | null>; dead: boolean }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-6">
      <div className="w-full max-w-lg border border-line bg-surface p-6">
        <p className="text-xs tracking-widest text-muted uppercase">{dead ? "Report incomplete" : "Report closed"}</p>
        <h2 className="mt-2 font-display text-4xl">{dead ? "You fall quiet" : "The bells stop"}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          {dead
            ? "Greyhollow keeps another name. The last radio still has your progress."
            : "The Warden is down. Greyhollow is not saved — only silenced. You can walk the parish, or leave the report where it is."}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          {dead ? (
            <MenuButton onClick={() => engineRef.current?.retry()}>Return to last radio</MenuButton>
          ) : (
            <MenuButton onClick={() => engineRef.current?.resume()}>Walk the parish</MenuButton>
          )}
          <MenuButton onClick={() => engineRef.current?.quitToMenu()}>Main menu</MenuButton>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel() {
  const bootError = useGame((s) => s.bootError);
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg p-6">
      <div className="max-w-md border border-line bg-surface p-6">
        <h2 className="font-display text-3xl">The parish will not render</h2>
        <p className="mt-3 text-sm text-muted">{bootError || "This browser could not start WebGL."}</p>
      </div>
    </div>
  );
}

function TouchControls({ engineRef }: { engineRef: RefObject<Engine | null> }) {
  const show = useGame((s) => s.showTouch);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const look = useRef(false);
  if (!show) return null;

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!origin.current) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / 48);
    engineRef.current?.setTouchMove((dx / len) * k, (-dy / len) * k);
  };

  return (
    <div className="absolute inset-0 z-20">
      <div
        className="absolute inset-y-0 right-0 w-1/2"
        onPointerDown={(e) => {
          look.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!look.current) return;
          engineRef.current?.pointerLook(e.movementX, e.movementY);
        }}
        onPointerUp={() => {
          look.current = false;
        }}
      />
      <div
        className="absolute bottom-6 left-6 h-28 w-28 rounded-full border border-line bg-surface/80"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          origin.current = null;
          engineRef.current?.setTouchMove(0, 0);
        }}
      />
      <div className="absolute right-4 bottom-6 flex gap-2">
        <TouchButton label="Fire" onDown={() => engineRef.current?.setFire(true)} onUp={() => engineRef.current?.setFire(false)} />
        <TouchButton label="Knife" onDown={() => engineRef.current?.tap("melee")} />
        <TouchButton label="Dodge" onDown={() => engineRef.current?.tap("dodge")} />
        <TouchButton label="Use" onDown={() => engineRef.current?.tap("interact")} />
        <TouchButton label="Reload" onDown={() => engineRef.current?.tap("reload")} />
      </div>
    </div>
  );
}

function TouchButton({ label, onDown, onUp }: { label: string; onDown: () => void; onUp?: () => void }) {
  return (
    <button
      type="button"
      className="h-14 min-w-14 border border-line bg-surface/90 px-3 text-xs tracking-wide text-fg uppercase"
      onPointerDown={(e) => {
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onUp?.();
      }}
      onPointerLeave={() => onUp?.()}
    >
      {label}
    </button>
  );
}
