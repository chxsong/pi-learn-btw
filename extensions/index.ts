import { uuidv7 } from "@earendil-works/pi-ai";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi, type Component } from "@earendil-works/pi-tui";
import * as fs from "node:fs";
import { buildCoachPrompt, calculateChangeRatio, parseCoachResponse } from "../src/coach.ts";
import { DEFAULT_CONFIG_FILE, DEFAULT_HISTORY_FILE, loadConfig, saveConfig } from "../src/config.ts";
import { computeWordDiff, renderNewLine, renderOldLine, type WordDiffResult } from "../src/diff.ts";
import { appendRecord, calculateStats, formatStatsDashboard, loadRecords } from "../src/store.ts";
import type { CoachRecord, CoachResponse } from "../src/types.ts";

export default function (pi: ExtensionAPI) {
	let config = loadConfig(DEFAULT_CONFIG_FILE);

	// Runtime state
	let currentViewMode: "diff" | "improved" | "original" = config.defaultView || "diff";
	let lastResult: CoachResponse | null = null;
	let lastOriginalPrompt = "";
	let currentWordDiff: WordDiffResult | null = null;

	function buildWidgetLines(): string[] {
		if (!config.enabled || !lastResult) return [];

		if (!lastResult.has_issues) {
			return [`\x1b[90m[learn-btw]\x1b[0m \x1b[32mExpression is natural and clear.\x1b[0m`];
		}

		if (!currentWordDiff) return [];

		const lines: string[] = [];
		const modeLabel = currentViewMode.toUpperCase();
		lines.push(`\x1b[90mlearn-btw [${modeLabel}] • Alt+E to toggle view\x1b[0m`);

		if (currentViewMode === "diff") {
			lines.push(renderOldLine(currentWordDiff.oldLineWords));
			lines.push(renderNewLine(currentWordDiff.newLineWords));
		} else if (currentViewMode === "improved") {
			lines.push(renderNewLine(currentWordDiff.newLineWords));
		} else if (currentViewMode === "original") {
			lines.push(renderOldLine(currentWordDiff.oldLineWords));
		}

		return lines;
	}

	function updateWidget(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;

		if (!config.enabled) {
			ctx.ui.setWidget("learn-btw", undefined);
			return;
		}

		ctx.ui.setWidget(
			"learn-btw",
			(_tui, _theme): Component => ({
				render(width: number): string[] {
					const rawLines = buildWidgetLines();
					const safeLines: string[] = [];

					for (const rawLine of rawLines) {
						const wrapped = wrapTextWithAnsi(rawLine, width);
						for (const w of wrapped) {
							safeLines.push(truncateToWidth(w, width));
						}
					}

					return safeLines;
				},
				invalidate() {},
			}),
			{ placement: "belowEditor" }
		);
	}

	async function runCoach(prompt: string, ctx: ExtensionContext): Promise<CoachResponse | null> {
		if (!config.enabled) return null;

		try {
			lastOriginalPrompt = prompt;

			let model = ctx.modelRegistry.find(config.provider, config.modelId);
			if (!model || !ctx.modelRegistry.hasConfiguredAuth(model)) {
				const available = ctx.modelRegistry.getAvailable();
				model =
					available.find(
						(m) =>
							m.id.includes("flash") ||
							m.id.includes("mini") ||
							m.id.includes("haiku") ||
							m.id.includes("8b")
					) ?? ctx.model;

				if (model && (config.provider !== model.provider || config.modelId !== model.id)) {
					config.provider = model.provider;
					config.modelId = model.id;
					saveConfig({ provider: config.provider, modelId: config.modelId }, DEFAULT_CONFIG_FILE);
					if (ctx.hasUI) {
						ctx.ui.notify(
							`learn-btw: Default model unauthenticated. Auto-switched to ${model.provider}/${model.id}. Run /learn-btw config to change.`,
							"warning"
						);
					}
				}
			}

			if (!model || !ctx.modelRegistry.hasConfiguredAuth(model)) {
				return null;
			}

			const promptContent = buildCoachPrompt(prompt, config.targetLanguage || "English");
			const messages = [
				{
					role: "user" as const,
					content: [{ type: "text" as const, text: promptContent }],
					timestamp: Date.now(),
				},
			];

			const res = await ctx.modelRegistry.complete(
				model,
				{ messages },
				{
					cacheRetention: "none",
					sessionId: uuidv7(),
					signal: AbortSignal.timeout(8000),
				}
			);

			const rawText = res.content
				.filter((c): c is { type: "text"; text: string } => c.type === "text")
				.map((c) => c.text)
				.join("")
				.trim();

			const parsed = parseCoachResponse(rawText, prompt);
			lastResult = parsed;

			if (parsed.has_issues) {
				currentWordDiff = computeWordDiff(prompt, parsed.improved);
			} else {
				currentWordDiff = null;
			}

			updateWidget(ctx);

			if (parsed.has_issues) {
				const changeRatio = calculateChangeRatio(parsed.diff || [], prompt);
				const record: CoachRecord = {
					id: uuidv7(),
					timestamp: Date.now(),
					original: prompt,
					improved: parsed.improved,
					changeRatio,
				};
				appendRecord(DEFAULT_HISTORY_FILE, record);
			}

			return parsed;
		} catch {
			return null;
		}
	}

	// 0. Session lifecycle handlers (First-run wizard & cleanup)
	pi.on("session_start", async (event, ctx) => {
		if (!ctx.hasUI) return;

		// Post-installation / first-run prompt
		if (!config.hasSeenWelcome && event.reason === "startup") {
			config.hasSeenWelcome = true;
			saveConfig({ hasSeenWelcome: true }, DEFAULT_CONFIG_FILE);

			// Check if default model is authenticated
			const configuredModel = ctx.modelRegistry.find(config.provider, config.modelId);
			const hasAuth = configuredModel ? ctx.modelRegistry.hasConfiguredAuth(configuredModel) : false;

			if (!hasAuth) {
				const available = ctx.modelRegistry.getAvailable();
				const suggested = available.find((m) =>
					m.id.includes("flash") || m.id.includes("mini") || m.id.includes("haiku") || m.id.includes("8b")
				) ?? ctx.model;

				if (suggested) {
					config.provider = suggested.provider;
					config.modelId = suggested.id;
					saveConfig({ provider: config.provider, modelId: config.modelId }, DEFAULT_CONFIG_FILE);
				}
			}

			const setupNow = await ctx.ui.confirm(
				"pi-learn-btw: Initial Setup",
				`Welcome to pi-learn-btw!\n\n` +
				`Current Configuration:\n` +
				`• Target Language: ${config.targetLanguage || "English"}\n` +
				`• Coach Model: ${config.provider}/${config.modelId}\n` +
				`• View Mode: ${config.defaultView || "diff"}\n\n` +
				`Would you like to configure your coach model and preferences now?`
			);

			if (setupNow) {
				await openConfigMenu(ctx);
			} else {
				ctx.ui.notify(
					`learn-btw: Active (${config.provider}/${config.modelId}). Run /learn-btw config anytime to customize.`,
					"info"
				);
			}
		}
	});

	pi.on("session_shutdown", async (_event, ctx) => {
		if (ctx.hasUI) {
			ctx.ui.setWidget("learn-btw", undefined);
		}
		lastResult = null;
		currentWordDiff = null;
	});

	// 1. User input interceptor
	pi.on("input", async (event, ctx) => {
		if (!config.enabled) return undefined;

		const words = event.text.trim().split(/\s+/).filter(Boolean);
		const maxWords = config.maxWords ?? 120;
		if (event.source !== "interactive" || words.length < config.minWords || words.length > maxWords) {
			return undefined;
		}

		if (/^[!/$#]/.test(event.text.trim()) || event.text.trim().startsWith("```")) {
			return undefined;
		}

		if (config.rewritePrompt) {
			const res = await runCoach(event.text, ctx);
			if (res && res.has_issues && res.improved) {
				return { action: "transform", text: res.improved };
			}
			return undefined;
		}

		runCoach(event.text, ctx);
		return undefined;
	});

	// 2. Keyboard shortcut: Alt+E to cycle view modes
	pi.registerShortcut("alt+e", {
		description: "Toggle learn-btw view mode (Diff / Improved / Original)",
		handler: async (ctx) => {
			if (currentViewMode === "diff") currentViewMode = "improved";
			else if (currentViewMode === "improved") currentViewMode = "original";
			else currentViewMode = "diff";

			updateWidget(ctx);
		},
	});

	// Interactive configuration wizard
	async function openConfigMenu(ctx: ExtensionContext) {
		if (!ctx.hasUI) return;

		const targetLangLabel = config.targetLanguage || "English";
		const rewriteLabel = config.rewritePrompt ? "Enabled" : "Disabled";
		const modelLabel = `${config.provider}/${config.modelId}`;
		const viewLabel = config.defaultView || "diff";

		const options = [
			`1. Target Language: [${targetLangLabel}]`,
			`2. Send Polished Prompt to AI: [${rewriteLabel}]`,
			`3. Select Model: [${modelLabel}]`,
			`4. Default View: [${viewLabel}]`,
			"5. Clear All History Data",
			"Exit",
		];

		const choice = await ctx.ui.select("learn-btw configuration", options);
		if (!choice || choice === "Exit") return;

		if (choice.startsWith("1.")) {
			// Target Language (space-delimited languages supported)
			const langChoice = await ctx.ui.select(
				"Select Target Language (space-delimited languages supported)",
				[
					"English (Recommended)",
					"Spanish (Español)",
					"French (Français)",
					"German (Deutsch)",
					"Italian (Italiano)",
					"Portuguese (Português)",
					"Custom (space-separated)...",
				]
			);

			if (langChoice === "Custom (space-separated)...") {
				const custom = await ctx.ui.input("Enter language name (e.g. Dutch, Swedish):", "");
				if (custom && custom.trim()) {
					config.targetLanguage = custom.trim();
					saveConfig({ targetLanguage: config.targetLanguage }, DEFAULT_CONFIG_FILE);
					ctx.ui.notify(`learn-btw: target language set to ${config.targetLanguage}.`, "info");
				}
			} else if (langChoice) {
				config.targetLanguage = langChoice.split(" ")[0];
				saveConfig({ targetLanguage: config.targetLanguage }, DEFAULT_CONFIG_FILE);
				ctx.ui.notify(`learn-btw: target language set to ${config.targetLanguage}.`, "info");
			}
		} else if (choice.startsWith("2.")) {
			// Rewrite prompt
			const rewriteChoice = await ctx.ui.select("Send Polished Prompt to AI?", [
				"Disabled (0ms latency, sends what you typed)",
				"Enabled (Wait for polish, sends improved prompt to AI)",
			]);
			if (rewriteChoice) {
				config.rewritePrompt = rewriteChoice.startsWith("Enabled");
				saveConfig({ rewritePrompt: config.rewritePrompt }, DEFAULT_CONFIG_FILE);
				ctx.ui.notify(
					`learn-btw: prompt rewrite ${config.rewritePrompt ? "enabled" : "disabled"}.`,
					"info"
				);
			}
		} else if (choice.startsWith("3.")) {
			// Select Model from authenticated available models
			const availableModels = ctx.modelRegistry.getAvailable();
			const flashModels = availableModels
				.filter((m) =>
					m.id.includes("flash") ||
					m.id.includes("mini") ||
					m.id.includes("haiku") ||
					m.id.includes("8b") ||
					m.provider === config.provider
				)
				.map((m) => `${m.provider}/${m.id}`);

			const otherModels = availableModels
				.map((m) => `${m.provider}/${m.id}`)
				.filter((id) => !flashModels.includes(id));

			const uniqueModels = Array.from(new Set([...flashModels, ...otherModels]));

			const modelChoice = await ctx.ui.select("Select Model (Authenticated Providers)", [
				...uniqueModels,
				"Custom...",
			]);

			if (modelChoice === "Custom...") {
				const custom = await ctx.ui.input("Enter model as provider/model_id:", "antigravity/gemini-3.8-flash");
				if (custom && custom.includes("/")) {
					const slashIdx = custom.indexOf("/");
					const p = custom.slice(0, slashIdx).trim();
					const m = custom.slice(slashIdx + 1).trim();
					config.provider = p;
					config.modelId = m;
					saveConfig({ provider: config.provider, modelId: config.modelId }, DEFAULT_CONFIG_FILE);
					ctx.ui.notify(`learn-btw: model set to ${config.provider}/${config.modelId}.`, "info");
				}
			} else if (modelChoice && modelChoice.includes("/")) {
				const slashIdx = modelChoice.indexOf("/");
				const p = modelChoice.slice(0, slashIdx).trim();
				const m = modelChoice.slice(slashIdx + 1).trim();
				config.provider = p;
				config.modelId = m;
				saveConfig({ provider: config.provider, modelId: config.modelId }, DEFAULT_CONFIG_FILE);
				ctx.ui.notify(`learn-btw: model set to ${config.provider}/${config.modelId}.`, "info");
			}
		} else if (choice.startsWith("4.")) {
			// Default View
			const viewChoice = await ctx.ui.select("Select Default View", [
				"diff (stacked 2-line red/green diff)",
				"improved (clean native expression only)",
				"original (your original prompt only)",
			]);
			if (viewChoice) {
				const v = viewChoice.split(" ")[0] as "diff" | "improved" | "original";
				config.defaultView = v;
				currentViewMode = v;
				saveConfig({ defaultView: v }, DEFAULT_CONFIG_FILE);
				updateWidget(ctx);
				ctx.ui.notify(`learn-btw: default view set to ${v}.`, "info");
			}
		} else if (choice.startsWith("5.")) {
			// Clear History
			const confirmed = await ctx.ui.confirm(
				"Clear History",
				"Are you sure you want to reset all learn-btw history data?"
			);
			if (confirmed) {
				try {
					if (fs.existsSync(DEFAULT_HISTORY_FILE)) {
						fs.unlinkSync(DEFAULT_HISTORY_FILE);
					}
					// Also clean up any legacy files to prevent resurrection
					import("../src/config.ts").then(({ LEGACY_HISTORY_FILE }) => {
						try {
							if (fs.existsSync(LEGACY_HISTORY_FILE)) fs.unlinkSync(LEGACY_HISTORY_FILE);
							const migrated = `${LEGACY_HISTORY_FILE}.migrated`;
							if (fs.existsSync(migrated)) fs.unlinkSync(migrated);
						} catch {
							// Non-critical
						}
					});
					ctx.ui.notify("learn-btw: history reset.", "info");
				} catch {
					ctx.ui.notify("learn-btw: failed to clear history.", "error");
				}
			}
		}
	}

	// Command execution handler for /learn-btw (and alias /btw)
	async function handleLearnBtwCommand(args: string, ctx: ExtensionCommandContext) {
		const parts = (args || "").trim().split(/\s+/).filter(Boolean);
		const sub = (parts[0] || "").toLowerCase();

		switch (sub) {
			case "on": {
				config.enabled = true;
				saveConfig({ enabled: true }, DEFAULT_CONFIG_FILE);
				ctx.ui.notify("learn-btw enabled.", "info");
				updateWidget(ctx);
				break;
			}
			case "off": {
				config.enabled = false;
				saveConfig({ enabled: false }, DEFAULT_CONFIG_FILE);
				ctx.ui.notify("learn-btw disabled.", "info");
				ctx.ui.setWidget("learn-btw", undefined);
				break;
			}
			case "stats": {
				const records = loadRecords(DEFAULT_HISTORY_FILE);
				const stats = calculateStats(records);
				const dashboardLines = formatStatsDashboard(stats);
				if (ctx.hasUI) {
					ctx.ui.notify(dashboardLines.join("\n"), "info");
				}
				break;
			}
			case "config": {
				await openConfigMenu(ctx);
				break;
			}
			default: {
				// No arguments: toggle on / off
				config.enabled = !config.enabled;
				saveConfig({ enabled: config.enabled }, DEFAULT_CONFIG_FILE);

				if (config.enabled) {
					ctx.ui.notify("learn-btw enabled.", "info");
					updateWidget(ctx);
				} else {
					ctx.ui.notify("learn-btw disabled.", "info");
					ctx.ui.setWidget("learn-btw", undefined);
				}
				break;
			}
		}
	}

	const subcommands = [
		{ value: "on", label: "on", description: "Enable learn-btw" },
		{ value: "off", label: "off", description: "Disable learn-btw" },
		{ value: "stats", label: "stats", description: "Show learning analytics" },
		{ value: "config", label: "config", description: "Open interactive configuration wizard" },
	];

	// 3. Register primary command: /learn-btw
	pi.registerCommand("learn-btw", {
		description: "Learn English By The Way (/learn-btw [on|off|stats|config])",
		getArgumentCompletions(prefix) {
			const trimmed = prefix.trim();
			return subcommands.filter((s) => s.value.startsWith(trimmed));
		},
		handler: handleLearnBtwCommand,
	});

	// 4. Register short alias: /btw
	pi.registerCommand("btw", {
		description: "Alias for /learn-btw (/btw [on|off|stats|config])",
		getArgumentCompletions(prefix) {
			const trimmed = prefix.trim();
			return subcommands.filter((s) => s.value.startsWith(trimmed));
		},
		handler: handleLearnBtwCommand,
	});
}
