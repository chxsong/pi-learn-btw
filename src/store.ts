import * as fs from "node:fs";
import * as path from "node:path";
import { DEFAULT_HISTORY_FILE, LEGACY_HISTORY_FILE } from "./config.ts";
import { computeWordDiff } from "./diff.ts";
import type { CoachRecord, CoachStats } from "./types.ts";

export function appendRecord(historyFile: string, record: CoachRecord): void {
	const dir = path.dirname(historyFile);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const line = JSON.stringify(record) + "\n";
	fs.appendFileSync(historyFile, line, "utf-8");
}

/**
 * Ensures legacy data from ~/.pi/english-coach/history.jsonl is migrated
 */
export function migrateLegacyRecordsIfNeeded(historyFile: string): void {
	try {
		if (fs.existsSync(LEGACY_HISTORY_FILE)) {
			const legacyContent = fs.readFileSync(LEGACY_HISTORY_FILE, "utf-8").trim();
			if (!legacyContent) return;

			const legacyRecords: CoachRecord[] = legacyContent
				.split("\n")
				.filter(Boolean)
				.map((line) => {
					try {
						return JSON.parse(line);
					} catch {
						return null;
					}
				})
				.filter((r): r is CoachRecord => r !== null);

			if (legacyRecords.length === 0) return;

			const currentRecords = loadRecordsInternal(historyFile);
			const seen = new Set(currentRecords.map((r) => `${r.original}__${r.improved}`));

			let addedCount = 0;
			for (const r of legacyRecords) {
				const key = `${r.original}__${r.improved}`;
				if (!seen.has(key)) {
					seen.add(key);
					appendRecord(historyFile, r);
					addedCount++;
				}
			}

			if (addedCount > 0) {
				const all = loadRecordsInternal(historyFile);
				all.sort((a, b) => a.timestamp - b.timestamp);
				fs.writeFileSync(historyFile, all.map((r) => JSON.stringify(r)).join("\n") + "\n", "utf-8");
			}

			// Rename migrated legacy file so it doesn't re-migrate or resurrect after history is cleared
			try {
				fs.renameSync(LEGACY_HISTORY_FILE, `${LEGACY_HISTORY_FILE}.migrated`);
			} catch {
				// Non-critical
			}
		}
	} catch {
		// Non-critical migration failure
	}
}

function loadRecordsInternal(historyFile: string): CoachRecord[] {
	if (!fs.existsSync(historyFile)) {
		return [];
	}

	try {
		const content = fs.readFileSync(historyFile, "utf-8").trim();
		if (!content) return [];

		return content
			.split("\n")
			.filter((line) => line.trim().length > 0)
			.map((line) => {
				try {
					return JSON.parse(line) as CoachRecord;
				} catch {
					return null;
				}
			})
			.filter((r): r is CoachRecord => r !== null);
	} catch {
		return [];
	}
}

export function loadRecords(historyFile: string): CoachRecord[] {
	if (historyFile === DEFAULT_HISTORY_FILE) {
		migrateLegacyRecordsIfNeeded(historyFile);
	}
	return loadRecordsInternal(historyFile);
}

const COMMON_STOP_WORDS = new Set([
	"a", "an", "the", "to", "and", "or", "is", "are", "was", "were",
	"it", "in", "on", "at", "of", "for", "by", "with", "as", "be",
	"this", "that", "these", "those", "i", "you", "he", "she", "we", "they",
	"my", "your", "his", "her", "its", "our", "their", "so", "if", "not"
]);

