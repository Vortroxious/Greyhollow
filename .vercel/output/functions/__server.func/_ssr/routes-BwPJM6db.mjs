import { i as __toESM } from "../_runtime.mjs";
import { G as require_jsx_runtime, K as require_react } from "../_libs/@tanstack/react-router+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BwPJM6db.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function BootScreen({ label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "flex min-h-screen flex-col justify-between bg-bg px-6 py-8 text-fg sm:px-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-display text-sm tracking-widest text-muted uppercase",
				children: "Ashline Bureau"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-5xl text-fg sm:text-6xl",
					children: "Greyhollow"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-md text-base text-muted",
					children: label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 h-1 w-40 bg-line",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-full w-2/3 bg-primary" })
				})
			] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm text-muted",
				children: "Field report 04 — parish outbreak"
			})
		]
	});
}
function Home() {
	const [View, setView] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let dead = false;
		import("./GameView-DgHQddFi.mjs").then((mod) => {
			if (!dead) setView(() => mod.GameView);
		});
		return () => {
			dead = true;
		};
	}, []);
	if (!View) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BootScreen, { label: "Unsealing the parish records…" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(View, {});
}
//#endregion
export { Home as component };
