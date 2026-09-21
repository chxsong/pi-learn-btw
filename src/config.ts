import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { CoachConfig } from "./types.ts";

export const DEFAULT_DATA_DIR = path.join(os.homedir(), ".pi", "learn-btw");
export const DEFAULT_CONFIG_FILE = path.join(DEFAULT_DATA_DIR, "config.json");
export const DEFAULT_HISTORY_FILE = path.join(DEFAULT_DATA_DIR, "history.jsonl");

// Legacy directory for auto-migration
export const LEGACY_DATA_DIR = path.join(os.homedir(), ".pi", "english-coach");
export const LEGACY_HISTORY_FILE = path.join(LEGACY_DATA_DIR, "history.jsonl");

export const DEFAULT_CONFIG: CoachConfig = {
	enabled: true,
	provider: "",
	modelId: "",
	targetLanguage: "English",
	rewritePrompt: false,
	defaultView: "diff",
	minWords: 3,
	maxWords: 120,
	shortcut: "alt+e",
	hasSeenWelcome: false,
};

export function loadConfig(configPath = DEFAULT_CONFIG_FILE): CoachConfig {
	try {
		if (fs.existsSync(configPath)) {
			const data = fs.readFileSync(configPath, "utf-8");
			const userConfig = JSON.parse(data);
			return {
				...DEFAULT_CONFIG,
				...userConfig,
				provider:
					process.env.PI_LEARN_BTW_PROVIDER ||
					process.env.PI_COACH_PROVIDER ||
					userConfig.provider ||
					DEFAULT_CONFIG.provider,
				modelId:
					process.env.PI_LEARN_BTW_MODEL ||
					process.env.PI_COACH_MODEL ||
					userConfig.modelId ||
					DEFAULT_CONFIG.modelId,
			};
		}
	} catch {
		// Fallback to defaults
	}

	return {
		...DEFAULT_CONFIG,
		provider:
			process.env.PI_LEARN_BTW_PROVIDER ||
			process.env.PI_COACH_PROVIDER ||
			DEFAULT_CONFIG.provider,
		modelId:
			process.env.PI_LEARN_BTW_MODEL ||
			process.env.PI_COACH_MODEL ||
			DEFAULT_CONFIG.modelId,
	};
}

export function saveConfig(config: Partial<CoachConfig>, configPath = DEFAULT_CONFIG_FILE): void {
	const dir = path.dirname(configPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const current = loadConfig(configPath);
	const updated = { ...current, ...config };
	fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), "utf-8");
}
