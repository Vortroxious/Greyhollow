import { i as __toESM } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as Settings, r as Crosshair } from "../_libs/lucide-react.mjs";
import { t as create } from "../_libs/zustand.mjs";
import { A as TorusGeometry, C as PlaneGeometry, D as SRGBColorSpace, E as RepeatWrapping, M as Vector3, O as Scene, S as PerspectiveCamera, T as Quaternion, _ as InstancedMesh, a as WebGLRenderer, b as MeshStandardMaterial, c as Color, d as DataTexture, f as DirectionalLight, g as HemisphereLight, h as Group, i as EffectComposer, j as Vector2, k as SphereGeometry, l as ConeGeometry, m as FogExp2, n as UnrealBloomPass, o as BoxGeometry, p as Euler, r as RenderPass, s as CanvasTexture, t as OutputPass, u as CylinderGeometry, v as Mesh, w as PointLight, x as Object3D, y as MeshBasicMaterial } from "../_libs/three.mjs";
import { t as NC } from "../_libs/dimforge__rapier3d-compat.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/GameView-DgHQddFi.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function sizeOf(kind) {
	if (kind === "knife") return {
		w: 1,
		h: 2
	};
	if (kind === "pistol") return {
		w: 2,
		h: 1
	};
	if (kind === "shotgun") return {
		w: 3,
		h: 1
	};
	return {
		w: 1,
		h: 1
	};
}
var ITEM_INFO = {
	knife: {
		name: "Field knife",
		blurb: "Bureau issue. Quiet, close, and the only thing that never runs dry. Press F to cut."
	},
	pistol: {
		name: "Service pistol",
		blurb: "Twelve-round sidearm. Head wounds drop the hollowed faster. Aim before you spend a bullet."
	},
	shotgun: {
		name: "Scattergun",
		blurb: "Short rural shotgun. Brutal inside a room, useless if you miss the spread. Four shells in the tube."
	},
	pistolAmmo: {
		name: "Handgun rounds",
		blurb: "Loose cartridges. Reloading the pistol draws from every box in the pack."
	},
	shells: {
		name: "Shotgun shells",
		blurb: "Brass and black powder. The scattergun will not feed without them."
	},
	herb: {
		name: "Bitter green",
		blurb: "A parish poultice. Use it to knit flesh. It will not bring you past whole."
	},
	barnKey: {
		name: "Barn key",
		blurb: "Heavy iron, stamped with a wheat sheaf. The harrow barn on the north edge of the square."
	},
	sigil: {
		name: "Chapel sigil",
		blurb: "A cold disc of parish silver. The chapel doors know it."
	},
	note: {
		name: "Sexton's scrap",
		blurb: "The mural is an order, not a decoration. Light dawn first, then dusk, then the one between. I, then III, then II. Any other flame and the chest stays shut."
	}
};
var seq = 1;
function makeItem(kind, x, y, qty = 1) {
	return {
		id: `${kind}-${seq++}`,
		kind,
		x,
		y,
		qty
	};
}
function overlaps(a, b) {
	const as = sizeOf(a.kind);
	const bs = sizeOf(b.kind);
	return a.x < b.x + bs.w && a.x + as.w > b.x && a.y < b.y + bs.h && a.y + as.h > b.y;
}
function inBounds(kind, x, y) {
	const s = sizeOf(kind);
	return x >= 0 && y >= 0 && x + s.w <= 8 && y + s.h <= 4;
}
function canPlace(items, kind, x, y, ignoreId) {
	if (!inBounds(kind, x, y)) return false;
	const ghost = {
		id: "_",
		kind,
		x,
		y,
		qty: 1
	};
	return !items.some((it) => it.id !== ignoreId && overlaps(ghost, it));
}
function findSpot(items, kind) {
	const s = sizeOf(kind);
	for (let y = 0; y <= 4 - s.h; y++) for (let x = 0; x <= 8 - s.w; x++) if (canPlace(items, kind, x, y)) return {
		x,
		y
	};
	return null;
}
function tryAdd(items, kind, qty = 1) {
	if (kind === "pistolAmmo" || kind === "shells") {
		const existing = items.find((it) => it.kind === kind && it.qty < 48);
		if (existing) return items.map((it) => it.id === existing.id ? {
			...it,
			qty: Math.min(48, it.qty + qty)
		} : it);
	}
	const spot = findSpot(items, kind);
	if (!spot) return null;
	return [...items, makeItem(kind, spot.x, spot.y, qty)];
}
function moveItem(items, id, x, y) {
	const item = items.find((it) => it.id === id);
	if (!item) return null;
	if (!canPlace(items, item.kind, x, y, id)) return null;
	return items.map((it) => it.id === id ? {
		...it,
		x,
		y
	} : it);
}
function removeItem(items, id) {
	return items.filter((it) => it.id !== id);
}
function ammoQty(items, kind) {
	return items.reduce((n, it) => it.kind === kind ? n + it.qty : n, 0);
}
function takeAmmo(items, kind, amount) {
	let need = amount;
	const next = items.map((it) => ({ ...it }));
	for (const it of next) {
		if (need <= 0) break;
		if (it.kind !== kind || it.qty <= 0) continue;
		const take = Math.min(it.qty, need);
		it.qty -= take;
		need -= take;
	}
	return {
		items: next.filter((it) => it.kind !== kind || it.qty > 0),
		took: amount - need
	};
}
function startingPack() {
	return [
		makeItem("knife", 0, 0),
		makeItem("pistol", 1, 0),
		makeItem("pistolAmmo", 3, 0, 30),
		makeItem("herb", 4, 0)
	];
}
function neighborId(items, current, dir) {
	if (!items.length) return null;
	const cur = items.find((it) => it.id === current) ?? items[0];
	let best = null;
	let bestScore = Infinity;
	for (const it of items) {
		if (it.id === cur.id) continue;
		const dx = it.x - cur.x;
		const dy = it.y - cur.y;
		if (!(dir === "left" && dx < 0 || dir === "right" && dx > 0 || dir === "up" && dy < 0 || dir === "down" && dy > 0)) continue;
		const score = Math.abs(dx) + Math.abs(dy) * 1.2;
		if (score < bestScore) {
			bestScore = score;
			best = it;
		}
	}
	return best?.id ?? cur.id;
}
function cellsUsed(items) {
	return items.reduce((n, it) => {
		const s = sizeOf(it.kind);
		return n + s.w * s.h;
	}, 0);
}
var DEFAULT_SETTINGS = {
	sensitivity: .00215,
	invertY: false,
	volume: .8,
	sfx: .85,
	music: .42,
	quality: "medium",
	difficulty: "normal",
	touch: "auto"
};
var SAVE_KEY = "greyhollow-save-v1";
var SETTINGS_KEY = "greyhollow-settings-v1";
function emptyFlags() {
	return {
		enteredSquare: false,
		hasBarnKey: false,
		barnOpen: false,
		puzzleSolved: false,
		hasSigil: false,
		chapelOpen: false,
		bossStarted: false,
		bossDefeated: false,
		hasShotgun: false,
		hasNote: false
	};
}
function loadSave() {
	try {
		const raw = localStorage.getItem(SAVE_KEY);
		if (!raw) return null;
		const data = JSON.parse(raw);
		if (!data || data.version !== 1 || !data.flags) return null;
		return data;
	} catch {
		return null;
	}
}
function writeSave(data) {
	localStorage.setItem(SAVE_KEY, JSON.stringify(data));
}
function hasSave() {
	return loadSave() !== null;
}
function loadSettings() {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		if (!raw) return { ...DEFAULT_SETTINGS };
		return {
			...DEFAULT_SETTINGS,
			...JSON.parse(raw)
		};
	} catch {
		return { ...DEFAULT_SETTINGS };
	}
}
function writeSettings(settings) {
	localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
var useGame = create(() => ({
	screen: "boot",
	settingsBack: "menu",
	bootError: "",
	bootLabel: "Waking the parish…",
	health: 100,
	maxHealth: 100,
	stamina: 100,
	mag: 0,
	reserve: 0,
	weapon: "Pistol",
	reloading: false,
	prompt: "",
	objective: "Follow the ash road into the parish square.",
	subtitle: "",
	toast: "",
	hurt: 0,
	hit: 0,
	aimHot: false,
	boss: false,
	bossHp: 0,
	bossMax: 1,
	items: [],
	selected: null,
	hasSave: false,
	settings: { ...DEFAULT_SETTINGS },
	showTouch: false,
	goals: [],
	flags: emptyFlags(),
	lookHint: "",
	ready: false
}));
function Chrome({ engineRef }) {
	const screen = useGame((s) => s.screen);
	const ready = useGame((s) => s.ready);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		screen === "boot" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute inset-0 z-30 flex items-end bg-bg/80 p-8",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "font-display text-sm tracking-widest text-muted uppercase",
					children: "Ashline Bureau"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-2 font-display text-4xl",
					children: "Greyhollow"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-muted",
					children: useGame.getState().bootLabel
				})
			] })
		}),
		screen === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ErrorPanel, {}),
		screen === "menu" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MainMenu, {
			engineRef,
			ready
		}),
		screen === "settings" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsPanel, { engineRef }),
		screen === "pause" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PauseMenu, { engineRef }),
		screen === "inventory" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Inventory, { engineRef }),
		screen === "dead" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndScreen, {
			engineRef,
			dead: true
		}),
		screen === "won" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EndScreen, {
			engineRef,
			dead: false
		}),
		(screen === "play" || screen === "pause" || screen === "inventory") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Hud, {}),
		screen === "play" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchControls, { engineRef })
	] });
}
function MainMenu({ engineRef, ready }) {
	const hasSave = useGame((s) => s.hasSave);
	const act = (fn) => {
		const engine = engineRef.current;
		if (!engine) return;
		engine.unlockAudio();
		fn(engine);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "menu-rise pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-sm tracking-widest text-muted uppercase",
				children: "Ashline Bureau · Field report 04"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "max-w-xl",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-display text-5xl text-fg sm:text-7xl",
						children: "Greyhollow"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 max-w-md text-base leading-relaxed text-muted",
						children: "The parish went dark three nights ago. You are Mara Voss. The hollowed do not negotiate, and every round you fire is one you will not get back."
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto flex w-full max-w-xs flex-col gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							disabled: !ready,
							onClick: () => act((e) => e.newGame()),
							children: "New Game"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							disabled: !ready || !hasSave,
							onClick: () => act((e) => e.continueGame()),
							children: "Continue"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							disabled: !ready,
							onClick: () => engineRef.current?.openSettings("menu"),
							children: "Settings"
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "max-w-2xl text-sm text-muted",
				children: "WASD move · mouse aim · click to shoot · R reload · F knife · Space dodge · Shift sprint · E use · Tab pack · Esc pause"
			})
		]
	});
}
function MenuButton({ children, onClick, disabled }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		disabled,
		onClick,
		className: "border border-line bg-surface/90 px-5 py-3 text-left font-display text-lg text-fg transition-colors hover:border-primary hover:text-primary",
		children
	});
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none absolute inset-0 z-10",
		children: [
			hurt > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "damage-flash absolute inset-0" }, hurt),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crosshair, {
					className: aimHot ? "size-7 text-primary" : "size-7 text-fg/80",
					strokeWidth: 1.5
				}), hit > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "hit-mark absolute inset-0 border border-fg" }, hit)]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute top-4 left-4 max-w-xs sm:top-6 sm:left-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: "Objective"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1 text-sm text-fg",
					children: objective
				})]
			}),
			boss && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute top-16 left-1/2 w-64 -translate-x-1/2 sm:top-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-center font-display text-sm tracking-widest text-primary uppercase",
					children: "The Warden"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-2 h-2 bg-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-full bg-primary",
						style: { width: `${Math.max(0, bossHp / bossMax * 100)}%` }
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute bottom-28 left-4 sm:bottom-8 sm:left-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs tracking-widest text-muted uppercase",
						children: "Condition"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-2 h-2 w-40 bg-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-primary",
							style: { width: `${health}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-1 h-1 w-40 bg-line",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-full bg-fg/70",
							style: { width: `${stamina}%` }
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-fg",
						children: Math.ceil(health)
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute right-4 bottom-28 text-right sm:right-8 sm:bottom-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-lg text-fg",
						children: weapon
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-display text-3xl text-fg",
						children: [mag, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-lg text-muted",
							children: [" / ", reserve]
						})]
					}),
					reloading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-primary",
						children: "Reloading"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute bottom-44 left-1/2 w-full max-w-lg -translate-x-1/2 px-6 text-center sm:bottom-28",
				children: [
					prompt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-fg",
						children: ["E — ", prompt]
					}),
					subtitle && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 font-display text-lg text-fg",
						children: subtitle
					}),
					toast && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: toast
					}),
					lookHint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: lookHint
					})
				]
			})
		]
	});
}
function PauseMenu({ engineRef }) {
	const goals = useGame((s) => s.goals);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-30 flex items-center justify-center bg-bg/75 p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md border border-line bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-display text-3xl",
					children: "Held breath"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted",
					children: "Radios keep your report. Dying returns you to the last one."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "mt-4 space-y-2 text-sm",
					children: goals.map((g) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
						className: g.done ? "text-muted line-through" : "text-fg",
						children: g.text
					}, g.text))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							onClick: () => engineRef.current?.resume(),
							children: "Resume"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							onClick: () => engineRef.current?.openInventory(),
							children: "Pack"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							onClick: () => engineRef.current?.openSettings("pause"),
							children: "Settings"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
							onClick: () => engineRef.current?.quitToMenu(),
							children: "Abandon to menu"
						})
					]
				})
			]
		})
	});
}
function SettingsPanel({ engineRef }) {
	const settings = useGame((s) => s.settings);
	const patch = (partial) => engineRef.current?.updateSettings(partial);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-md border border-line bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-5 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-3xl",
						children: "Settings"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-5 flex flex-col gap-4 text-sm",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Look sensitivity",
							min: 8e-4,
							max: .0045,
							step: 1e-4,
							value: settings.sensitivity,
							onChange: (v) => patch({ sensitivity: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Master volume",
							min: 0,
							max: 1,
							step: .01,
							value: settings.volume,
							onChange: (v) => patch({ volume: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Effects",
							min: 0,
							max: 1,
							step: .01,
							value: settings.sfx,
							onChange: (v) => patch({ sfx: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Slider, {
							label: "Drone",
							min: 0,
							max: 1,
							step: .01,
							value: settings.music,
							onChange: (v) => patch({ music: v })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Quality" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "border border-line bg-bg px-3 py-2 text-fg",
								value: settings.quality,
								onChange: (e) => patch({ quality: e.target.value }),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "low",
										children: "Low"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "medium",
										children: "Medium"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "high",
										children: "High"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Difficulty" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "border border-line bg-bg px-3 py-2 text-fg",
								value: settings.difficulty,
								onChange: (e) => patch({ difficulty: e.target.value }),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "normal",
									children: "Normal"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "hard",
									children: "Hard"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Touch controls" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								className: "border border-line bg-bg px-3 py-2 text-fg",
								value: settings.touch,
								onChange: (e) => patch({ touch: e.target.value }),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "auto",
										children: "Auto"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "on",
										children: "On"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: "off",
										children: "Off"
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Invert look" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "checkbox",
								checked: settings.invertY,
								onChange: (e) => patch({ invertY: e.target.checked })
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-muted",
							children: "Difficulty applies the next time you begin a new game."
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
						onClick: () => engineRef.current?.closeSettings(),
						children: "Back"
					})
				})
			]
		})
	});
}
function Slider({ label, value, min, max, step, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "flex flex-col gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "flex justify-between",
			children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted",
				children: value < .01 ? value.toFixed(4) : value.toFixed(2)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			type: "range",
			min,
			max,
			step,
			value,
			onChange: (e) => onChange(Number(e.target.value)),
			className: "accent-primary"
		})]
	});
}
function Inventory({ engineRef }) {
	const items = useGame((s) => s.items);
	const [selected, setSelected] = (0, import_react.useState)(items[0]?.id ?? null);
	const boardRef = (0, import_react.useRef)(null);
	const item = items.find((it) => it.id === selected) ?? null;
	(0, import_react.useEffect)(() => {
		const onKey = (e) => {
			if (e.code === "Enter" && selected) engineRef.current?.useSelected(selected);
			const dir = e.code === "ArrowLeft" ? "left" : e.code === "ArrowRight" ? "right" : e.code === "ArrowUp" ? "up" : e.code === "ArrowDown" ? "down" : null;
			if (!dir) return;
			e.preventDefault();
			setSelected((cur) => neighborId(useGame.getState().items, cur, dir));
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [engineRef, selected]);
	const drop = (id, clientX, clientY) => {
		const board = boardRef.current;
		if (!board) return;
		const rect = board.getBoundingClientRect();
		const x = Math.floor((clientX - rect.left) / rect.width * 8);
		const y = Math.floor((clientY - rect.top) / rect.height * 4);
		engineRef.current?.moveInventory(id, x, y);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid w-full max-w-3xl gap-4 border border-line bg-surface p-4 sm:grid-cols-[1fr_16rem] sm:p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-baseline justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-3xl",
						children: "Pack"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: [
							cellsUsed(items),
							" / ",
							32
						]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: boardRef,
					className: "relative mt-4 grid gap-1",
					style: {
						gridTemplateColumns: `repeat(8, minmax(0, 1fr))`,
						gridTemplateRows: `repeat(4, 3.25rem)`
					},
					children: [Array.from({ length: 32 }, (_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "border border-line bg-bg" }, i)), items.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackItem, {
						item: it,
						selected: it.id === selected,
						onSelect: () => setSelected(it.id),
						onDrop: (x, y) => drop(it.id, x, y),
						onUse: () => engineRef.current?.useSelected(it.id)
					}, it.id))]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-xs text-muted",
					children: "Drag to rearrange. Arrows select. Enter or double-click uses herbs and draws weapons."
				})
			] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "border border-line bg-bg p-4",
				children: [item ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-2xl",
						children: ITEM_INFO[item.kind].name
					}),
					item.qty > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "text-sm text-muted",
						children: ["Quantity ", item.qty]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 text-sm leading-relaxed text-fg",
						children: ITEM_INFO[item.kind].blurb
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "mt-4 border border-line px-4 py-2 text-sm",
						onClick: () => engineRef.current?.useSelected(item.id),
						children: item.kind === "herb" ? "Use" : item.kind === "pistol" || item.kind === "shotgun" ? "Draw" : "Examine"
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Select a thing you are carrying."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					className: "mt-6 text-sm text-muted",
					onClick: () => engineRef.current?.resume(),
					children: "Close pack"
				})]
			})]
		})
	});
}
function PackItem({ item, selected, onSelect, onDrop, onUse }) {
	const size = sizeOf(item.kind);
	const drag = (e) => {
		if (e.type === "pointerdown") {
			onSelect();
			e.currentTarget.setPointerCapture(e.pointerId);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onPointerDown: drag,
		onPointerUp: (e) => {
			if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrop(e.clientX, e.clientY);
		},
		onDoubleClick: onUse,
		className: "z-10 border px-1 text-left text-xs " + (selected ? "border-primary bg-primary text-bg" : "border-line bg-surface text-fg"),
		style: {
			gridColumn: `${item.x + 1} / span ${size.w}`,
			gridRow: `${item.y + 1} / span ${size.h}`
		},
		children: [ITEM_INFO[item.kind].name, item.qty > 1 ? ` ×${item.qty}` : ""]
	});
}
function EndScreen({ engineRef, dead }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-30 flex items-center justify-center bg-bg/80 p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-lg border border-line bg-surface p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs tracking-widest text-muted uppercase",
					children: dead ? "Report incomplete" : "Report closed"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-4xl",
					children: dead ? "You fall quiet" : "The bells stop"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-3 text-sm leading-relaxed text-muted",
					children: dead ? "Greyhollow keeps another name. The last radio still has your progress." : "The Warden is down. Greyhollow is not saved — only silenced. You can walk the parish, or leave the report where it is."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-col gap-3",
					children: [dead ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
						onClick: () => engineRef.current?.retry(),
						children: "Return to last radio"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
						onClick: () => engineRef.current?.resume(),
						children: "Walk the parish"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MenuButton, {
						onClick: () => engineRef.current?.quitToMenu(),
						children: "Main menu"
					})]
				})
			]
		})
	});
}
function ErrorPanel() {
	const bootError = useGame((s) => s.bootError);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "absolute inset-0 z-40 flex items-center justify-center bg-bg p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md border border-line bg-surface p-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-display text-3xl",
				children: "The parish will not render"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 text-sm text-muted",
				children: bootError || "This browser could not start WebGL."
			})]
		})
	});
}
function TouchControls({ engineRef }) {
	const show = useGame((s) => s.showTouch);
	const origin = (0, import_react.useRef)(null);
	const look = (0, import_react.useRef)(false);
	if (!show) return null;
	const move = (e) => {
		if (!origin.current) return;
		const dx = e.clientX - origin.current.x;
		const dy = e.clientY - origin.current.y;
		const len = Math.hypot(dx, dy) || 1;
		const k = Math.min(1, len / 48);
		engineRef.current?.setTouchMove(dx / len * k, -dy / len * k);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "absolute inset-0 z-20",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute inset-y-0 right-0 w-1/2",
				onPointerDown: (e) => {
					look.current = true;
					e.currentTarget.setPointerCapture(e.pointerId);
				},
				onPointerMove: (e) => {
					if (!look.current) return;
					engineRef.current?.pointerLook(e.movementX, e.movementY);
				},
				onPointerUp: () => {
					look.current = false;
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "absolute bottom-6 left-6 h-28 w-28 rounded-full border border-line bg-surface/80",
				onPointerDown: (e) => {
					origin.current = {
						x: e.clientX,
						y: e.clientY
					};
					e.currentTarget.setPointerCapture(e.pointerId);
					move(e);
				},
				onPointerMove: move,
				onPointerUp: () => {
					origin.current = null;
					engineRef.current?.setTouchMove(0, 0);
				}
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "absolute right-4 bottom-6 flex gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchButton, {
						label: "Fire",
						onDown: () => engineRef.current?.setFire(true),
						onUp: () => engineRef.current?.setFire(false)
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchButton, {
						label: "Knife",
						onDown: () => engineRef.current?.tap("melee")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchButton, {
						label: "Dodge",
						onDown: () => engineRef.current?.tap("dodge")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchButton, {
						label: "Use",
						onDown: () => engineRef.current?.tap("interact")
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TouchButton, {
						label: "Reload",
						onDown: () => engineRef.current?.tap("reload")
					})
				]
			})
		]
	});
}
function TouchButton({ label, onDown, onUp }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		className: "h-14 min-w-14 border border-line bg-surface/90 px-3 text-xs tracking-wide text-fg uppercase",
		onPointerDown: (e) => {
			e.stopPropagation();
			onDown();
		},
		onPointerUp: (e) => {
			e.stopPropagation();
			onUp?.();
		},
		onPointerLeave: () => onUp?.(),
		children: label
	});
}
var AudioBus = class {
	ctx = null;
	master = null;
	sfx = null;
	music = null;
	noise = null;
	wind = null;
	musicOsc = [];
	musicGain = null;
	tension = 0;
	targetTension = 0;
	heartbeatAt = 0;
	settings = null;
	unlock(settings) {
		this.settings = settings;
		const AC = window.AudioContext || window.webkitAudioContext;
		if (!AC) return;
		if (!this.ctx) {
			this.ctx = new AC({ latencyHint: "interactive" });
			this.master = this.ctx.createGain();
			this.sfx = this.ctx.createGain();
			this.music = this.ctx.createGain();
			this.sfx.connect(this.master);
			this.music.connect(this.master);
			this.master.connect(this.ctx.destination);
			const len = this.ctx.sampleRate * 1;
			const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
			const data = buf.getChannelData(0);
			for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
			this.noise = buf;
			this.startBed();
		}
		if (this.ctx.state === "suspended") this.ctx.resume();
		this.apply(settings);
	}
	apply(settings) {
		this.settings = settings;
		if (!this.ctx || !this.master || !this.sfx || !this.music) return;
		const t = this.ctx.currentTime;
		const curve = (v) => v * v;
		this.master.gain.setTargetAtTime(curve(settings.volume), t, .03);
		this.sfx.gain.setTargetAtTime(curve(settings.sfx), t, .03);
		this.music.gain.setTargetAtTime(curve(settings.music), t, .05);
	}
	startBed() {
		if (!this.ctx || !this.noise || !this.music || !this.sfx) return;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		src.loop = true;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 420;
		const g = this.ctx.createGain();
		g.gain.value = .045;
		src.connect(filter);
		filter.connect(g);
		g.connect(this.music);
		src.start();
		this.wind = src;
		this.musicGain = this.ctx.createGain();
		this.musicGain.gain.value = .04;
		this.musicGain.connect(this.music);
		for (const f of [
			73,
			110,
			146
		]) {
			const o = this.ctx.createOscillator();
			o.type = "sine";
			o.frequency.value = f;
			const og = this.ctx.createGain();
			og.gain.value = .22;
			o.connect(og);
			og.connect(this.musicGain);
			o.start();
			this.musicOsc.push(o);
		}
	}
	setListener(x, y, z, fx, fy, fz) {
		const ctx = this.ctx;
		if (!ctx) return;
		const l = ctx.listener;
		const t = ctx.currentTime;
		if (l.positionX) {
			l.positionX.setValueAtTime(x, t);
			l.positionY.setValueAtTime(y, t);
			l.positionZ.setValueAtTime(z, t);
			l.forwardX.setValueAtTime(fx, t);
			l.forwardY.setValueAtTime(fy, t);
			l.forwardZ.setValueAtTime(fz, t);
			l.upX.setValueAtTime(0, t);
			l.upY.setValueAtTime(1, t);
			l.upZ.setValueAtTime(0, t);
		}
	}
	setTension(v) {
		this.targetTension = Math.max(0, Math.min(1, v));
	}
	tick(dt, lowHealth) {
		if (!this.ctx || !this.musicGain) return;
		this.tension += (this.targetTension - this.tension) * Math.min(1, dt * 2);
		const t = this.ctx.currentTime;
		this.musicGain.gain.setTargetAtTime(.03 + this.tension * .08, t, .1);
		const base = [
			73,
			110,
			164
		];
		this.musicOsc.forEach((o, i) => {
			const wobble = Math.sin(t * (.2 + i * .07) + i) * 1.5;
			o.frequency.setTargetAtTime((base[i] ?? 80) + wobble + this.tension * 12, t, .2);
		});
		if (lowHealth && t > this.heartbeatAt) {
			this.heartbeatAt = t + .85;
			this.tone(58, .18, "sine", .2, this.sfx);
		}
	}
	tone(freq, dur, type, gain, dest, slide = .5) {
		if (!this.ctx || !dest) return;
		const t = this.ctx.currentTime;
		const o = this.ctx.createOscillator();
		const g = this.ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		o.connect(g);
		g.connect(dest);
		o.start(t);
		o.stop(t + dur + .02);
	}
	burst(dur, freq, gain, dest, rate = 1) {
		if (!this.ctx || !this.noise || !dest) return;
		const t = this.ctx.currentTime;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noise;
		src.playbackRate.value = rate;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(freq, t);
		filter.Q.value = .7;
		const g = this.ctx.createGain();
		g.gain.setValueAtTime(gain, t);
		g.gain.exponentialRampToValueAtTime(.001, t + dur);
		src.connect(filter);
		filter.connect(g);
		g.connect(dest);
		src.start(t);
		src.stop(t + dur + .02);
	}
	place(x, y, z) {
		if (!this.ctx || !this.sfx) return null;
		const p = this.ctx.createPanner();
		p.panningModel = "equalpower";
		p.distanceModel = "inverse";
		p.refDistance = 2.2;
		p.maxDistance = 38;
		p.rolloffFactor = 1.15;
		if (p.positionX) {
			p.positionX.value = x;
			p.positionY.value = y;
			p.positionZ.value = z;
		}
		p.connect(this.sfx);
		return p;
	}
	gun(kind) {
		const heavy = kind === "shotgun";
		this.burst(heavy ? .22 : .12, heavy ? 480 : 1400, heavy ? .55 : .32, this.sfx, heavy ? .7 : 1);
		this.tone(heavy ? 90 : 160, heavy ? .18 : .09, "triangle", heavy ? .28 : .16, this.sfx, .35);
	}
	dry() {
		this.burst(.04, 1800, .12, this.sfx, 1.4);
	}
	reload() {
		this.burst(.05, 900, .16, this.sfx, 1.2);
		window.setTimeout(() => this.burst(.06, 600, .14, this.sfx, .8), 180);
		window.setTimeout(() => this.tone(220, .06, "square", .05, this.sfx, .8), 340);
	}
	melee() {
		this.burst(.08, 300, .22, this.sfx, .6);
		this.tone(90, .1, "sawtooth", .06, this.sfx, .4);
	}
	hit(flesh = true) {
		this.burst(.07, flesh ? 280 : 1600, flesh ? .22 : .1, this.sfx, flesh ? .8 : 1.5);
	}
	hurt() {
		this.tone(140, .2, "sawtooth", .08, this.sfx, .4);
		this.burst(.12, 200, .2, this.sfx, .5);
	}
	foot(x, y, z) {
		const dest = this.place(x, y, z) ?? this.sfx;
		this.burst(.05, 180 + Math.random() * 60, .08, dest, .7 + Math.random() * .3);
	}
	groan(x, y, z, deep = false) {
		const dest = this.place(x, y, z);
		this.tone(deep ? 50 : 90 + Math.random() * 40, deep ? .6 : .35, "sawtooth", deep ? .12 : .07, dest, .7);
	}
	shotIncoming(x, y, z) {
		const dest = this.place(x, y, z);
		this.burst(.08, 700, .12, dest, .9);
	}
	pickup() {
		this.tone(520, .08, "sine", .06, this.sfx, 1.4);
		this.tone(780, .1, "sine", .04, this.sfx, 1.2);
	}
	locked() {
		this.tone(90, .12, "square", .05, this.sfx, .6);
	}
	radio() {
		this.burst(.15, 1200, .08, this.sfx, .4);
		this.tone(440, .2, "sine", .04, this.sfx, 1);
	}
	brazier(ok) {
		this.tone(ok ? 196 : 70, .25, ok ? "triangle" : "sawtooth", .08, this.sfx, ok ? 1.5 : .5);
	}
	bell() {
		this.tone(220, 1.2, "sine", .08, this.music, .6);
		this.tone(330, 1.1, "sine", .04, this.music, .55);
	}
	bossDie() {
		this.tone(48, 1.4, "sawtooth", .12, this.sfx, .3);
		this.bell();
	}
	resume() {
		if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
	}
};
var NAV = {
	originX: -42,
	originZ: -50,
	cell: 1.5,
	cols: 56,
	rows: 72
};
function cellIndex(c, r) {
	return r * NAV.cols + c;
}
function worldToCell(x, z) {
	return {
		c: Math.floor((x - NAV.originX) / NAV.cell),
		r: Math.floor((z - NAV.originZ) / NAV.cell)
	};
}
function cellCenter(c, r) {
	return {
		x: NAV.originX + (c + .5) * NAV.cell,
		z: NAV.originZ + (r + .5) * NAV.cell
	};
}
function heapPush(h, n) {
	h.push(n);
	let i = h.length - 1;
	while (i > 0) {
		const p = i - 1 >> 1;
		const parent = h[p];
		const cur = h[i];
		if (!parent || !cur || parent.f <= cur.f) break;
		h[p] = cur;
		h[i] = parent;
		i = p;
	}
}
function heapPop(h) {
	const top = h[0];
	const last = h.pop();
	if (!last || h.length === 0) return top;
	h[0] = last;
	let i = 0;
	for (;;) {
		const l = i * 2 + 1;
		const r = l + 1;
		let s = i;
		if (l < h.length && h[l] && h[s] && h[l].f < h[s].f) s = l;
		if (r < h.length && h[r] && h[s] && h[r].f < h[s].f) s = r;
		if (s === i) break;
		const a = h[i];
		const b = h[s];
		h[i] = b;
		h[s] = a;
		i = s;
	}
	return top;
}
var DIRS = [
	[
		1,
		0,
		1
	],
	[
		-1,
		0,
		1
	],
	[
		0,
		1,
		1
	],
	[
		0,
		-1,
		1
	],
	[
		1,
		1,
		1.414
	],
	[
		1,
		-1,
		1.414
	],
	[
		-1,
		1,
		1.414
	],
	[
		-1,
		-1,
		1.414
	]
];
function nearestFree(blocked, c, r) {
	const start = cellIndex(Math.max(0, Math.min(NAV.cols - 1, c)), Math.max(0, Math.min(NAV.rows - 1, r)));
	if (!blocked[start]) return start;
	for (let rad = 1; rad <= 4; rad++) for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
		const cc = c + dx;
		const rr = r + dz;
		if (cc < 0 || rr < 0 || cc >= NAV.cols || rr >= NAV.rows) continue;
		const i = cellIndex(cc, rr);
		if (!blocked[i]) return i;
	}
	return start;
}
function lineFree(blocked, a, b) {
	let c0 = a % NAV.cols;
	let r0 = a / NAV.cols | 0;
	const c1 = b % NAV.cols;
	const r1 = b / NAV.cols | 0;
	const dc = Math.abs(c1 - c0);
	const dr = Math.abs(r1 - r0);
	const sc = c0 < c1 ? 1 : -1;
	const sr = r0 < r1 ? 1 : -1;
	let err = dc - dr;
	for (let n = 0; n < 80; n++) {
		if (blocked[cellIndex(c0, r0)]) return false;
		if (c0 === c1 && r0 === r1) return true;
		const e2 = 2 * err;
		if (e2 > -dr) {
			err -= dr;
			c0 += sc;
		}
		if (e2 < dc) {
			err += dc;
			r0 += sr;
		}
	}
	return false;
}
function findPath(blocked, sx, sz, gx, gz) {
	const sCell = worldToCell(sx, sz);
	const gCell = worldToCell(gx, gz);
	const start = nearestFree(blocked, sCell.c, sCell.r);
	const goal = nearestFree(blocked, gCell.c, gCell.r);
	if (blocked[start] || blocked[goal]) return null;
	if (start === goal) return [cellCenter(goal % NAV.cols, goal / NAV.cols | 0)];
	const gc = goal % NAV.cols;
	const gr = goal / NAV.cols | 0;
	const gScore = new Float32Array(blocked.length);
	gScore.fill(1e9);
	gScore[start] = 0;
	const came = new Int32Array(blocked.length);
	came.fill(-1);
	const open = new Uint8Array(blocked.length);
	const heap = [];
	heapPush(heap, {
		i: start,
		f: 0
	});
	open[start] = 1;
	let expansions = 0;
	while (heap.length && expansions < 2500) {
		const cur = heapPop(heap);
		if (!cur) break;
		expansions++;
		if (cur.i === goal) break;
		if (!open[cur.i]) continue;
		open[cur.i] = 0;
		const c = cur.i % NAV.cols;
		const r = cur.i / NAV.cols | 0;
		for (const [dc, dr, cost] of DIRS) {
			const nc = c + dc;
			const nr = r + dr;
			if (nc < 0 || nr < 0 || nc >= NAV.cols || nr >= NAV.rows) continue;
			if (dc !== 0 && dr !== 0) {
				if (blocked[cellIndex(c + dc, r)] || blocked[cellIndex(c, r + dr)]) continue;
			}
			const ni = cellIndex(nc, nr);
			if (blocked[ni]) continue;
			const ng = gScore[cur.i] + cost;
			if (ng >= gScore[ni]) continue;
			gScore[ni] = ng;
			came[ni] = cur.i;
			const dx = Math.abs(nc - gc);
			const dy = Math.abs(nr - gr);
			heapPush(heap, {
				i: ni,
				f: ng + (Math.max(dx, dy) + .414 * Math.min(dx, dy))
			});
			open[ni] = 1;
		}
	}
	if (came[goal] === -1 && goal !== start) return null;
	const chain = [];
	let cur = goal;
	chain.push(cur);
	let guard = 0;
	while (cur !== start && guard++ < 500) {
		const prev = came[cur];
		if (prev === void 0 || prev < 0) break;
		cur = prev;
		chain.push(cur);
	}
	chain.reverse();
	const smooth = [];
	smooth.push(chain[0]);
	for (let i = 1; i < chain.length; i++) {
		const last = smooth[smooth.length - 1];
		if (!lineFree(blocked, last, chain[i])) {
			const mid = chain[i - 1];
			if (mid !== last) smooth.push(mid);
			i - 1;
		}
	}
	const end = chain[chain.length - 1];
	if (smooth[smooth.length - 1] !== end) smooth.push(end);
	return smooth.map((i) => cellCenter(i % NAV.cols, i / NAV.cols | 0));
}
function box(w, h, d, mat, x = 0, y = 0, z = 0) {
	const m = new Mesh(new BoxGeometry(w, h, d), mat);
	m.position.set(x, y, z);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}
function makeFigure(opts) {
	const group = new Group();
	const scale = opts.scale ?? 1;
	const coatMat = new MeshStandardMaterial({
		color: opts.coat,
		roughness: .82,
		metalness: .04
	});
	const skinMat = new MeshStandardMaterial({
		color: opts.skin,
		roughness: .7,
		metalness: 0
	});
	const eyeMat = new MeshStandardMaterial({
		color: opts.eyes,
		emissive: opts.eyes,
		emissiveIntensity: .85,
		roughness: .4
	});
	const dark = new MeshStandardMaterial({
		color: 1709588,
		roughness: .6,
		metalness: .2
	});
	const steel = new MeshStandardMaterial({
		color: 9278100,
		roughness: .35,
		metalness: .7
	});
	const wood = new MeshStandardMaterial({
		color: 4861984,
		roughness: .7,
		metalness: .05
	});
	const torso = new Group();
	torso.position.y = 1.05;
	if (opts.hunched) torso.rotation.x = .35;
	torso.add(box(.46, .56, .28, coatMat, 0, .05, 0));
	torso.add(box(.5, .18, .3, coatMat, 0, -.22, .02));
	const head = new Group();
	head.position.set(0, .48, opts.hunched ? .08 : 0);
	head.add(box(.26, .28, .24, skinMat));
	head.add(box(.3, .12, .26, coatMat, 0, .12, 0));
	head.add(box(.05, .04, .03, eyeMat, -.06, .02, .12));
	head.add(box(.05, .04, .03, eyeMat, .06, .02, .12));
	torso.add(head);
	const leftArm = new Group();
	leftArm.position.set(-.32, .18, 0);
	leftArm.add(box(.12, .48, .12, coatMat, 0, -.2, 0));
	const rightArm = new Group();
	rightArm.position.set(.32, .16, .04);
	rightArm.add(box(.12, .46, .12, coatMat, 0, -.18, 0));
	const gun = new Group();
	gun.position.set(.06, -.38, .16);
	const pistol = new Group();
	pistol.add(box(.06, .1, .22, dark, 0, 0, .06));
	pistol.add(box(.05, .12, .05, dark, 0, -.08, -.02));
	const shotgun = new Group();
	shotgun.add(box(.07, .08, .46, wood, 0, 0, .12));
	shotgun.add(box(.04, .04, .5, steel, 0, .05, .14));
	shotgun.visible = false;
	if (opts.rifle) {
		pistol.visible = false;
		shotgun.visible = true;
	}
	gun.add(pistol, shotgun);
	rightArm.add(gun);
	torso.add(leftArm, rightArm);
	if (opts.spikes) {
		const spikeMat = new MeshStandardMaterial({
			color: 2892828,
			roughness: .5,
			metalness: .15
		});
		for (const side of [-1, 1]) {
			const spike = new Mesh(new ConeGeometry(.08, .55, 5), spikeMat);
			spike.position.set(side * .18, .72, -.02);
			spike.rotation.z = side * -.5;
			spike.castShadow = true;
			torso.add(spike);
		}
		const core = new Mesh(new SphereGeometry(.08, 8, 8), eyeMat);
		core.position.set(0, .05, .16);
		torso.add(core);
	}
	const leftLeg = new Group();
	leftLeg.position.set(-.12, .72, 0);
	leftLeg.add(box(.14, .42, .14, dark, 0, -.2, 0));
	leftLeg.add(box(.15, .08, .22, dark, 0, -.42, .04));
	const rightLeg = new Group();
	rightLeg.position.set(.12, .72, 0);
	rightLeg.add(box(.14, .42, .14, dark, 0, -.2, 0));
	rightLeg.add(box(.15, .08, .22, dark, 0, -.42, .04));
	group.add(torso, leftLeg, rightLeg);
	group.scale.setScalar(scale);
	return {
		group,
		parts: {
			leftLeg,
			rightLeg,
			leftArm,
			rightArm,
			torso,
			head,
			gun,
			pistol,
			shotgun,
			coatMat,
			eyeMat
		}
	};
}
function animateFigure(parts, phase, moving, attack, dead) {
	const swing = Math.sin(phase) * moving;
	parts.leftLeg.rotation.x = swing * .7;
	parts.rightLeg.rotation.x = -swing * .7;
	parts.leftArm.rotation.x = -swing * .45 + attack * .2;
	parts.rightArm.rotation.x = -.7 - attack * .8;
	parts.torso.rotation.z = swing * .05;
	parts.torso.position.y = 1.05 + Math.sin(phase * 2) * .015 * moving;
	if (dead > 0) parts.torso.rotation.x = Math.min(1.2, dead * 1.4);
}
function hash(x, y) {
	const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
	return n - Math.floor(n);
}
function makeMaps(paint) {
	const size = 128;
	const color = document.createElement("canvas");
	color.width = color.height = size;
	const cg = color.getContext("2d");
	const img = cg.createImageData(size, size);
	const height = /* @__PURE__ */ new Float32Array(16384);
	const rough = /* @__PURE__ */ new Uint8Array(65536);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		const n = hash(x, y);
		const n2 = hash(x * .5, y * .37);
		const [r, g, b, roughV, h] = [...paint(x, y, n * .65 + n2 * .35), 0];
		const painted = paint(x, y, n * .7 + n2 * .3);
		const i = (y * size + x) * 4;
		img.data[i] = painted[0];
		img.data[i + 1] = painted[1];
		img.data[i + 2] = painted[2];
		img.data[i + 3] = 255;
		height[y * size + x] = painted[3];
		const rv = Math.max(0, Math.min(255, 150 + painted[3] * 80));
		rough[i] = rough[i + 1] = rough[i + 2] = rv;
		rough[i + 3] = 255;
	}
	cg.putImageData(img, 0, 0);
	const map = new CanvasTexture(color);
	map.wrapS = map.wrapT = RepeatWrapping;
	map.colorSpace = SRGBColorSpace;
	map.anisotropy = 4;
	const nd = /* @__PURE__ */ new Uint8Array(65536);
	for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
		const l = height[y * size + (x + size - 1) % size];
		const r = height[y * size + (x + 1) % size];
		const d = height[(y + size - 1) % size * size + x];
		const u = height[(y + 1) % size * size + x];
		const dx = (l - r) * 3.2;
		const dy = (d - u) * 3.2;
		const len = Math.hypot(dx, dy, 1);
		const o = (y * size + x) * 4;
		nd[o] = dx / len * 127 + 128;
		nd[o + 1] = dy / len * 127 + 128;
		nd[o + 2] = 1 / len * 127 + 128;
		nd[o + 3] = 255;
	}
	const normalMap = new DataTexture(nd, size, size);
	normalMap.wrapS = normalMap.wrapT = RepeatWrapping;
	normalMap.colorSpace = "";
	normalMap.needsUpdate = true;
	const roughMap = new DataTexture(rough, size, size);
	roughMap.wrapS = roughMap.wrapT = RepeatWrapping;
	roughMap.colorSpace = "";
	roughMap.needsUpdate = true;
	return {
		map,
		normalMap,
		roughMap
	};
}
function std(color, maps, repeat = 1, metal = .04, rough = .86) {
	const mat = new MeshStandardMaterial({
		color,
		map: maps.map,
		normalMap: maps.normalMap,
		roughnessMap: maps.roughMap,
		roughness: rough,
		metalness: metal
	});
	mat.map.repeat.set(repeat, repeat);
	mat.normalMap.repeat.set(repeat, repeat);
	mat.roughnessMap.repeat.set(repeat, repeat);
	mat.normalScale.set(.55, .55);
	return mat;
}
function makeTextures() {
	const plaster = makeMaps((x, y, n) => {
		const crack = (x + y) % 37 < 1 ? -30 : 0;
		const v = 168 + n * 36 + crack;
		return [
			v,
			v - 8,
			v - 18,
			n
		];
	});
	const wood = makeMaps((x, _y, n) => {
		const v = 92 + Math.sin(x * .45) * 18 + n * 24;
		return [
			v + 20,
			v * .62,
			v * .32,
			n
		];
	});
	const dirt = makeMaps((x, y, n) => {
		const g = 70 + hash(x >> 3, y >> 3) * 30 + n * 20;
		return [
			g + 8,
			g + 4,
			g * .55,
			n
		];
	});
	const stone = makeMaps((x, y, n) => {
		const v = 120 + (((x >> 4) + (y >> 4)) % 2 === 0 ? 12 : -8) + n * 28;
		return [
			v,
			v - 2,
			v - 6,
			n
		];
	});
	const roof = makeMaps((x, y, n) => {
		const v = 70 + (y % 10 < 2 ? -16 : 0) + n * 18;
		return [
			v + 12,
			v * .45,
			v * .38,
			n
		];
	});
	const leaf = makeMaps((_x, _y, n) => {
		const v = 48 + n * 30;
		return [
			v * .7,
			v + 10,
			v * .5,
			n
		];
	});
	const bark = makeMaps((x, _y, n) => {
		const v = 54 + x % 5 * 3 + n * 16;
		return [
			v + 10,
			v * .7,
			v * .4,
			n
		];
	});
	const muralCanvas = document.createElement("canvas");
	muralCanvas.width = 256;
	muralCanvas.height = 256;
	const g = muralCanvas.getContext("2d");
	g.fillStyle = "#2a231c";
	g.fillRect(0, 0, 256, 256);
	g.strokeStyle = "#8a7760";
	g.strokeRect(12, 12, 232, 232);
	g.fillStyle = "#e6d7c3";
	g.font = "64px Palatino, serif";
	g.fillText("I", 48, 110);
	g.fillText("III", 138, 168);
	g.fillText("II", 78, 214);
	g.font = "16px Palatino, serif";
	g.fillStyle = "#cbbba4";
	g.fillText("dawn     dusk     between", 36, 48);
	const muralMap = new CanvasTexture(muralCanvas);
	muralMap.colorSpace = SRGBColorSpace;
	const mural = new MeshStandardMaterial({
		map: muralMap,
		roughness: .9,
		metalness: 0
	});
	return {
		plaster: std(13154468, plaster, 2),
		plasterDark: std(9272688, plaster, 2),
		wood: std(7030320, wood, 2),
		woodDark: std(3810840, wood, 2),
		roof: std(5910568, roof, 3, .08, .75),
		stone: std(9077884, stone, 2),
		dirt: std(6969920, dirt, 6),
		path: std(6050632, stone, 4),
		metal: std(7238520, stone, 1, .72, .38),
		hay: std(9072704, dirt, 2),
		cloth: std(4862e3, plaster, 1),
		bark: std(3811870, bark, 1),
		leaf: std(2371620, leaf, 1),
		window: new MeshStandardMaterial({
			color: 3811864,
			emissive: 16757082,
			emissiveIntensity: 1.4,
			roughness: .35
		}),
		ember: new MeshStandardMaterial({
			color: 3807246,
			emissive: 16738858,
			emissiveIntensity: .15,
			roughness: .5
		}),
		mural
	};
}
function plaque(text) {
	const c = document.createElement("canvas");
	c.width = 128;
	c.height = 64;
	const g = c.getContext("2d");
	g.fillStyle = "#241c16";
	g.fillRect(0, 0, 128, 64);
	g.fillStyle = "#f3eadb";
	g.font = "40px Palatino, serif";
	g.textAlign = "center";
	g.textBaseline = "middle";
	g.fillText(text, 64, 34);
	const map = new CanvasTexture(c);
	map.colorSpace = SRGBColorSpace;
	return new Mesh(new PlaneGeometry(.46, .24), new MeshStandardMaterial({
		map,
		roughness: .8
	}));
}
function groups(member, filter) {
	return (member & 65535) << 16 | filter & 65535;
}
var WORLD_FILTER = groups(1, 2);
function groundY(x, z) {
	if (x > 20.15 && x < 23.85 && z <= -18.7 && z >= -26.3) {
		const t = (-18.7 - z) / (-18.7 - -26.3);
		return -3.6 * Math.min(1, Math.max(0, t));
	}
	if (x > 15.3 && x < 28.7 && z < -24.1 && z > -35.7) return -3.6;
	return 0;
}
function inPit(x, z) {
	return x > 15 && x < 29 && z < -19.55 && z > -36;
}
function onWalkablePit(x, z) {
	return groundY(x, z) < -.05;
}
function buildLevel(scene, world) {
	const tex = makeTextures();
	const body = world.createRigidBody(NC.RigidBodyDesc.fixed());
	const solids = [];
	const fog = 1709592;
	scene.background = new Color(fog);
	scene.fog = new FogExp2(fog, .03);
	const hemi = new HemisphereLight(10137540, 3812386, .78);
	scene.add(hemi);
	const sun = new DirectionalLight(14016750, 1.25);
	sun.position.set(18, 28, 14);
	sun.castShadow = true;
	sun.shadow.mapSize.set(1024, 1024);
	sun.shadow.camera.near = 1;
	sun.shadow.camera.far = 70;
	sun.shadow.camera.left = -22;
	sun.shadow.camera.right = 22;
	sun.shadow.camera.top = 22;
	sun.shadow.camera.bottom = -22;
	sun.shadow.bias = -35e-5;
	const sunTarget = new Object3D();
	scene.add(sunTarget);
	sun.target = sunTarget;
	scene.add(sun);
	const moon = new Mesh(new SphereGeometry(2.2, 16, 12), new MeshBasicMaterial({ color: 14016234 }));
	moon.position.set(-30, 28, -40);
	scene.add(moon);
	function addBox(mat, x, y, z, hx, hy, hz, opts) {
		const mesh = new Mesh(new BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
		mesh.position.set(x, y, z);
		if (opts?.rotX) mesh.rotation.x = opts.rotX;
		mesh.castShadow = opts?.shadow !== false;
		mesh.receiveShadow = true;
		scene.add(mesh);
		const desc = NC.ColliderDesc.cuboid(hx, hy, hz).setTranslation(x, y, z).setCollisionGroups(WORLD_FILTER);
		if (opts?.rotX) {
			const q = new Quaternion().setFromEuler(new Euler(opts.rotX, 0, 0));
			desc.setRotation({
				x: q.x,
				y: q.y,
				z: q.z,
				w: q.w
			});
		}
		world.createCollider(desc, body);
		if (opts?.solid !== false && !opts?.rotX) solids.push({
			minX: x - hx,
			maxX: x + hx,
			minZ: z - hz,
			maxZ: z + hz
		});
		return mesh;
	}
	function addCylinder(mat, x, y, z, r, hy, segs = 8, visual = true) {
		if (visual) {
			const mesh = new Mesh(new CylinderGeometry(r, r * 1.05, hy * 2, segs), mat);
			mesh.position.set(x, y, z);
			mesh.castShadow = true;
			mesh.receiveShadow = true;
			scene.add(mesh);
		}
		world.createCollider(NC.ColliderDesc.cylinder(hy, r).setTranslation(x, y, z).setCollisionGroups(WORLD_FILTER), body);
		solids.push({
			minX: x - r,
			maxX: x + r,
			minZ: z - r,
			maxZ: z + r
		});
	}
	const slab = (x0, x1, z0, z1) => {
		const hx = (x1 - x0) / 2;
		const hz = (z1 - z0) / 2;
		addBox(tex.dirt, (x0 + x1) / 2, -.5, (z0 + z1) / 2, hx, .5, hz, {
			solid: false,
			shadow: false
		});
	};
	slab(-44, 15, -50, 56);
	slab(29, 44, -50, 56);
	slab(15, 29, -50, -36);
	slab(15, 29, -19.55, 56);
	addBox(tex.stone, 22, -3.75, -30, 7, .15, 6, {
		solid: false,
		shadow: false
	});
	const rampAngle = -Math.atan2(3.6, 7.6);
	addBox(tex.wood, 22, -1.85, -22.5, 1.15, .12, 3.85, {
		solid: false,
		rotX: rampAngle,
		shadow: false
	});
	addBox(tex.bark, -40, 1.6, 2, .4, 1.6, 52, { shadow: false });
	addBox(tex.bark, 40, 1.6, 2, .4, 1.6, 52, { shadow: false });
	addBox(tex.bark, 0, 1.6, -48, 40, 1.6, .4, { shadow: false });
	addBox(tex.bark, 0, 1.6, 52, 40, 1.6, .4, { shadow: false });
	addBox(tex.woodDark, -7.2, .7, 35, .12, .7, 13);
	addBox(tex.woodDark, 7.2, .7, 35, .12, .7, 13);
	const path = new Mesh(new BoxGeometry(5.2, .04, 30), tex.path);
	path.position.set(0, .03, 36);
	path.receiveShadow = true;
	scene.add(path);
	const square = new Mesh(new BoxGeometry(26, .04, 24), tex.stone);
	square.position.set(0, .025, 8);
	square.receiveShadow = true;
	scene.add(square);
	function building(minX, maxX, minZ, maxZ, height, wall, roof, door, wallBottom = 0) {
		const t = .28;
		const hy = (height - wallBottom) / 2;
		const y = wallBottom + hy;
		const spanX = maxX - minX;
		const spanZ = maxZ - minZ;
		const place = (x, z, hx, hz, y0 = y, h = hy) => {
			if (hx < .05 || hz < .05 || h < .05) return;
			addBox(wall, x, y0, z, hx, h, hz);
		};
		const south = door?.side === "s";
		const north = door?.side === "n";
		const east = door?.side === "e";
		const west = door?.side === "w";
		if (!south) place((minX + maxX) / 2, maxZ - t / 2, spanX / 2, t / 2);
		else splitZ(maxZ - t / 2, t / 2, "x");
		if (!north) place((minX + maxX) / 2, minZ + t / 2, spanX / 2, t / 2);
		else splitZ(minZ + t / 2, t / 2, "x");
		if (!east) place(maxX - t / 2, (minZ + maxZ) / 2, t / 2, spanZ / 2);
		else splitZ(maxX - t / 2, t / 2, "z");
		if (!west) place(minX + t / 2, (minZ + maxZ) / 2, t / 2, spanZ / 2);
		else splitZ(minX + t / 2, t / 2, "z");
		function splitZ(fixed, thick, axis) {
			if (!door) return;
			const along0 = axis === "x" ? minX : minZ;
			const along1 = axis === "x" ? maxX : maxZ;
			const a = door.center - door.width / 2;
			const b = door.center + door.width / 2;
			const segs = [[along0, a], [b, along1]];
			for (const [s0, s1] of segs) {
				if (s1 - s0 < .1) continue;
				const mid = (s0 + s1) / 2;
				const half = (s1 - s0) / 2;
				if (axis === "x") place(mid, fixed, half, thick);
				else place(fixed, mid, thick, half);
			}
			const lintelH = height - 2.45;
			if (lintelH > .1) {
				const ly = 2.45 + lintelH / 2;
				if (axis === "x") place(door.center, fixed, door.width / 2, thick, ly, lintelH / 2);
				else place(fixed, door.center, thick, door.width / 2, ly, lintelH / 2);
			}
		}
		addBox(roof, (minX + maxX) / 2, height + .12, (minZ + maxZ) / 2, spanX / 2 + .4, .14, spanZ / 2 + .4, { solid: false });
	}
	building(-8.2, -2.2, 43.2, 49.2, 3.1, tex.plasterDark, tex.roof, {
		side: "e",
		center: 46.2,
		width: 2.2
	});
	addBox(tex.wood, -6.4, .45, 47.4, .55, .45, .35);
	building(-28, -16, .4, 12.2, 4.3, tex.plaster, tex.roof, {
		side: "e",
		center: 6.2,
		width: 1.8
	});
	addBox(tex.wood, -24.2, .75, 8.2, .7, .4, .4);
	addBox(tex.woodDark, -25.2, .35, 3.2, .4, .35, .4);
	const millWin = new Mesh(new BoxGeometry(.15, .7, 1), tex.window);
	millWin.position.set(-28.05, 2.1, 6);
	scene.add(millWin);
	const millLight = new PointLight(16757082, 1.3, 8, 1.6);
	millLight.position.set(-24, 2.2, 6);
	scene.add(millLight);
	building(12.2, 22.4, 3.6, 14.2, 3.8, tex.plaster, tex.roof, {
		side: "w",
		center: 9,
		width: 1.8
	});
	addBox(tex.wood, 18.2, .7, 10.2, .8, .45, .35);
	addBox(tex.woodDark, 16.4, .4, 6.2, .35, .4, .35);
	const cotWin = new Mesh(new BoxGeometry(.12, .7, 1.1), tex.window);
	cotWin.position.set(22.45, 1.9, 8);
	scene.add(cotWin);
	const cotLight = new PointLight(16757082, 1.1, 7, 1.6);
	cotLight.position.set(18, 2, 9);
	scene.add(cotLight);
	building(14, 30, -36, -8, 5.2, tex.woodDark, tex.roof, {
		side: "s",
		center: 22,
		width: 2.3
	}, -4);
	addBox(tex.woodDark, 19.65, -1.3, -22.6, .16, 1.7, 3.5);
	addBox(tex.woodDark, 24.35, -1.3, -22.6, .16, 1.7, 3.5);
	addBox(tex.hay, 26.4, .55, -15.2, .8, .55, .6);
	addBox(tex.wood, 26.2, .4, -11.2, .45, .4, .4);
	const barnLight = new PointLight(16752720, 1.2, 10, 1.5);
	barnLight.position.set(22, 2.4, -14);
	scene.add(barnLight);
	const mural = new Mesh(new PlaneGeometry(1.8, 1.8), tex.mural);
	mural.position.set(15.35, -2.1, -30);
	mural.rotation.y = Math.PI / 2;
	scene.add(mural);
	const braziers = [];
	for (const [x, z, label] of [
		[
			18,
			-28.2,
			"I"
		],
		[
			22,
			-33.2,
			"II"
		],
		[
			26,
			-28.2,
			"III"
		]
	]) {
		addBox(tex.stone, x, -3.15, z, .28, .45, .28, { solid: false });
		const bowlMat = tex.ember.clone();
		const bowl = new Mesh(new CylinderGeometry(.22, .16, .16, 8), bowlMat);
		bowl.position.set(x, -2.62, z);
		scene.add(bowl);
		const light = new PointLight(16738858, 0, 6, 2);
		light.position.set(x, -2.2, z);
		scene.add(light);
		const tag = plaque(label);
		tag.position.set(x, -2.15, z + .42);
		scene.add(tag);
		braziers.push({
			light,
			mat: bowlMat
		});
	}
	const chest = new Group();
	chest.position.set(22, -3.25, -30.4);
	const chestBase = new Mesh(new BoxGeometry(.9, .45, .55), tex.woodDark);
	chestBase.castShadow = true;
	chest.add(chestBase);
	const chestLid = new Mesh(new BoxGeometry(.92, .12, .57), tex.metal);
	chestLid.position.set(0, .28, -.2);
	chestLid.geometry.translate(0, 0, .28);
	chest.add(chestLid);
	scene.add(chest);
	world.createCollider(NC.ColliderDesc.cuboid(.5, .3, .32).setTranslation(22, -3.2, -30.4).setCollisionGroups(WORLD_FILTER), body);
	solids.push({
		minX: 21.4,
		maxX: 22.6,
		minZ: -30.8,
		maxZ: -30
	});
	building(-9, 9, -46, -28, 6.2, tex.plasterDark, tex.roof, {
		side: "s",
		center: 0,
		width: 2.3
	});
	const steeple = new Mesh(new BoxGeometry(1.6, 8, 1.6), tex.plaster);
	steeple.position.set(0, 10, -40);
	steeple.castShadow = true;
	scene.add(steeple);
	const spire = new Mesh(new ConeGeometry(1.3, 3.2, 4), tex.roof);
	spire.position.set(0, 15.2, -40);
	spire.castShadow = true;
	scene.add(spire);
	for (const z of [
		-34.2,
		-37.4,
		-40.6
	]) {
		addBox(tex.wood, -4.1, .45, z, 1.5, .45, .32);
		addBox(tex.wood, 4.1, .45, z, 1.5, .45, .32);
	}
	addBox(tex.stone, 0, .55, -43.6, 1.3, .55, .5);
	const altarLight = new PointLight(16757082, 1.6, 12, 1.4);
	altarLight.position.set(0, 2.2, -43);
	scene.add(altarLight);
	const chapelWin = new Mesh(new BoxGeometry(.8, 1.6, .12), tex.window);
	chapelWin.position.set(-9.05, 3, -38);
	scene.add(chapelWin);
	function makeDoor(x, z, rotY, hx, hz, gap) {
		const hinge = new Group();
		hinge.position.set(x, 0, z);
		hinge.rotation.y = rotY;
		const panel = new Mesh(new BoxGeometry(hx * 2, 2.4, .12), tex.woodDark);
		panel.position.set(hx, 1.2, 0);
		panel.castShadow = true;
		hinge.add(panel);
		scene.add(hinge);
		const collider = world.createCollider(NC.ColliderDesc.cuboid(Math.max(hx, hz), 1.2, Math.max(.12, Math.min(hx, hz) + .05)).setTranslation(x + Math.sin(rotY) * hx, 1.2, z + Math.cos(rotY) * hx).setCollisionGroups(WORLD_FILTER), body);
		world.removeCollider(collider, true);
		const cx = (gap.minX + gap.maxX) / 2;
		const cz = (gap.minZ + gap.maxZ) / 2;
		const chx = (gap.maxX - gap.minX) / 2;
		const chz = (gap.maxZ - gap.minZ) / 2;
		const doorCol = world.createCollider(NC.ColliderDesc.cuboid(chx, 1.2, chz).setTranslation(cx, 1.2, cz).setCollisionGroups(WORLD_FILTER), body);
		solids.push({ ...gap });
		return {
			hinge,
			collider: doorCol,
			gap
		};
	}
	const barnDoor = makeDoor(20.85, -8.15, 0, 1.15, .08, {
		minX: 20.85,
		maxX: 23.15,
		minZ: -8.45,
		maxZ: -7.75
	});
	const chapelDoor = makeDoor(-1.15, -28.15, 0, 1.15, .08, {
		minX: -1.15,
		maxX: 1.15,
		minZ: -28.5,
		maxZ: -27.75
	});
	addCylinder(tex.stone, 1.2, .45, 7.6, .85, .45, 10);
	const wellRoof = new Mesh(new BoxGeometry(1.6, .12, .2), tex.wood);
	wellRoof.position.set(1.2, 1.7, 7.6);
	scene.add(wellRoof);
	addBox(tex.wood, 1.2, 1.15, 6.9, .08, .7, .08, { solid: false });
	addBox(tex.wood, 1.2, 1.15, 8.3, .08, .7, .08, { solid: false });
	const wellLight = new PointLight(16761466, 1.5, 9, 1.6);
	wellLight.position.set(1.2, 1.8, 7.6);
	scene.add(wellLight);
	addBox(tex.wood, 6.6, .4, 11.2, .45, .4, .45);
	addBox(tex.woodDark, -8.2, .35, 12.4, .9, .35, .4);
	addBox(tex.wood, 3.2, .35, 37.2, .4, .35, .4);
	addBox(tex.wood, -2.4, .9, 4.2, .15, .9, .15);
	for (const [x, z] of [
		[-6.2, -22.5],
		[-3.4, -23.2],
		[2.8, -22.8],
		[5.6, -23.4],
		[-1, -21.6]
	]) addBox(tex.stone, x, .45, z, .28, .45, .12);
	const trunkGeo = new CylinderGeometry(.18, .28, 2.4, 5);
	const crownGeo = new ConeGeometry(1.25, 3.1, 6);
	const count = 70;
	const trunks = new InstancedMesh(trunkGeo, tex.bark, count);
	const crowns = new InstancedMesh(crownGeo, tex.leaf, count);
	trunks.castShadow = true;
	crowns.castShadow = true;
	const dummy = new Object3D();
	const cover = [
		[-9.5, 16],
		[9.2, 17.5],
		[-5.5, -1.5],
		[11.5, -3.5],
		[-12, -12],
		[8, -16]
	];
	let ti = 0;
	const placeTree = (x, z, s, collide) => {
		dummy.position.set(x, 1.2, z);
		dummy.scale.setScalar(s);
		dummy.rotation.set(0, 0, 0);
		dummy.updateMatrix();
		trunks.setMatrixAt(ti, dummy.matrix);
		dummy.position.set(x, 3.1 * s, z);
		dummy.updateMatrix();
		crowns.setMatrixAt(ti, dummy.matrix);
		ti++;
		if (collide) addCylinder(tex.bark, x, 1.1, z, .28, 1.1, 6, false);
	};
	for (const [x, z] of cover) placeTree(x, z, 1, true);
	for (; ti < count; ti++) {
		const ang = ti / count * Math.PI * 10.5;
		const rad = 22 + ti % 7 * 2.4;
		let x = Math.cos(ang) * rad;
		let z = Math.sin(ang) * rad * .85 + 4;
		if (Math.abs(x) < 12 && z > 20 && z < 50) x += x < 0 ? -8 : 8;
		dummy.position.set(x, 1.2, z);
		const s = .8 + ti % 5 * .12;
		dummy.scale.setScalar(s);
		dummy.rotation.y = ang;
		dummy.updateMatrix();
		trunks.setMatrixAt(ti, dummy.matrix);
		dummy.position.y = 3 * s;
		dummy.updateMatrix();
		crowns.setMatrixAt(ti, dummy.matrix);
	}
	trunks.instanceMatrix.needsUpdate = true;
	crowns.instanceMatrix.needsUpdate = true;
	scene.add(trunks, crowns);
	const dustGeo = new SphereGeometry(.04, 4, 4);
	const dustMat = new MeshBasicMaterial({
		color: 13156018,
		transparent: true,
		opacity: .28
	});
	const dust = new InstancedMesh(dustGeo, dustMat, 40);
	const dustBase = [];
	for (let i = 0; i < 40; i++) {
		const v = new Vector3((Math.random() - .5) * 30, .4 + Math.random() * 3, (Math.random() - .5) * 30);
		dustBase.push(v);
		dummy.position.copy(v);
		dummy.scale.setScalar(.6 + Math.random());
		dummy.updateMatrix();
		dust.setMatrixAt(i, dummy.matrix);
	}
	dust.instanceMatrix.needsUpdate = true;
	dust.userData.bases = dustBase;
	scene.add(dust);
	const blocked = bakeNav(solids);
	const playerLight = new PointLight(16760969, 1.55, 12, 1.6);
	scene.add(playerLight);
	const muzzle = new PointLight(16769200, 0, 6, 2);
	scene.add(muzzle);
	return {
		textures: tex,
		blocked,
		solids,
		interacts: [
			{
				id: "radio-ash",
				kind: "radio",
				x: -5.6,
				y: 1.1,
				z: 47.2,
				radius: 1.6,
				prompt: "Field radio — record progress",
				checkpoint: "ash"
			},
			{
				id: "crate-road",
				kind: "loot",
				x: 3.2,
				y: .7,
				z: 37.2,
				radius: 1.5,
				prompt: "Pry the roadside crate",
				loot: [{
					kind: "pistolAmmo",
					qty: 18
				}]
			},
			{
				id: "crate-square",
				kind: "loot",
				x: 6.6,
				y: .8,
				z: 11.2,
				radius: 1.5,
				prompt: "Search the square crate",
				loot: [{ kind: "herb" }, {
					kind: "pistolAmmo",
					qty: 12
				}]
			},
			{
				id: "radio-square",
				kind: "radio",
				x: -2.4,
				y: 1.4,
				z: 4.2,
				radius: 1.6,
				prompt: "Notice-board radio — record progress",
				checkpoint: "square"
			},
			{
				id: "desk-mill",
				kind: "loot",
				x: -24.2,
				y: 1.1,
				z: 8.2,
				radius: 1.5,
				prompt: "Search the sexton’s desk",
				loot: [{ kind: "barnKey" }, {
					kind: "pistolAmmo",
					qty: 18
				}]
			},
			{
				id: "note-mill",
				kind: "note",
				x: -23.2,
				y: 1.15,
				z: 8.6,
				radius: 1.4,
				prompt: "Read the scrap on the desk",
				loot: [{ kind: "note" }]
			},
			{
				id: "cabinet-cottage",
				kind: "loot",
				x: 18.2,
				y: 1.05,
				z: 10.2,
				radius: 1.5,
				prompt: "Open the cottage cabinet",
				loot: [{ kind: "shotgun" }, {
					kind: "shells",
					qty: 12
				}]
			},
			{
				id: "herb-cottage",
				kind: "loot",
				x: 16.4,
				y: .9,
				z: 6.2,
				radius: 1.4,
				prompt: "Take the bitter green",
				loot: [{ kind: "herb" }]
			},
			{
				id: "door-barn",
				kind: "door",
				x: 22,
				y: 1.2,
				z: -8.2,
				radius: 1.8,
				prompt: "Barn door",
				door: "barn"
			},
			{
				id: "crate-barn",
				kind: "loot",
				x: 26.2,
				y: .8,
				z: -11.2,
				radius: 1.5,
				prompt: "Search the barn crate",
				loot: [{
					kind: "shells",
					qty: 8
				}]
			},
			{
				id: "brazier-1",
				kind: "brazier",
				x: 18,
				y: -2.4,
				z: -28.2,
				radius: 1.4,
				prompt: "Light the dawn brazier (I)",
				brazier: 0
			},
			{
				id: "brazier-2",
				kind: "brazier",
				x: 22,
				y: -2.4,
				z: -33.2,
				radius: 1.4,
				prompt: "Light the middle brazier (II)",
				brazier: 1
			},
			{
				id: "brazier-3",
				kind: "brazier",
				x: 26,
				y: -2.4,
				z: -28.2,
				radius: 1.4,
				prompt: "Light the dusk brazier (III)",
				brazier: 2
			},
			{
				id: "chest",
				kind: "chest",
				x: 22,
				y: -2.8,
				z: -30.4,
				radius: 1.6,
				prompt: "Iron chest",
				loot: [
					{ kind: "sigil" },
					{ kind: "herb" },
					{
						kind: "shells",
						qty: 8
					},
					{
						kind: "pistolAmmo",
						qty: 18
					}
				]
			},
			{
				id: "radio-chapel",
				kind: "radio",
				x: 5.2,
				y: 1.1,
				z: -25.4,
				radius: 1.6,
				prompt: "Gate radio — record progress",
				checkpoint: "chapel"
			},
			{
				id: "door-chapel",
				kind: "door",
				x: 0,
				y: 1.2,
				z: -28.1,
				radius: 1.8,
				prompt: "Chapel doors",
				door: "chapel"
			}
		],
		doors: {
			barn: barnDoor,
			chapel: chapelDoor
		},
		braziers,
		chestLid,
		spawns: [
			{
				id: "e-road",
				kind: "shambler",
				x: 2.8,
				z: 31.2,
				yaw: Math.PI,
				waypoints: [
					{
						x: 2.4,
						z: 34
					},
					{
						x: -2.2,
						z: 29.5
					},
					{
						x: 1.8,
						z: 27.5
					}
				]
			},
			{
				id: "e-road2",
				kind: "shambler",
				x: -3.4,
				z: 23.6,
				yaw: 0,
				waypoints: [{
					x: -2.2,
					z: 21.5
				}, {
					x: 2.4,
					z: 24.5
				}]
			},
			{
				id: "e-sq1",
				kind: "shambler",
				x: -6,
				z: 9,
				yaw: .4,
				waypoints: [
					{
						x: -6,
						z: 12
					},
					{
						x: -2,
						z: 8
					},
					{
						x: -8,
						z: 5
					}
				]
			},
			{
				id: "e-sq2",
				kind: "shambler",
				x: 7,
				z: 6,
				yaw: -.6,
				waypoints: [
					{
						x: 8,
						z: 10
					},
					{
						x: 4,
						z: 5
					},
					{
						x: 9,
						z: 3
					}
				]
			},
			{
				id: "e-sq3",
				kind: "shambler",
				x: -1,
				z: 1.5,
				yaw: 1,
				waypoints: [
					{
						x: -3,
						z: 2
					},
					{
						x: 2,
						z: -1
					},
					{
						x: 0,
						z: 4
					}
				]
			},
			{
				id: "e-mark",
				kind: "marksman",
				x: 16.5,
				z: -3.5,
				yaw: Math.PI,
				waypoints: [
					{
						x: 16,
						z: -2
					},
					{
						x: 12.5,
						z: -5
					},
					{
						x: 18,
						z: -1
					}
				]
			},
			{
				id: "e-mill",
				kind: "shambler",
				x: -22,
				z: 6,
				yaw: 0,
				waypoints: [
					{
						x: -24,
						z: 4
					},
					{
						x: -20,
						z: 8
					},
					{
						x: -25,
						z: 9
					}
				]
			},
			{
				id: "e-cot",
				kind: "shambler",
				x: 17,
				z: 8,
				yaw: Math.PI,
				waypoints: [{
					x: 16,
					z: 7
				}, {
					x: 19,
					z: 11
				}]
			},
			{
				id: "e-barn",
				kind: "shambler",
				x: 20,
				z: -13,
				yaw: 0,
				waypoints: [{
					x: 19,
					z: -12
				}, {
					x: 24,
					z: -15
				}]
			},
			{
				id: "e-barn2",
				kind: "shambler",
				x: 25,
				z: -16,
				yaw: 1,
				waypoints: [{
					x: 24,
					z: -14
				}, {
					x: 21,
					z: -17
				}]
			},
			{
				id: "e-cellar",
				kind: "shambler",
				x: 24,
				z: -31,
				yaw: Math.PI,
				waypoints: [{
					x: 20,
					z: -29
				}, {
					x: 25,
					z: -33
				}]
			},
			{
				id: "boss",
				kind: "boss",
				x: 0,
				z: -40.5,
				yaw: 0,
				waypoints: [{
					x: 0,
					z: -40
				}]
			}
		],
		playerLight,
		muzzle,
		sun,
		sunTarget,
		dust
	};
}
function bakeNav(extra, openGaps = []) {
	const blocked = new Uint8Array(NAV.cols * NAV.rows);
	for (let r = 0; r < NAV.rows; r++) for (let c = 0; c < NAV.cols; c++) {
		const x = NAV.originX + (c + .5) * NAV.cell;
		const z = NAV.originZ + (r + .5) * NAV.cell;
		let hit = false;
		if (inPit(x, z) && !onWalkablePit(x, z)) hit = true;
		if (!hit) {
			for (const s of extra) if (x > s.minX - .35 && x < s.maxX + .35 && z > s.minZ - .35 && z < s.maxZ + .35) {
				hit = true;
				break;
			}
		}
		if (hit) {
			for (const g of openGaps) if (x > g.minX && x < g.maxX && z > g.minZ && z < g.maxZ) {
				hit = false;
				break;
			}
		}
		if (hit) blocked[r * NAV.cols + c] = 1;
	}
	return blocked;
}
var CHECKPOINTS = {
	ash: {
		x: -1.1,
		y: .8,
		z: 44.6,
		yaw: 0
	},
	square: {
		x: -1.2,
		y: .8,
		z: 5.4,
		yaw: 0
	},
	chapel: {
		x: 4.4,
		y: .8,
		z: -25.2,
		yaw: .35
	}
};
function face(e, x, z, px, pz) {
	e.yaw = Math.atan2(-(px - x), -(pz - z));
}
function steer(e, x, z, tx, tz, ctx) {
	if (e.pathCd <= 0) {
		e.path = findPath(ctxBlocked(ctx), x, z, tx, tz) ?? [];
		e.pathI = 0;
		e.pathCd = e.kind === "boss" ? .35 : .5;
	}
	let gx = tx;
	let gz = tz;
	if (e.path.length) {
		while (e.pathI < e.path.length - 1) {
			const wp = e.path[e.pathI];
			if (Math.hypot(wp.x - x, wp.z - z) < .85) e.pathI++;
			else break;
		}
		const wp = e.path[Math.min(e.pathI, e.path.length - 1)];
		gx = wp.x;
		gz = wp.z;
	}
	let sx = 0;
	let sz = 0;
	for (const a of ctx.allies) {
		if (a.id === e.id) continue;
		const dx = x - a.x;
		const dz = z - a.z;
		const d = Math.hypot(dx, dz);
		if (d > .001 && d < 1.15) {
			sx += dx / d;
			sz += dz / d;
		}
	}
	let mx = gx - x + sx * .9;
	let mz = gz - z + sz * .9;
	const mag = Math.hypot(mx, mz);
	if (mag < .08) {
		e.wishX = 0;
		e.wishZ = 0;
		return;
	}
	e.wishX = mx / mag * e.speed;
	e.wishZ = mz / mag * e.speed;
	e.yaw = Math.atan2(-mx, -mz);
}
var blockedRef = { grid: null };
function ctxBlocked(ctx) {
	return blockedRef.grid ?? new Uint8Array(NAV.cols * NAV.rows);
}
function setNavGrid(grid) {
	blockedRef.grid = grid;
}
function begin(e, kind, windup, recover) {
	e.state = "attack";
	e.attack = kind;
	e.stateTime = 0;
	e.strikeAt = windup;
	e.struck = false;
	e.cooldown = windup + recover;
	e.wishX = 0;
	e.wishZ = 0;
}
function planEnemy(e, ctx) {
	const dt = ctx.dt;
	const p = e.body.translation();
	const x = p.x;
	const z = p.z;
	e.flash = Math.max(0, e.flash - dt);
	if (e.state === "dead") {
		e.deadT += dt;
		e.wishX = 0;
		e.wishZ = 0;
		e.vy = 0;
		return;
	}
	if (!e.active) {
		e.wishX = 0;
		e.wishZ = 0;
		e.vy = 0;
		return;
	}
	e.cooldown = Math.max(0, e.cooldown - dt);
	e.pathCd = Math.max(0, e.pathCd - dt);
	e.groan -= dt;
	e.stateTime += dt;
	const dx = ctx.player.x - x;
	const dz = ctx.player.z - z;
	const dist = Math.hypot(dx, dz) || 1e-4;
	const see = dist < e.vision && ctx.los(x, p.y + .35, z, ctx.player.x, ctx.player.y + .2, ctx.player.z) && dx * -Math.sin(e.yaw) + dz * -Math.cos(e.yaw) > dist * .15;
	if ((e.state === "patrol" || e.state === "investigate") && e.kind !== "boss") {
		for (const n of ctx.noises) if (Math.hypot(n.x - x, n.z - z) < n.r) {
			e.state = "investigate";
			e.investigate = {
				x: n.x,
				z: n.z
			};
			e.pathCd = 0;
			e.stateTime = 0;
		}
	}
	if (see && e.state !== "attack" && e.state !== "stagger") {
		if (e.state !== "chase" && e.groan <= 0) {
			ctx.onGroan(e, e.kind === "boss");
			e.groan = e.kind === "boss" ? 4 : 2.4;
		}
		e.state = "chase";
		e.investigate = {
			x: ctx.player.x,
			z: ctx.player.z
		};
	}
	if (e.kind === "boss") {
		const phase = e.hp < e.maxHp * .3 ? 3 : e.hp < e.maxHp * .6 ? 2 : 1;
		if (phase !== e.phase) {
			e.phase = phase;
			ctx.onPhase(phase);
		}
	}
	if (e.state === "stagger") {
		e.wishX = 0;
		e.wishZ = 0;
		if (e.stateTime > .38) {
			e.state = "chase";
			e.stateTime = 0;
		}
	} else if (e.state === "attack") {
		if (e.attack === "charge" && e.stateTime >= e.strikeAt) {
			e.wishX = e.chargeX * (e.phase >= 3 ? 8.5 : 7.2);
			e.wishZ = e.chargeZ * (e.phase >= 3 ? 8.5 : 7.2);
			if (dist < e.radius + .85) ctx.damagePlayer(e.damage, x, z);
			if (e.stateTime > e.strikeAt + .9) {
				e.state = "chase";
				e.stateTime = 0;
			}
		} else {
			e.wishX = 0;
			e.wishZ = 0;
			face(e, x, z, ctx.player.x, ctx.player.z);
			if (e.attack !== "charge" && e.stateTime > e.strikeAt + .4) {
				e.state = "chase";
				e.stateTime = 0;
			}
		}
	} else if (e.state === "investigate" && e.investigate) {
		if (Math.hypot(e.investigate.x - x, e.investigate.z - z) < 1.1) {
			e.wishX = 0;
			e.wishZ = 0;
			if (e.stateTime > 2.2) {
				e.state = "patrol";
				e.stateTime = 0;
				e.investigate = null;
			}
		} else steer(e, x, z, e.investigate.x, e.investigate.z, ctx);
	} else if (e.state === "chase") {
		const wantAttack = e.cooldown <= 0;
		if (e.kind === "marksman") {
			if (dist < 4.5) steer(e, x, z, x - dx / dist * 4, z - dz / dist * 4, ctx);
			else if (wantAttack && dist < e.vision && see) {
				const len = dist;
				e.chargeX = dx / len;
				e.chargeZ = dz / len;
				begin(e, "shot", .48, 1.15);
				face(e, x, z, ctx.player.x, ctx.player.z);
			} else if (dist > 11) steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
			else {
				e.wishX = 0;
				e.wishZ = 0;
				face(e, x, z, ctx.player.x, ctx.player.z);
			}
		} else if (e.kind === "boss") {
			if (wantAttack && e.phase >= 3 && dist > 3.5 && dist < 11) {
				e.chargeX = dx / dist;
				e.chargeZ = dz / dist;
				begin(e, "charge", .62, 1.4);
				face(e, x, z, ctx.player.x, ctx.player.z);
			} else if (wantAttack && e.phase >= 2 && dist > 2.4 && dist < 8.5) {
				begin(e, "wave", .5, 1.6);
				face(e, x, z, ctx.player.x, ctx.player.z);
			} else if (wantAttack && dist < e.range) {
				begin(e, "slam", .58, 1.05);
				face(e, x, z, ctx.player.x, ctx.player.z);
			} else if (dist < e.radius + 1.05) {
				e.wishX = 0;
				e.wishZ = 0;
				face(e, x, z, ctx.player.x, ctx.player.z);
			} else steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
		} else if (wantAttack && dist < e.range) {
			begin(e, "melee", .42, .85);
			face(e, x, z, ctx.player.x, ctx.player.z);
		} else if (dist < e.radius + .95) {
			e.wishX = 0;
			e.wishZ = 0;
			face(e, x, z, ctx.player.x, ctx.player.z);
		} else steer(e, x, z, ctx.player.x, ctx.player.z, ctx);
	} else {
		const wp = e.waypoints[e.wp] ?? {
			x,
			z
		};
		if (Math.hypot(wp.x - x, wp.z - z) < .75) {
			e.wishX = 0;
			e.wishZ = 0;
			e.wait += dt;
			if (e.wait > 1.15) {
				e.wp = (e.wp + 1) % Math.max(1, e.waypoints.length);
				e.wait = 0;
				e.pathCd = 0;
			}
		} else {
			e.wait = 0;
			steer(e, x, z, wp.x, wp.z, ctx);
		}
	}
	if (e.state !== "attack" && e.state !== "stagger") {
		const moved = Math.hypot(x - e.lastX, z - e.lastZ);
		if (e.wishX * e.wishX + e.wishZ * e.wishZ > .2 && moved < .015) e.stuck += dt;
		else e.stuck = 0;
		if (e.stuck > .8) {
			e.stuck = 0;
			e.pathCd = 0;
			e.wishX += (Math.random() - .5) * e.speed;
			e.wishZ += (Math.random() - .5) * e.speed;
		}
	}
	e.lastX = x;
	e.lastZ = z;
	const gy = groundY(x, z) + e.feet;
	e.vy += -22 * dt;
	if (e.vy < -28) e.vy = -28;
	if (p.y <= gy + .08 && e.vy < 0) e.vy = -2.2;
}
function resolveEnemy(e, ctx) {
	if (e.state !== "attack" || e.struck || e.stateTime < e.strikeAt) return;
	if (e.attack === "charge") return;
	e.struck = true;
	const p = e.body.translation();
	const dist = Math.hypot(ctx.player.x - p.x, ctx.player.z - p.z);
	if (e.attack === "melee" || e.attack === "slam") {
		if (dist < e.range + .25) ctx.damagePlayer(e.damage, p.x, p.z);
	} else if (e.attack === "shot") {
		const dx = ctx.player.x - p.x;
		const dy = ctx.player.y - p.y;
		const dz = ctx.player.z - p.z;
		const len = Math.hypot(dx, dy, dz) || 1;
		ctx.spawnShot(p.x, p.y + .4, p.z, dx / len, dy / len, dz / len, e.damage);
	} else if (e.attack === "wave") ctx.startWave(p.x, p.z, e.damage);
}
function hurtEnemy(e, dmg, head) {
	if (e.state === "dead" || !e.active && e.kind === "boss") return false;
	e.hp -= dmg;
	e.flash = .14;
	if (e.hp <= 0) {
		e.hp = 0;
		e.state = "dead";
		e.stateTime = 0;
		e.deadT = 0;
		e.wishX = 0;
		e.wishZ = 0;
		e.collider.setSensor(true);
		return true;
	}
	if (e.kind !== "boss" && (head || dmg >= 30)) {
		e.state = "stagger";
		e.stateTime = 0;
	} else if (e.state === "patrol" || e.state === "investigate") {
		e.state = "chase";
		e.stateTime = 0;
	}
	e.active = true;
	return false;
}
var STEP = 1 / 60;
var ORDER = [
	0,
	2,
	1
];
var Engine = class Engine {
	audio = new AudioBus();
	canvas;
	renderer;
	scene = new Scene();
	camera = new PerspectiveCamera(62, 1, .08, 160);
	composer = null;
	bloom = null;
	world;
	level;
	playerBody;
	playerCol;
	playerCtl;
	playerMesh;
	playerParts;
	enemies = [];
	shots = [];
	waves = [];
	sparks = [];
	actorCols = /* @__PURE__ */ new Set();
	keys = /* @__PURE__ */ new Set();
	mouseX = 0;
	mouseY = 0;
	fireDown = false;
	fireEdge = false;
	meleeEdge = false;
	interactEdge = false;
	reloadEdge = false;
	dodgeEdge = false;
	touchX = 0;
	touchY = 0;
	touchActive = false;
	lookDrag = false;
	fallbackLook = false;
	yaw = 0;
	pitch = 0;
	recoil = 0;
	yawKick = 0;
	vx = 0;
	vz = 0;
	vy = 0;
	speed = 0;
	bob = 0;
	shake = 0;
	iframe = 0;
	dodgeT = 0;
	dodgeCd = 0;
	dodgeX = 0;
	dodgeZ = 0;
	stamina = 100;
	health = 100;
	equipped = "pistol";
	magPistol = 12;
	magShotgun = 0;
	fireCd = 0;
	reloadT = 0;
	reloading = false;
	foot = 0;
	items = [];
	flags = emptyFlags();
	lit = [
		false,
		false,
		false
	];
	puzzleStep = 0;
	looted = /* @__PURE__ */ new Set();
	checkpoint = "ash";
	difficulty = "normal";
	noises = [];
	mode = "attract";
	attract = 0;
	clock = 0;
	acc = 0;
	last = 0;
	raf = 0;
	subtitleT = 0;
	toastT = 0;
	winT = 0;
	objective = "";
	pubAt = 0;
	settings;
	ray;
	forward = new Vector3();
	right = new Vector3();
	wish = new Vector3();
	camDesired = new Vector3();
	look = new Vector3();
	head = new Vector3();
	dummy = new Object3D();
	muzzleLocal = new Vector3();
	aimHot = false;
	alive = true;
	onKeyDown;
	onKeyUp;
	onMouseDown;
	onMouseUp;
	onMouseMove;
	onWheel;
	onLock = () => this.publish(true);
	onVis = () => this.audio.resume();
	onContext;
	onBlur = () => this.keys.clear();
	constructor(canvas, renderer, world) {
		this.canvas = canvas;
		this.renderer = renderer;
		this.world = world;
		this.settings = loadSettings();
		this.ray = new NC.Ray({
			x: 0,
			y: 0,
			z: 0
		}, {
			x: 0,
			y: 0,
			z: -1
		});
		this.level = buildLevel(this.scene, world);
		setNavGrid(this.level.blocked);
		const spawn = CHECKPOINTS.ash;
		this.playerBody = world.createRigidBody(NC.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y, spawn.z));
		this.playerCol = world.createCollider(NC.ColliderDesc.capsule(.45, .32).setCollisionGroups(groups(2, 3)), this.playerBody);
		this.actorCols.add(this.playerCol.handle);
		this.playerCtl = world.createCharacterController(.03);
		this.playerCtl.enableAutostep(.34, .2, true);
		this.playerCtl.enableSnapToGround(.42);
		this.playerCtl.setSlideEnabled(true);
		this.playerCtl.setMaxSlopeClimbAngle(48 * Math.PI / 180);
		const fig = makeFigure({
			coat: 3951710,
			skin: 14140334,
			eyes: 10405846,
			scale: 1
		});
		this.playerMesh = fig.group;
		this.playerParts = fig.parts;
		this.scene.add(this.playerMesh);
		this.spawnAll(this.level.spawns, "normal");
		this.resize();
		this.makeFx();
		this.bind();
		this.applyQuality(this.settings.quality);
		useGame.setState({
			settings: this.settings,
			hasSave: hasSave(),
			showTouch: this.touchWanted(),
			ready: true,
			screen: "menu",
			bootLabel: ""
		});
		this.installProbe();
		this.last = performance.now();
		this.raf = requestAnimationFrame(this.frame);
	}
	static async create(canvas) {
		useGame.setState({
			screen: "boot",
			bootLabel: "Binding the physics of the parish…"
		});
		await NC.init();
		const renderer = new WebGLRenderer({
			canvas,
			antialias: true,
			powerPreference: "high-performance"
		});
		renderer.outputColorSpace = SRGBColorSpace;
		renderer.toneMapping = 4;
		renderer.toneMappingExposure = 1.05;
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = 2;
		const world = new NC.World({
			x: 0,
			y: -12,
			z: 0
		});
		world.timestep = STEP;
		return new Engine(canvas, renderer, world);
	}
	dispose() {
		this.alive = false;
		cancelAnimationFrame(this.raf);
		this.unbind();
		this.renderer.dispose();
		this.world.free();
	}
	unlockAudio() {
		this.audio.unlock(this.settings);
	}
	newGame() {
		this.difficulty = this.settings.difficulty;
		this.flags = emptyFlags();
		this.items = startingPack();
		this.lit = [
			false,
			false,
			false
		];
		this.puzzleStep = 0;
		this.looted.clear();
		this.checkpoint = "ash";
		this.health = 100;
		this.stamina = 100;
		this.equipped = "pistol";
		this.magPistol = 12;
		this.magShotgun = 0;
		this.reloadT = 0;
		this.fireCd = 0;
		this.iframe = 0;
		this.winT = 0;
		this.resetDoors();
		this.syncBraziers();
		this.level.chestLid.rotation.x = 0;
		for (const e of this.enemies) this.restoreEnemy(e, true);
		const s = CHECKPOINTS.ash;
		this.placePlayer(s.x, s.y, s.z, s.yaw);
		this.mode = "play";
		this.objective = "";
		this.say("Mara Voss. The parish went dark three nights ago. Find out why the bells won't stop.", 6);
		this.toast("Service pistol ready. Ammunition is not a suggestion.");
		useGame.setState({
			screen: "play",
			selected: null
		});
		this.capturePointer();
		this.writeCheckpoint("ash");
		this.publish(true);
	}
	continueGame() {
		const data = loadSave();
		if (!data) return;
		this.applySave(data);
		this.mode = "play";
		useGame.setState({ screen: "play" });
		this.say("The radio still has your last report.", 3.5);
		this.capturePointer();
		this.publish(true);
	}
	pause() {
		if (this.mode !== "play") return;
		this.mode = "frozen";
		this.releasePointer();
		useGame.setState({ screen: "pause" });
		this.publish(true);
	}
	resume() {
		this.mode = "play";
		useGame.setState({ screen: "play" });
		this.capturePointer();
		this.publish(true);
	}
	openInventory() {
		if (this.mode === "attract") return;
		this.mode = "frozen";
		this.releasePointer();
		useGame.setState({
			screen: "inventory",
			items: this.items.map((it) => ({ ...it }))
		});
		this.publish(true);
	}
	openSettings(back) {
		if (back === "pause") this.mode = "frozen";
		this.releasePointer();
		useGame.setState({
			screen: "settings",
			settingsBack: back
		});
	}
	closeSettings() {
		if (useGame.getState().settingsBack === "pause") useGame.setState({ screen: "pause" });
		else {
			this.mode = "attract";
			useGame.setState({ screen: "menu" });
		}
	}
	quitToMenu() {
		this.mode = "attract";
		this.releasePointer();
		this.shots.forEach((s) => s.life = 0);
		useGame.setState({
			screen: "menu",
			hasSave: hasSave(),
			boss: false
		});
		this.publish(true);
	}
	retry() {
		const data = loadSave();
		if (!data) {
			this.newGame();
			return;
		}
		this.applySave(data);
		this.mode = "play";
		this.health = Math.max(this.health, 40);
		useGame.setState({ screen: "play" });
		this.say("You pull yourself up where the radio last heard you.", 3.5);
		this.capturePointer();
		this.publish(true);
	}
	updateSettings(partial) {
		this.settings = {
			...this.settings,
			...partial
		};
		writeSettings(this.settings);
		this.audio.apply(this.settings);
		if (partial.quality) this.applyQuality(partial.quality);
		useGame.setState({
			settings: this.settings,
			showTouch: this.touchWanted()
		});
	}
	moveInventory(id, x, y) {
		const next = moveItem(this.items, id, x, y);
		if (!next) return false;
		this.items = next;
		this.publish(true);
		return true;
	}
	useSelected(id) {
		const item = this.items.find((it) => it.id === id);
		if (!item || this.mode === "attract") return;
		if (item.kind === "herb") {
			if (this.health >= 100) {
				this.toast("You are already whole.");
				return;
			}
			this.health = Math.min(100, this.health + 42);
			this.items = removeItem(this.items, id);
			this.audio.pickup();
			this.toast("The bitter green burns, then knits.");
			this.publish(true);
			return;
		}
		if (item.kind === "pistol" || item.kind === "shotgun") {
			this.equipped = item.kind;
			this.reloadT = 0;
			this.toast(item.kind === "pistol" ? "Pistol drawn." : "Scattergun drawn.");
			this.publish(true);
		}
	}
	setTouchMove(x, y) {
		this.touchActive = Math.hypot(x, y) > .08;
		this.touchX = x;
		this.touchY = y;
	}
	pointerLook(dx, dy) {
		this.mouseX += dx;
		this.mouseY += dy;
	}
	setFire(down) {
		if (down && !this.fireDown) this.fireEdge = true;
		this.fireDown = down;
	}
	tap(action) {
		if (action === "pause") {
			if (useGame.getState().screen === "play") this.pause();
			else if (useGame.getState().screen === "pause") this.resume();
			return;
		}
		if (action === "inv") {
			if (useGame.getState().screen === "inventory") this.resume();
			else this.openInventory();
			return;
		}
		if (this.mode !== "play") return;
		if (action === "reload") this.reloadEdge = true;
		if (action === "interact") this.interactEdge = true;
		if (action === "dodge") this.dodgeEdge = true;
		if (action === "melee") this.meleeEdge = true;
	}
	setDebugKeys(codes) {
		this.keys.clear();
		for (const code of codes) this.keys.add(code);
	}
	getYaw() {
		return this.yaw;
	}
	getSpeed() {
		return this.speed;
	}
	getPos() {
		const p = this.playerBody.translation();
		return {
			x: p.x,
			y: p.y,
			z: p.z
		};
	}
	separateActors() {
		const p = this.playerBody.translation();
		const pr = .36;
		for (const e of this.enemies) {
			if (e.state === "dead" || !e.active && e.kind === "boss") continue;
			const t = e.body.translation();
			let dx = t.x - p.x;
			let dz = t.z - p.z;
			let d = Math.hypot(dx, dz);
			const min = pr + e.radius + (e.kind === "boss" ? .35 : .5);
			if (d < 8e-4) {
				dx = 1;
				dz = 0;
				d = 1;
			}
			if (d >= min) continue;
			const push = min - d;
			const nx = t.x + dx / d * push;
			const nz = t.z + dz / d * push;
			e.body.setTranslation({
				x: nx,
				y: t.y,
				z: nz
			}, true);
			e.body.setNextKinematicTranslation({
				x: nx,
				y: t.y,
				z: nz
			});
		}
	}
	frame = (now) => {
		if (!this.alive) return;
		const dt = Math.min(.1, (now - this.last) / 1e3);
		this.last = now;
		this.clock += dt;
		if (this.mode === "play") {
			this.applyMouse();
			this.acc += dt;
			let steps = 0;
			while (this.acc >= STEP && steps < 4) {
				this.simulate(STEP);
				this.acc -= STEP;
				steps++;
			}
		} else if (this.mode === "attract") {
			this.attract += dt;
			const a = this.attract * .08;
			this.camera.position.set(Math.sin(a) * 18, 7.2 + Math.sin(a * .4) * .5, 6 + Math.cos(a) * 16);
			this.camera.lookAt(0, 2.4, 4);
		}
		this.dress(dt);
		this.render();
		if (now - this.pubAt > 120) this.publish(false);
		this.raf = requestAnimationFrame(this.frame);
	};
	applyMouse() {
		const sens = this.settings.sensitivity;
		const invert = this.settings.invertY ? -1 : 1;
		this.yaw -= this.mouseX * sens;
		this.pitch -= this.mouseY * sens * invert;
		this.pitch = Math.max(-.95, Math.min(.7, this.pitch));
		this.mouseX = 0;
		this.mouseY = 0;
	}
	simulate(dt) {
		this.fireCd = Math.max(0, this.fireCd - dt);
		this.dodgeCd = Math.max(0, this.dodgeCd - dt);
		this.iframe = Math.max(0, this.iframe - dt);
		if (this.reloading) {
			this.reloadT = Math.max(0, this.reloadT - dt);
			if (this.reloadT <= 0) {
				this.reloading = false;
				this.commitReload();
			}
		}
		this.recoil *= Math.exp(-6 * dt);
		this.yawKick *= Math.exp(-7 * dt);
		if (this.subtitleT > 0) {
			this.subtitleT -= dt;
			if (this.subtitleT <= 0) useGame.setState({ subtitle: "" });
		}
		if (this.toastT > 0) {
			this.toastT -= dt;
			if (this.toastT <= 0) useGame.setState({ toast: "" });
		}
		this.separateActors();
		this.stepPlayer(dt);
		const allies = this.enemies.filter((e) => e.state !== "dead").map((e) => {
			const t = e.body.translation();
			return {
				id: e.id,
				x: t.x,
				z: t.z
			};
		});
		const playerT = this.playerBody.translation();
		const ctxBase = {
			player: {
				x: playerT.x,
				y: playerT.y,
				z: playerT.z
			},
			dt,
			noises: this.noises,
			allies,
			los: this.los,
			damagePlayer: this.damagePlayer,
			spawnShot: this.spawnShot,
			startWave: this.startWave,
			onGroan: (e, deep) => {
				const t = e.body.translation();
				this.audio.groan(t.x, t.y, t.z, deep);
			},
			onPhase: (phase) => {
				this.audio.bell();
				this.say(phase === 2 ? "The Warden splits the floor." : "It lowers its head and charges.", 2.4);
			}
		};
		for (const e of this.enemies) planEnemy(e, ctxBase);
		for (const e of this.enemies) {
			if (e.state === "dead") continue;
			const p = e.body.translation();
			const disp = {
				x: e.wishX * dt,
				y: e.vy * dt,
				z: e.wishZ * dt
			};
			e.controller.computeColliderMovement(e.collider, disp);
			const m = e.controller.computedMovement();
			const nx = p.x + m.x;
			const ny = p.y + m.y;
			const nz = p.z + m.z;
			if (e.controller.computedGrounded() && e.vy < 0) e.vy = -2;
			e.body.setNextKinematicTranslation({
				x: nx,
				y: ny,
				z: nz
			});
		}
		this.world.step();
		this.separateActors();
		for (const e of this.enemies) {
			const t = e.body.translation();
			if (t.y < -8) e.body.setTranslation({
				x: e.lastX,
				y: e.feet,
				z: e.lastZ
			}, true);
			resolveEnemy(e, ctxBase);
			e.mesh.position.set(t.x, t.y - e.feet, t.z);
			e.mesh.rotation.set(Math.min(1.25, e.deadT * 1.5), e.yaw + Math.PI, 0);
			const moving = Math.hypot(e.wishX, e.wishZ);
			e.walk += moving * dt * 2.4;
			animateFigure(e.parts, e.walk, Math.min(1, moving / 2), e.state === "attack" ? 1 : 0, e.deadT);
			e.parts.coatMat.emissive.setHex(16773866);
			e.parts.coatMat.emissiveIntensity = e.flash > 0 ? .85 : 0;
			if (e.kind === "boss") e.parts.eyeMat.emissiveIntensity = .6 + Math.sin(this.clock * (e.phase === 3 ? 14 : 6)) * .35;
		}
		if (this.fireEdge) this.shoot();
		this.fireEdge = false;
		if (this.meleeEdge) this.melee();
		this.meleeEdge = false;
		if (this.reloadEdge) this.startReload();
		this.reloadEdge = false;
		if (this.interactEdge) this.interact();
		this.interactEdge = false;
		this.updateShots(dt);
		this.updateWaves(dt);
		this.updateSparks(dt);
		for (const n of this.noises) n.life -= dt;
		this.noises = this.noises.filter((n) => n.life > 0);
		this.updateObjective();
		this.updatePrompt();
		if (this.winT > 0) {
			this.winT -= dt;
			if (this.winT <= 0) {
				this.mode = "frozen";
				this.releasePointer();
				useGame.setState({ screen: "won" });
				this.publish(true);
			}
		}
		const nearest = this.nearestEnemyDist();
		this.audio.setTension(this.flags.bossStarted && !this.flags.bossDefeated ? 1 : nearest < 8 ? .75 : nearest < 16 ? .4 : .1);
		this.audio.tick(dt, this.health < 35 && this.health > 0);
		this.syncGuns();
	}
	stepPlayer(dt) {
		let ix = 0;
		let iz = 0;
		if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) iz += 1;
		if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) iz -= 1;
		if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) ix += 1;
		if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) ix -= 1;
		if (this.touchActive) {
			ix = this.touchX;
			iz = this.touchY;
		}
		this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
		this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
		this.wish.set(0, 0, 0).addScaledVector(this.forward, iz).addScaledVector(this.right, ix);
		const mag = Math.hypot(this.wish.x, this.wish.z);
		if (mag > 1) this.wish.multiplyScalar(1 / mag);
		const sprinting = (this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") || this.touchY > .92) && this.stamina > 4 && mag > .2 && this.dodgeT <= 0;
		if (this.dodgeEdge && this.dodgeCd <= 0 && this.stamina >= 18) {
			this.dodgeT = .28;
			this.iframe = Math.max(this.iframe, .32);
			this.dodgeCd = .9;
			this.stamina -= 18;
			if (mag > .15) {
				this.dodgeX = this.wish.x;
				this.dodgeZ = this.wish.z;
			} else {
				this.dodgeX = -this.forward.x;
				this.dodgeZ = -this.forward.z;
			}
		}
		this.dodgeEdge = false;
		let target = sprinting ? 5.55 : 3.3;
		if (this.dodgeT > 0) {
			this.dodgeT -= dt;
			this.wish.set(this.dodgeX, 0, this.dodgeZ);
			target = 9.2;
		}
		if (sprinting) this.stamina = Math.max(0, this.stamina - 16 * dt);
		else this.stamina = Math.min(100, this.stamina + 14 * dt);
		const tx = this.wish.x * target;
		const tz = this.wish.z * target;
		const accel = 30;
		this.vx = approach(this.vx, tx, accel * dt);
		this.vz = approach(this.vz, tz, accel * dt);
		this.speed = Math.hypot(this.vx, this.vz);
		this.vy += -24 * dt;
		if (this.vy < -30) this.vy = -30;
		const p = this.playerBody.translation();
		this.playerCtl.computeColliderMovement(this.playerCol, {
			x: this.vx * dt,
			y: this.vy * dt,
			z: this.vz * dt
		});
		const m = this.playerCtl.computedMovement();
		let nx = p.x + m.x;
		let ny = p.y + m.y;
		let nz = p.z + m.z;
		if (this.playerCtl.computedGrounded() && this.vy < 0) this.vy = -2.4;
		if (ny < -7) {
			const c = CHECKPOINTS[this.checkpoint];
			nx = c.x;
			ny = c.y;
			nz = c.z;
			this.vy = 0;
		}
		this.playerBody.setNextKinematicTranslation({
			x: nx,
			y: ny,
			z: nz
		});
		if (this.speed > .4 && this.playerCtl.computedGrounded()) {
			this.foot -= dt;
			if (this.foot <= 0) {
				this.foot = sprinting ? .32 : .46;
				this.audio.foot(nx, ny, nz);
			}
			this.bob += dt * (sprinting ? 10 : 7);
		}
	}
	shoot() {
		if (this.reloadT > 0) return;
		const gun = this.equipped;
		if (gun === "shotgun" && !this.flags.hasShotgun) return;
		if ((gun === "pistol" ? this.magPistol : this.magShotgun) <= 0) {
			if (ammoQty(this.items, gun === "pistol" ? "pistolAmmo" : "shells") > 0) this.startReload();
			else this.audio.dry();
			return;
		}
		if (this.fireCd > 0) return;
		if (gun === "pistol") this.magPistol--;
		else this.magShotgun--;
		this.fireCd = gun === "pistol" ? .28 : .72;
		this.recoil += gun === "pistol" ? .02 : .045;
		this.yawKick += (Math.random() - .5) * (gun === "pistol" ? .006 : .02);
		this.shake = Math.min(.35, this.shake + (gun === "pistol" ? .05 : .1));
		this.audio.gun(gun);
		this.level.muzzle.intensity = gun === "pistol" ? 6 : 10;
		const origin = this.camera.position.clone();
		const dir = new Vector3();
		this.camera.getWorldDirection(dir);
		origin.addScaledVector(dir, .35);
		const pellets = gun === "pistol" ? 1 : 7;
		const spread = gun === "pistol" ? .006 + (this.speed > 2 ? .012 : 0) : .075;
		const p = this.playerBody.translation();
		this.noises.push({
			x: p.x,
			z: p.z,
			r: gun === "pistol" ? 18 : 24,
			life: .4
		});
		let any = false;
		for (let i = 0; i < pellets; i++) {
			const d = dir.clone();
			d.x += (Math.random() - .5) * spread;
			d.y += (Math.random() - .5) * spread;
			d.z += (Math.random() - .5) * spread;
			d.normalize();
			if (this.castShot(origin, d, gun === "pistol" ? 22 : 9)) any = true;
		}
		if (any) {
			this.audio.hit(true);
			useGame.setState({ hit: performance.now() });
		}
		this.publish(true);
	}
	castShot(origin, dir, dmg) {
		this.ray.origin.x = origin.x;
		this.ray.origin.y = origin.y;
		this.ray.origin.z = origin.z;
		this.ray.dir.x = dir.x;
		this.ray.dir.y = dir.y;
		this.ray.dir.z = dir.z;
		const worldHit = this.world.castRay(this.ray, 80, true, void 0, void 0, void 0, void 0, (c) => !this.actorCols.has(c.handle));
		let best = worldHit ? worldHit.timeOfImpact : 80;
		let hitEnemy = null;
		for (const e of this.enemies) {
			if (e.state === "dead" || !e.active && e.kind === "boss") continue;
			const t = e.body.translation();
			const feetY = t.y - e.feet;
			const headC = new Vector3(t.x, feetY + (e.kind === "boss" ? 2.05 : 1.55), t.z);
			const bodyC = new Vector3(t.x, feetY + (e.kind === "boss" ? 1.15 : .95), t.z);
			const th = raySphere(origin, dir, headC, e.kind === "boss" ? .28 : .2);
			const tb = raySphere(origin, dir, bodyC, e.kind === "boss" ? .72 : .42);
			const head = th !== null && (tb === null || th <= tb);
			const te = head ? th : tb;
			if (te !== null && te < best && te > .05) {
				best = te;
				hitEnemy = {
					e,
					head
				};
			}
		}
		const point = origin.clone().addScaledVector(dir, Math.min(best, 40));
		this.burst(point, hitEnemy ? 6953492 : 13153434);
		if (!hitEnemy) {
			this.audio.hit(false);
			return false;
		}
		const mult = hitEnemy.head ? hitEnemy.e.kind === "boss" ? 1.8 : 2.5 : 1;
		const died = hurtEnemy(hitEnemy.e, dmg * mult * (this.difficulty === "hard" ? 1 : 1), hitEnemy.head);
		if (hitEnemy.head) this.toast(hitEnemy.e.kind === "boss" ? "The crown cracks." : "Headshot.");
		if (died) this.onDeath(hitEnemy.e);
		return true;
	}
	melee() {
		if (this.fireCd > .15) return;
		this.fireCd = .48;
		this.audio.melee();
		this.playerParts.rightArm.rotation.x = -1.4;
		const p = this.playerBody.translation();
		let hit = false;
		for (const e of this.enemies) {
			if (e.state === "dead") continue;
			const t = e.body.translation();
			const dx = t.x - p.x;
			const dz = t.z - p.z;
			if (Math.hypot(dx, dz) > 1.85) continue;
			if (dx * -Math.sin(this.yaw) + dz * -Math.cos(this.yaw) < .2) continue;
			hit = true;
			if (hurtEnemy(e, 36, false)) this.onDeath(e);
		}
		if (hit) {
			this.audio.hit(true);
			useGame.setState({ hit: performance.now() });
			this.shake = Math.min(.3, this.shake + .06);
		}
	}
	startReload() {
		if (this.reloadT > 0) return;
		const gun = this.equipped;
		if (gun === "shotgun" && !this.flags.hasShotgun) return;
		const mag = gun === "pistol" ? this.magPistol : this.magShotgun;
		const size = gun === "pistol" ? 12 : 4;
		const kind = gun === "pistol" ? "pistolAmmo" : "shells";
		if (mag >= size || ammoQty(this.items, kind) <= 0) {
			if (mag <= 0) this.audio.dry();
			return;
		}
		this.reloading = true;
		this.reloadT = gun === "pistol" ? 1.25 : 1.85;
		this.audio.reload();
	}
	commitReload() {
		const gun = this.equipped;
		const size = gun === "pistol" ? 12 : 4;
		const mag = gun === "pistol" ? this.magPistol : this.magShotgun;
		const kind = gun === "pistol" ? "pistolAmmo" : "shells";
		const { items, took } = takeAmmo(this.items, kind, size - mag);
		this.items = items;
		if (gun === "pistol") this.magPistol += took;
		else this.magShotgun += took;
		this.publish(true);
	}
	los = (x, y, z, x2, y2, z2) => {
		const dx = x2 - x;
		const dy = y2 - y;
		const dz = z2 - z;
		const len = Math.hypot(dx, dy, dz);
		if (len < .05) return true;
		this.ray.origin.x = x;
		this.ray.origin.y = y;
		this.ray.origin.z = z;
		this.ray.dir.x = dx / len;
		this.ray.dir.y = dy / len;
		this.ray.dir.z = dz / len;
		const hit = this.world.castRay(this.ray, len, true, void 0, void 0, void 0, void 0, (c) => !this.actorCols.has(c.handle));
		return !hit || hit.timeOfImpact > len - .35;
	};
	damagePlayer = (amount, x, z) => {
		if (this.iframe > 0 || this.health <= 0 || this.mode !== "play") return;
		const mult = this.difficulty === "hard" ? 1.25 : 1;
		this.health = Math.max(0, this.health - amount * mult);
		this.iframe = .55;
		this.shake = Math.min(.45, this.shake + .14);
		this.audio.hurt();
		useGame.setState({ hurt: performance.now() });
		const p = this.playerBody.translation();
		const dx = p.x - x;
		const dz = p.z - z;
		const len = Math.hypot(dx, dz) || 1;
		this.vx += dx / len * 3.5;
		this.vz += dz / len * 3.5;
		if (this.health <= 0) {
			this.mode = "frozen";
			this.releasePointer();
			this.say("The parish keeps what it takes.", 4);
			useGame.setState({ screen: "dead" });
		}
		this.publish(true);
	};
	spawnShot = (x, y, z, dx, dy, dz, dmg) => {
		const mesh = new Mesh(new SphereGeometry(.1, 6, 6), new MeshBasicMaterial({ color: 16738874 }));
		mesh.position.set(x, y, z);
		this.scene.add(mesh);
		const speed = 16;
		this.shots.push({
			x,
			y,
			z,
			vx: dx * speed,
			vy: dy * speed,
			vz: dz * speed,
			life: 2,
			dmg,
			mesh
		});
		this.audio.shotIncoming(x, y, z);
	};
	startWave = (x, z, dmg) => {
		const mesh = new Mesh(new TorusGeometry(1, .07, 6, 28), new MeshBasicMaterial({
			color: 16734770,
			transparent: true,
			opacity: .75
		}));
		mesh.rotation.x = Math.PI / 2;
		mesh.position.set(x, .15, z);
		this.scene.add(mesh);
		this.waves.push({
			x,
			z,
			r: .8,
			dmg,
			mesh,
			alive: true
		});
		this.audio.bell();
	};
	updateShots(dt) {
		const p = this.playerBody.translation();
		for (const s of this.shots) {
			s.life -= dt;
			const nx = s.x + s.vx * dt;
			const ny = s.y + s.vy * dt;
			const nz = s.z + s.vz * dt;
			const len = Math.hypot(nx - s.x, ny - s.y, nz - s.z) || 1e-4;
			this.ray.origin.x = s.x;
			this.ray.origin.y = s.y;
			this.ray.origin.z = s.z;
			this.ray.dir.x = (nx - s.x) / len;
			this.ray.dir.y = (ny - s.y) / len;
			this.ray.dir.z = (nz - s.z) / len;
			const hit = this.world.castRay(this.ray, len, true, void 0, void 0, void 0, void 0, (c) => !this.actorCols.has(c.handle));
			const pd = Math.hypot(nx - p.x, nz - p.z);
			if (hit && hit.timeOfImpact < len) {
				s.life = 0;
				this.burst(new Vector3(s.x, s.y, s.z), 16756864);
			} else if (pd < .7 && Math.abs(ny - p.y) < 1.1) {
				s.life = 0;
				this.damagePlayer(s.dmg, s.x, s.z);
			} else {
				s.x = nx;
				s.y = ny;
				s.z = nz;
				s.mesh.position.set(nx, ny, nz);
			}
			if (s.life <= 0) {
				this.scene.remove(s.mesh);
				s.mesh.geometry.dispose();
				s.mesh.material.dispose();
			}
		}
		this.shots = this.shots.filter((s) => s.life > 0);
	}
	updateWaves(dt) {
		const p = this.playerBody.translation();
		for (const w of this.waves) {
			w.r += 8.5 * dt;
			w.mesh.scale.setScalar(w.r);
			w.mesh.position.y = .12 + groundY(w.x, w.z);
			const mat = w.mesh.material;
			mat.opacity = Math.max(0, .75 * (1 - w.r / 14));
			const d = Math.hypot(p.x - w.x, p.z - w.z);
			if (w.alive && w.r > 1.2 && Math.abs(d - w.r) < .55) {
				w.alive = false;
				this.damagePlayer(w.dmg * .7, w.x, w.z);
			}
			if (w.r > 14) {
				this.scene.remove(w.mesh);
				w.mesh.geometry.dispose();
				mat.dispose();
				w.r = 99;
			}
		}
		this.waves = this.waves.filter((w) => w.r < 20);
	}
	updateSparks(dt) {
		for (const s of this.sparks) {
			s.life -= dt;
			const mat = s.mesh.material;
			mat.opacity = Math.max(0, s.life * 4);
			s.mesh.scale.setScalar(.4 + (.25 - Math.max(0, s.life)) * 3);
		}
	}
	burst(point, color) {
		const spark = this.sparks.find((s) => s.life <= 0) ?? this.sparks[0];
		if (!spark) return;
		spark.life = .22;
		spark.mesh.position.copy(point);
		spark.mesh.material.color.setHex(color);
		spark.mesh.material.opacity = .9;
	}
	interact() {
		const it = this.focused();
		if (!it) return;
		if (it.kind === "radio" && it.checkpoint) {
			this.checkpoint = it.checkpoint;
			this.health = Math.min(100, this.health + 8);
			this.writeCheckpoint(it.checkpoint);
			this.audio.radio();
			this.say("Progress recorded. The bureau will deny they heard this.", 3.2);
			this.publish(true);
			return;
		}
		if (it.kind === "door" && it.door) {
			this.tryDoor(it.door);
			return;
		}
		if (it.kind === "brazier" && it.brazier !== void 0) {
			this.lightBrazier(it.brazier);
			return;
		}
		if (it.kind === "chest") {
			if (!this.flags.puzzleSolved) {
				this.say("The chest is shut. The mural is an order, not a painting.", 3);
				this.audio.locked();
				return;
			}
			if (this.looted.has(it.id)) return;
			if (!this.giveLoot(it)) return;
			this.looted.add(it.id);
			this.level.chestLid.rotation.x = -1.15;
			this.audio.pickup();
			return;
		}
		if (it.loot) {
			if (this.looted.has(it.id)) return;
			if (!this.giveLoot(it)) return;
			this.looted.add(it.id);
			this.audio.pickup();
		}
	}
	giveLoot(it) {
		if (!it.loot) return true;
		let next = this.items;
		for (const drop of it.loot) {
			if (drop.kind === "shotgun") {
				if (!this.flags.hasShotgun) {
					const added = tryAdd(next, "shotgun");
					if (!added) {
						this.toast("The pack is full.");
						return false;
					}
					next = added;
					this.flags.hasShotgun = true;
					this.magShotgun = 4;
					this.equipped = "shotgun";
					this.toast("Scattergun. Four shells already in the tube.");
				}
				continue;
			}
			if (drop.kind === "barnKey") this.flags.hasBarnKey = true;
			if (drop.kind === "sigil") this.flags.hasSigil = true;
			if (drop.kind === "note") this.flags.hasNote = true;
			const added = tryAdd(next, drop.kind, drop.qty ?? 1);
			if (!added) {
				this.toast("The pack is full.");
				return false;
			}
			next = added;
		}
		this.items = next;
		if (it.kind === "note" || it.loot.some((l) => l.kind === "note")) this.say("Dawn, then dusk, then the one between. I · III · II.", 4.5);
		else if (this.flags.hasBarnKey && it.loot.some((l) => l.kind === "barnKey")) this.say("An iron key. The barn on the north edge.", 3);
		else if (this.flags.hasSigil && it.loot.some((l) => l.kind === "sigil")) this.say("The chapel sigil is cold enough to bite.", 3);
		else this.toast("Taken.");
		this.publish(true);
		return true;
	}
	tryDoor(which) {
		if (which === "barn") {
			if (!this.flags.hasBarnKey) {
				this.audio.locked();
				this.say("The barn is barred. It wants a heavy iron key.", 2.6);
				return;
			}
			if (!this.flags.barnOpen) {
				this.flags.barnOpen = true;
				this.openDoor("barn");
				this.audio.pickup();
				this.say("The harrow barn groans open. Something moves under the floor.", 3);
			}
			return;
		}
		if (this.flags.bossStarted && !this.flags.bossDefeated) {
			this.audio.locked();
			this.say("The doors have shut behind you.", 2);
			return;
		}
		if (!this.flags.hasSigil) {
			this.audio.locked();
			this.say("The chapel will not take an empty hand.", 2.6);
			return;
		}
		if (!this.flags.chapelOpen) {
			this.flags.chapelOpen = true;
			this.openDoor("chapel");
			this.audio.bell();
			this.say("The sigil burns cold. The doors give.", 2.8);
		}
	}
	lightBrazier(index) {
		if (this.flags.puzzleSolved) {
			this.toast("The order is already satisfied.");
			return;
		}
		if (index !== ORDER[this.puzzleStep] || this.lit[index]) {
			this.lit = [
				false,
				false,
				false
			];
			this.puzzleStep = 0;
			this.syncBraziers();
			this.audio.brazier(false);
			this.say("The flames die together. Read the order again.", 2.6);
			return;
		}
		this.lit[index] = true;
		this.puzzleStep++;
		this.syncBraziers();
		this.audio.brazier(true);
		if (this.puzzleStep >= 3) {
			this.flags.puzzleSolved = true;
			this.say("The chest lock answers. Take what the sexton buried.", 3);
		}
		this.publish(true);
	}
	onDeath(e) {
		this.audio.groan(e.mesh.position.x, e.mesh.position.y, e.mesh.position.z, e.kind === "boss");
		if (e.kind === "boss") {
			this.flags.bossDefeated = true;
			this.flags.bossStarted = true;
			this.openDoor("chapel");
			this.audio.bossDie();
			this.say("The Warden folds. The bells crack, and then nothing.", 4);
			this.winT = 2.4;
			this.writeCheckpoint(this.checkpoint);
		}
	}
	maybeStartBoss() {
		if (this.flags.bossStarted || !this.flags.chapelOpen || this.flags.bossDefeated) return;
		const p = this.playerBody.translation();
		if (p.z < -30.2 && Math.abs(p.x) < 7.5) {
			this.flags.bossStarted = true;
			this.level.doors.chapel.collider.setSensor(false);
			this.level.doors.chapel.hinge.rotation.y = 0;
			this.rebuildNav();
			const boss = this.enemies.find((e) => e.kind === "boss");
			if (boss) boss.active = true;
			this.audio.bell();
			this.say("The doors seal. The Warden of Greyhollow looks up.", 3.2);
		}
	}
	updateObjective() {
		this.maybeStartBoss();
		const p = this.playerBody.translation();
		if (!this.flags.enteredSquare && p.z < 20 && Math.abs(p.x) < 16) {
			this.flags.enteredSquare = true;
			this.say("Parish square. The well is still warm.", 2.6);
		}
		const text = !this.flags.enteredSquare ? "Follow the ash road into the parish square." : !this.flags.hasBarnKey ? "Search the sexton's mill for the barn key." : !this.flags.barnOpen ? "Unlock the harrow barn on the north edge." : !this.flags.puzzleSolved ? "Cellar braziers: light I, then III, then II." : !this.flags.hasSigil ? "Take the chapel sigil from the iron chest." : !this.flags.chapelOpen ? "Open the chapel with the sigil." : !this.flags.bossDefeated ? "Destroy the Warden of Greyhollow." : "The bells are still. The parish is only silenced.";
		if (text !== this.objective) {
			this.objective = text;
			this.publish(true);
		}
	}
	updatePrompt() {
		const it = this.focused();
		let prompt = "";
		if (it) {
			if (it.kind === "door" && it.door === "barn") prompt = this.flags.barnOpen ? "" : this.flags.hasBarnKey ? "Unlock the barn" : "Barn door — locked";
			else if (it.kind === "door" && it.door === "chapel") prompt = this.flags.bossStarted && !this.flags.bossDefeated ? "Sealed" : this.flags.chapelOpen ? "" : this.flags.hasSigil ? "Offer the chapel sigil" : "Chapel doors — sealed";
			else if (it.kind === "chest") prompt = this.looted.has(it.id) ? "" : this.flags.puzzleSolved ? "Open the iron chest" : "Iron chest — shut";
			else if (it.loot && this.looted.has(it.id)) prompt = "";
			else prompt = it.prompt;
		}
		if (useGame.getState().prompt !== prompt) useGame.setState({ prompt });
		let hot = false;
		const origin = this.camera.position;
		const dir = this.look.clone();
		this.camera.getWorldDirection(dir);
		for (const e of this.enemies) {
			if (e.state === "dead" || !e.active) continue;
			const t = e.body.translation();
			if (raySphere(origin, dir, new Vector3(t.x, t.y, t.z), .7) !== null) {
				hot = true;
				break;
			}
		}
		if (hot !== this.aimHot) {
			this.aimHot = hot;
			useGame.setState({ aimHot: hot });
		}
	}
	focused() {
		const p = this.playerBody.translation();
		let best = null;
		let bestD = 99;
		for (const it of this.level.interacts) {
			const dx = it.x - p.x;
			const dz = it.z - p.z;
			const dy = it.y - p.y;
			if (Math.abs(dy) > 2.4) continue;
			const d = Math.hypot(dx, dz);
			if (d > it.radius) continue;
			if (dx * -Math.sin(this.yaw) + dz * -Math.cos(this.yaw) < -.2 && d > .8) continue;
			if (d < bestD) {
				bestD = d;
				best = it;
			}
		}
		return best;
	}
	dress(dt) {
		const p = this.playerBody.translation();
		this.playerMesh.position.set(p.x, p.y - .77, p.z);
		this.playerMesh.rotation.y = this.yaw + Math.PI;
		this.playerMesh.visible = true;
		animateFigure(this.playerParts, this.bob, Math.min(1, this.speed / 2.2), 0, 0);
		const lookYaw = this.yaw + this.yawKick;
		const lookPitch = this.pitch + this.recoil;
		this.forward.set(-Math.sin(lookYaw), 0, -Math.cos(lookYaw));
		this.right.set(Math.cos(lookYaw), 0, -Math.sin(lookYaw));
		const back = 3.25 * Math.cos(lookPitch * .85);
		this.camDesired.set(p.x + Math.sin(lookYaw) * back + this.right.x * .48, p.y + .72 - Math.sin(lookPitch) * .55, p.z + Math.cos(lookYaw) * back + this.right.z * .48);
		if (this.mode === "play" || this.mode === "frozen") {
			const k = 1 - Math.exp(-10 * Math.max(dt, .016));
			this.camera.position.lerp(this.camDesired, this.mode === "play" ? k : 1);
			this.head.set(p.x, p.y + .55, p.z);
			this.ray.origin.x = this.head.x;
			this.ray.origin.y = this.head.y;
			this.ray.origin.z = this.head.z;
			const to = this.camera.position.clone().sub(this.head);
			const len = to.length();
			if (len > .05) {
				to.multiplyScalar(1 / len);
				this.ray.dir.x = to.x;
				this.ray.dir.y = to.y;
				this.ray.dir.z = to.z;
				const hit = this.world.castRay(this.ray, len, true, void 0, groups(2, 1));
				if (hit && hit.timeOfImpact < len - .15) {
					const pull = Math.max(.25, hit.timeOfImpact - .18);
					this.camera.position.copy(this.head).addScaledVector(to, pull);
				}
			}
			this.look.set(p.x - Math.sin(lookYaw) * Math.cos(lookPitch) * 8, p.y + .45 + Math.sin(lookPitch) * 8, p.z - Math.cos(lookYaw) * Math.cos(lookPitch) * 8);
			this.shake *= Math.exp(-4 * Math.max(dt, .016));
			if (this.shake > .004) {
				this.camera.position.x += (Math.random() - .5) * this.shake;
				this.camera.position.y += (Math.random() - .5) * this.shake;
			}
			this.camera.lookAt(this.look);
			const floor = groundY(this.camera.position.x, this.camera.position.z) + .55;
			if (this.camera.position.y < floor) this.camera.position.y = floor;
			const camDist = this.camera.position.distanceTo(this.head);
			this.playerMesh.visible = camDist > .65;
		}
		this.level.playerLight.position.set(p.x, p.y + .4, p.z);
		this.muzzleLocal.set(.35, 1.15, .35);
		this.playerMesh.localToWorld(this.muzzleLocal);
		this.level.muzzle.position.copy(this.muzzleLocal);
		this.level.muzzle.intensity *= Math.exp(-18 * Math.max(dt, .016));
		this.level.sun.position.set(p.x + 16, 26, p.z + 10);
		this.level.sunTarget.position.set(p.x, 0, p.z);
		const bases = this.level.dust.userData.bases;
		for (let i = 0; i < bases.length; i++) {
			const b = bases[i];
			this.dummy.position.set(p.x + wrap(b.x + this.clock * .25, 24) - 12, b.y + Math.sin(this.clock * .8 + i) * .15, p.z + wrap(b.z + this.clock * .18, 24) - 12);
			const cam = this.camera.position;
			const dd = Math.hypot(this.dummy.position.x - cam.x, this.dummy.position.y - cam.y, this.dummy.position.z - cam.z);
			this.dummy.scale.setScalar(dd < 1.6 ? .001 : 1);
			this.dummy.updateMatrix();
			this.level.dust.setMatrixAt(i, this.dummy.matrix);
		}
		this.level.dust.instanceMatrix.needsUpdate = true;
		const dir = new Vector3();
		this.camera.getWorldDirection(dir);
		this.audio.setListener(this.camera.position.x, this.camera.position.y, this.camera.position.z, dir.x, dir.y, dir.z);
	}
	render() {
		if (this.composer && this.settings.quality !== "low") this.composer.render();
		else this.renderer.render(this.scene, this.camera);
	}
	syncGuns() {
		const shot = this.equipped === "shotgun" && this.flags.hasShotgun;
		this.playerParts.pistol.visible = !shot;
		this.playerParts.shotgun.visible = shot;
	}
	publish(force) {
		this.pubAt = performance.now();
		const gun = this.equipped;
		const reserve = ammoQty(this.items, gun === "pistol" ? "pistolAmmo" : "shells");
		const boss = this.enemies.find((e) => e.kind === "boss");
		const goals = [
			{
				text: "Reach the parish square",
				done: this.flags.enteredSquare
			},
			{
				text: "Find the barn key",
				done: this.flags.hasBarnKey
			},
			{
				text: "Light the cellar braziers",
				done: this.flags.puzzleSolved
			},
			{
				text: "Claim the chapel sigil",
				done: this.flags.hasSigil
			},
			{
				text: "Silence the Warden",
				done: this.flags.bossDefeated
			}
		];
		useGame.setState({
			health: this.health,
			stamina: this.stamina,
			mag: gun === "pistol" ? this.magPistol : this.magShotgun,
			reserve,
			weapon: gun === "pistol" ? "Pistol" : "Scattergun",
			reloading: this.reloadT > 0,
			objective: this.objective || "Follow the ash road into the parish square.",
			items: this.items.map((it) => ({ ...it })),
			boss: Boolean(boss && boss.active && boss.state !== "dead"),
			bossHp: boss?.hp ?? 0,
			bossMax: boss?.maxHp ?? 1,
			goals,
			flags: { ...this.flags },
			hasSave: hasSave(),
			showTouch: this.touchWanted(),
			lookHint: this.fallbackLook ? "Right-drag to look · Left-click to shoot" : ""
		});
	}
	writeCheckpoint(id) {
		const spot = CHECKPOINTS[id];
		writeSave({
			version: 1,
			checkpoint: id,
			x: spot.x,
			y: spot.y,
			z: spot.z,
			yaw: spot.yaw,
			health: this.health,
			stamina: this.stamina,
			equipped: this.equipped,
			magPistol: this.magPistol,
			magShotgun: this.magShotgun,
			items: this.items,
			flags: this.flags,
			lit: this.lit,
			puzzleStep: this.puzzleStep,
			looted: [...this.looted],
			enemies: this.enemies.map((e) => {
				const t = e.body.translation();
				return {
					id: e.id,
					hp: e.hp,
					x: t.x,
					y: t.y,
					z: t.z,
					alive: e.state !== "dead"
				};
			}),
			difficulty: this.difficulty
		});
		useGame.setState({ hasSave: true });
	}
	applySave(data) {
		this.flags = {
			...emptyFlags(),
			...data.flags
		};
		this.items = data.items.map((it) => ({ ...it }));
		this.lit = data.lit ?? [
			false,
			false,
			false
		];
		this.puzzleStep = data.puzzleStep ?? 0;
		this.looted = new Set(data.looted ?? []);
		this.checkpoint = data.checkpoint;
		this.health = data.health;
		this.stamina = data.stamina;
		this.equipped = data.equipped;
		this.magPistol = data.magPistol;
		this.magShotgun = data.magShotgun;
		this.difficulty = data.difficulty;
		this.reloadT = 0;
		this.winT = 0;
		this.placePlayer(data.x, data.y, data.z, data.yaw);
		this.resetDoors();
		if (this.flags.barnOpen) this.openDoor("barn");
		if (this.flags.chapelOpen && !(this.flags.bossStarted && !this.flags.bossDefeated)) this.openDoor("chapel");
		this.syncBraziers();
		this.level.chestLid.rotation.x = this.looted.has("chest") ? -1.15 : 0;
		const byId = new Map(data.enemies.map((e) => [e.id, e]));
		for (const e of this.enemies) {
			const snap = byId.get(e.id);
			this.restoreEnemy(e, false);
			if (!snap) continue;
			e.hp = snap.hp;
			e.body.setTranslation({
				x: snap.x,
				y: snap.y,
				z: snap.z
			}, true);
			if (!snap.alive) {
				e.state = "dead";
				e.hp = 0;
				e.collider.setSensor(true);
				e.deadT = 1.2;
			}
			if (e.kind === "boss") e.active = this.flags.bossStarted && snap.alive;
		}
		this.rebuildNav();
	}
	placePlayer(x, y, z, yaw) {
		this.yaw = yaw;
		this.pitch = 0;
		this.vx = 0;
		this.vz = 0;
		this.vy = 0;
		this.playerBody.setTranslation({
			x,
			y,
			z
		}, true);
		this.playerBody.setNextKinematicTranslation({
			x,
			y,
			z
		});
	}
	spawnAll(spawns, diff) {
		for (const s of spawns) this.enemies.push(this.makeEnemy(s, diff));
	}
	makeEnemy(s, diff) {
		const boss = s.kind === "boss";
		const mark = s.kind === "marksman";
		const mult = diff === "hard" ? 1.35 : 1;
		const feet = boss ? 1.15 : .77;
		const radius = boss ? .48 : .32;
		const half = boss ? .62 : .45;
		const y = groundY(s.x, s.z) + feet;
		const body = this.world.createRigidBody(NC.RigidBodyDesc.kinematicPositionBased().setTranslation(s.x, y, s.z));
		const collider = this.world.createCollider(NC.ColliderDesc.capsule(half, radius).setCollisionGroups(groups(2, 3)), body);
		this.actorCols.add(collider.handle);
		const controller = this.world.createCharacterController(.04);
		controller.enableAutostep(.32, .18, true);
		controller.enableSnapToGround(.5);
		controller.setSlideEnabled(true);
		controller.setMaxSlopeClimbAngle(50 * Math.PI / 180);
		const fig = makeFigure({
			coat: boss ? 3810332 : mark ? 4011044 : 5914676,
			skin: boss ? 12036248 : 13351076,
			eyes: boss ? 16730666 : 9182232,
			scale: boss ? 1.38 : mark ? 1.05 : 1,
			hunched: !mark,
			spikes: boss,
			rifle: mark
		});
		fig.group.position.set(s.x, groundY(s.x, s.z), s.z);
		this.scene.add(fig.group);
		return {
			id: s.id,
			kind: s.kind,
			hp: Math.round((boss ? 480 : mark ? 50 : 74) * mult),
			maxHp: Math.round((boss ? 480 : mark ? 50 : 74) * mult),
			speed: (boss ? 2.45 : mark ? 1.85 : 2.15) * (diff === "hard" ? 1.08 : 1),
			damage: (boss ? 26 : mark ? 13 : 15) * (diff === "hard" ? 1.15 : 1),
			range: boss ? 2.45 : mark ? 16 : 1.7,
			vision: boss ? 20 : mark ? 18 : 12,
			yaw: s.yaw,
			waypoints: s.waypoints,
			wp: 0,
			wait: 0,
			state: "patrol",
			stateTime: 0,
			strikeAt: .4,
			struck: false,
			attack: "melee",
			cooldown: .4,
			investigate: null,
			path: [],
			pathI: 0,
			pathCd: 0,
			flash: 0,
			deadT: 0,
			phase: 1,
			chargeX: 0,
			chargeZ: 1,
			body,
			collider,
			controller,
			mesh: fig.group,
			parts: fig.parts,
			wishX: 0,
			wishZ: 0,
			vy: 0,
			feet,
			radius,
			headR: boss ? .28 : .2,
			groan: 0,
			stuck: 0,
			lastX: s.x,
			lastZ: s.z,
			active: s.kind !== "boss",
			walk: Math.random() * 4
		};
	}
	restoreEnemy(e, full) {
		const spawn = this.level.spawns.find((s) => s.id === e.id);
		if (!spawn) return;
		const mult = this.difficulty === "hard" ? 1.35 : 1;
		const base = e.kind === "boss" ? 480 : e.kind === "marksman" ? 50 : 74;
		e.maxHp = Math.round(base * mult);
		e.hp = e.maxHp;
		e.state = "patrol";
		e.stateTime = 0;
		e.deadT = 0;
		e.flash = 0;
		e.cooldown = .5;
		e.phase = 1;
		e.active = e.kind !== "boss";
		e.collider.setSensor(false);
		e.wp = 0;
		const y = groundY(spawn.x, spawn.z) + e.feet;
		e.body.setTranslation({
			x: spawn.x,
			y,
			z: spawn.z
		}, true);
		e.mesh.rotation.x = 0;
		if (!full);
	}
	resetDoors() {
		for (const door of [this.level.doors.barn, this.level.doors.chapel]) {
			door.collider.setSensor(false);
			door.hinge.rotation.y = 0;
		}
		this.rebuildNav();
	}
	openDoor(which) {
		const door = this.level.doors[which];
		door.collider.setSensor(true);
		door.hinge.rotation.y = -1.35;
		this.rebuildNav();
	}
	rebuildNav() {
		const gaps = [];
		if (this.flags.barnOpen) gaps.push(this.level.doors.barn.gap);
		if (this.flags.chapelOpen && !(this.flags.bossStarted && !this.flags.bossDefeated)) gaps.push(this.level.doors.chapel.gap);
		this.level.blocked = bakeNav(this.level.solids, gaps);
		setNavGrid(this.level.blocked);
	}
	syncBraziers() {
		this.level.braziers.forEach((b, i) => {
			const on = this.lit[i] === true;
			b.light.intensity = on ? 2.4 : 0;
			b.mat.emissiveIntensity = on ? 2.2 : .12;
		});
	}
	say(text, seconds) {
		this.subtitleT = seconds;
		useGame.setState({ subtitle: text });
	}
	toast(text) {
		this.toastT = 2.6;
		useGame.setState({ toast: text });
	}
	nearestEnemyDist() {
		const p = this.playerBody.translation();
		let best = 99;
		for (const e of this.enemies) {
			if (e.state === "dead" || !e.active) continue;
			const t = e.body.translation();
			best = Math.min(best, Math.hypot(t.x - p.x, t.z - p.z));
		}
		return best;
	}
	makeFx() {
		const geo = new SphereGeometry(.12, 6, 6);
		for (let i = 0; i < 16; i++) {
			const mesh = new Mesh(geo, new MeshBasicMaterial({
				color: 16769216,
				transparent: true,
				opacity: 0
			}));
			mesh.visible = true;
			this.scene.add(mesh);
			this.sparks.push({
				mesh,
				life: 0
			});
		}
		try {
			this.composer = new EffectComposer(this.renderer);
			this.composer.addPass(new RenderPass(this.scene, this.camera));
			this.bloom = new UnrealBloomPass(new Vector2(800, 600), .22, .4, .72);
			this.composer.addPass(this.bloom);
			this.composer.addPass(new OutputPass());
		} catch {
			this.composer = null;
		}
	}
	applyQuality(q) {
		const dpr = q === "low" ? 1 : q === "high" ? Math.min(1.6, window.devicePixelRatio || 1) : Math.min(1.25, window.devicePixelRatio || 1);
		this.renderer.setPixelRatio(dpr);
		this.renderer.shadowMap.enabled = q !== "low";
		const size = q === "high" ? 2048 : 1024;
		this.level.sun.shadow.mapSize.set(size, size);
		this.level.sun.shadow.map?.dispose();
		if (this.bloom) this.bloom.enabled = q !== "low";
		this.resize();
	}
	resize = () => {
		const w = this.canvas.clientWidth || window.innerWidth;
		const h = this.canvas.clientHeight || window.innerHeight;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / Math.max(1, h);
		this.camera.updateProjectionMatrix();
		this.composer?.setSize(w, h);
	};
	onResize = () => this.resize();
	touchWanted() {
		if (this.settings.touch === "on") return true;
		if (this.settings.touch === "off") return false;
		return window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 760;
	}
	capturePointer() {
		if (this.touchWanted()) return;
		const req = this.canvas.requestPointerLock?.({ unadjustedMovement: true });
		if (req && typeof req.catch === "function") req.catch(() => {
			this.fallbackLook = true;
			this.publish(true);
		});
	}
	releasePointer() {
		if (document.pointerLockElement) document.exitPointerLock();
	}
	bind() {
		this.onKeyDown = (e) => {
			if (e.code === "Tab" || e.code === "Space") e.preventDefault();
			if (e.repeat) return;
			this.keys.add(e.code);
			const screen = useGame.getState().screen;
			if (e.code === "Escape") {
				if (screen === "play") this.pause();
				else if (screen === "pause" || screen === "inventory") this.resume();
				else if (screen === "settings") this.closeSettings();
				return;
			}
			if (e.code === "Tab") {
				if (screen === "play") this.openInventory();
				else if (screen === "inventory") this.resume();
				return;
			}
			if (screen !== "play") return;
			if (e.code === "KeyE") this.interactEdge = true;
			if (e.code === "KeyR") this.reloadEdge = true;
			if (e.code === "KeyF") this.meleeEdge = true;
			if (e.code === "Space") this.dodgeEdge = true;
			if (e.code === "Digit1") this.equipped = "pistol";
			if (e.code === "Digit2" && this.flags.hasShotgun) this.equipped = "shotgun";
		};
		this.onKeyUp = (e) => this.keys.delete(e.code);
		this.onMouseDown = (e) => {
			if (useGame.getState().screen !== "play") return;
			if (e.button === 0) {
				if (document.pointerLockElement !== this.canvas && !this.touchWanted()) this.capturePointer();
				this.setFire(true);
			}
			if (e.button === 2) {
				if (document.pointerLockElement === this.canvas) this.meleeEdge = true;
				else this.lookDrag = true;
			}
		};
		this.onMouseUp = (e) => {
			if (e.button === 0) this.setFire(false);
			if (e.button === 2) this.lookDrag = false;
		};
		this.onMouseMove = (e) => {
			if (document.pointerLockElement === this.canvas || this.lookDrag) {
				this.mouseX += e.movementX;
				this.mouseY += e.movementY;
			}
		};
		this.onWheel = (e) => {
			if (useGame.getState().screen !== "play") return;
			if (e.deltaY > 0 && this.flags.hasShotgun) this.equipped = "shotgun";
			if (e.deltaY < 0) this.equipped = "pistol";
		};
		this.onContext = (e) => e.preventDefault();
		window.addEventListener("keydown", this.onKeyDown);
		window.addEventListener("keyup", this.onKeyUp);
		window.addEventListener("mousedown", this.onMouseDown);
		window.addEventListener("mouseup", this.onMouseUp);
		window.addEventListener("mousemove", this.onMouseMove);
		window.addEventListener("wheel", this.onWheel, { passive: true });
		window.addEventListener("resize", this.onResize);
		window.addEventListener("blur", this.onBlur);
		document.addEventListener("pointerlockchange", this.onLock);
		document.addEventListener("visibilitychange", this.onVis);
		this.canvas.addEventListener("contextmenu", this.onContext);
	}
	unbind() {
		window.removeEventListener("keydown", this.onKeyDown);
		window.removeEventListener("keyup", this.onKeyUp);
		window.removeEventListener("mousedown", this.onMouseDown);
		window.removeEventListener("mouseup", this.onMouseUp);
		window.removeEventListener("mousemove", this.onMouseMove);
		window.removeEventListener("wheel", this.onWheel);
		window.removeEventListener("resize", this.onResize);
		window.removeEventListener("blur", this.onBlur);
		document.removeEventListener("pointerlockchange", this.onLock);
		document.removeEventListener("visibilitychange", this.onVis);
		this.canvas.removeEventListener("contextmenu", this.onContext);
	}
	installProbe() {
		if (!new URLSearchParams(location.search).has("qa")) return;
		window.__controlsTest = {
			getYaw: () => this.getYaw(),
			getSpeed: () => this.getSpeed(),
			getPos: () => this.getPos(),
			setKeys: (codes) => this.setDebugKeys(codes),
			setPos: (x, y, z, yaw) => this.placePlayer(x, y, z, yaw ?? this.yaw),
			setSteer: () => void 0
		};
	}
};
function approach(v, target, max) {
	const d = target - v;
	if (Math.abs(d) <= max) return target;
	return v + Math.sign(d) * max;
}
function wrap(v, size) {
	return (v % size + size) % size;
}
function raySphere(o, d, c, r) {
	const ocx = o.x - c.x;
	const ocy = o.y - c.y;
	const ocz = o.z - c.z;
	const b = ocx * d.x + ocy * d.y + ocz * d.z;
	const c2 = ocx * ocx + ocy * ocy + ocz * ocz - r * r;
	const disc = b * b - c2;
	if (disc < 0) return null;
	const s = Math.sqrt(disc);
	const t = -b - s;
	if (t > .01) return t;
	const t2 = -b + s;
	return t2 > .01 ? t2 : null;
}
function GameView() {
	const canvasRef = (0, import_react.useRef)(null);
	const engineRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		let dead = false;
		let engine = null;
		Engine.create(canvas).then((created) => {
			if (dead) {
				created.dispose();
				return;
			}
			engine = created;
			engineRef.current = created;
		}).catch((err) => {
			const message = err instanceof Error ? err.message : "WebGL failed to start.";
			useGame.setState({
				screen: "error",
				bootError: message,
				ready: true
			});
		});
		return () => {
			dead = true;
			engine?.dispose();
			engineRef.current = null;
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 touch-none overflow-hidden bg-bg font-sans text-fg select-none",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
				ref: canvasRef,
				className: "absolute inset-0 h-full w-full"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "vignette pointer-events-none absolute inset-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chrome, { engineRef })
		]
	});
}
//#endregion
export { GameView };