export function calculateStats(records: CoachRecord[]): CoachStats {
	if (records.length === 0) {
		return {
			totalPrompts: 0,
			totalErrorsLogged: 0,
			avgChangeRatio: 0,
			improvementPercentage: null,
			trendDescription: "No history yet. Start chatting in English.",
			recentRecords: [],
			topVocab: [],
		};
	}

	const totalPrompts = records.length;
	const totalErrorsLogged = records.filter((r) => r.changeRatio > 0).length;

	const sumChangeRatio = records.reduce((acc, r) => acc + r.changeRatio, 0);
	const avgChangeRatio = Number((sumChangeRatio / totalPrompts).toFixed(3));

	let improvementPercentage: number | null = null;
	let trendDescription = "Collecting initial baseline...";

	if (totalPrompts >= 6) {
		const sampleSize = Math.max(3, Math.floor(totalPrompts * 0.25));
		const earlySlice = records.slice(0, sampleSize);
		const recentSlice = records.slice(-sampleSize);

		const earlyAvg = earlySlice.reduce((acc, r) => acc + r.changeRatio, 0) / earlySlice.length;
		const recentAvg = recentSlice.reduce((acc, r) => acc + r.changeRatio, 0) / recentSlice.length;

		if (earlyAvg > 0) {
			const delta = ((earlyAvg - recentAvg) / earlyAvg) * 100;
			improvementPercentage = Number(delta.toFixed(1));

			if (improvementPercentage > 0) {
				trendDescription = `You are making ${improvementPercentage}% fewer mistakes compared to earlier prompts.`;
			} else if (improvementPercentage === 0) {
				trendDescription = "Stable performance. Try using more complex sentence structures.";
			} else {
				trendDescription = `Error density increased by ${Math.abs(improvementPercentage)}% (practicing more complex structures).`;
			}
		}
	}

	// Extract new/improved words from diff (sample up to latest 200 records to prevent freezing on large histories)
	const vocabRecords = records.length > 200 ? records.slice(-200) : records;
	const vocabCountMap = new Map<string, number>();
	for (const r of vocabRecords) {
		if (r.original && r.improved) {
			const { newLineWords } = computeWordDiff(r.original, r.improved);
			for (const w of newLineWords) {
				if (w.isChanged) {
					const clean = w.text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
					// Filter out trivial stop words and short noise
					if (clean.length > 2 && !COMMON_STOP_WORDS.has(clean)) {
						vocabCountMap.set(clean, (vocabCountMap.get(clean) || 0) + 1);
					}
				}
			}
		}
	}

	const topVocab = Array.from(vocabCountMap.entries())
		.map(([word, count]) => ({ word, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 6);

	return {
		totalPrompts,
		totalErrorsLogged,
		avgChangeRatio,
		improvementPercentage,
		trendDescription,
		recentRecords: records.slice(-5),
		topVocab,
	};
}

export function formatStatsDashboard(stats: CoachStats): string[] {
	const lines: string[] = [
		`\x1b[1m\x1b[36mlearn-btw: learning analytics\x1b[0m`,
		`\x1b[90m────────────────────────────────────────────────────\x1b[0m`,
		`• \x1b[33mTotal prompts analyzed:\x1b[0m ${stats.totalPrompts}`,
		`• \x1b[33mCorrection rate:\x1b[0m ${((stats.totalErrorsLogged / (stats.totalPrompts || 1)) * 100).toFixed(1)}% (${stats.totalErrorsLogged} prompts had revisions)`,
		`• \x1b[33mAverage word change ratio:\x1b[0m ${(stats.avgChangeRatio * 100).toFixed(1)}%`,
		`• \x1b[33mLearning trend:\x1b[0m \x1b[32m${stats.trendDescription}\x1b[0m`,
	];

	if (stats.topVocab.length > 0) {
		lines.push(`\x1b[90m────────────────────────────────────────────────────\x1b[0m`);
		lines.push(`\x1b[1m\x1b[35mFrequently practiced vocabulary:\x1b[0m`);
		for (const v of stats.topVocab) {
			lines.push(`  • \x1b[1m${v.word}\x1b[0m — ${v.count}x`);
		}
	}

	lines.push(`\x1b[90m────────────────────────────────────────────────────\x1b[0m`);
	return lines;
}
