import type { DiffChunk } from "./types.ts";

export interface WordDiffResult {
	oldLineWords: Array<{ text: string; isChanged: boolean }>;
	newLineWords: Array<{ text: string; isChanged: boolean }>;
}

// Truecolor soft code diff styling (GitHub Dark / VS Code diff theme)
// Deleted words: soft dark red background + light red text
export const ANSI_OLD_PREFIX = "\x1b[38;2;248;81;73m- \x1b[0m";
export const ANSI_OLD_CHANGED = "\x1b[48;2;78;24;28m\x1b[38;2;255;160;160m";
export const ANSI_OLD_NORMAL = "\x1b[38;2;160;160;160m";

// Added/improved words: soft dark green background + light green text
export const ANSI_NEW_PREFIX = "\x1b[38;2;63;185;80m+ \x1b[0m";
export const ANSI_NEW_CHANGED = "\x1b[48;2;20;55;28m\x1b[38;2;140;255;160m";
export const ANSI_NEW_NORMAL = "\x1b[38;2;225;225;225m";

export const ANSI_RESET = "\x1b[0m";

/**
 * Unicode-aware word cleaning (preserves Spanish ñ/á, German ä/ö/ü/ß, French ç/ê, etc.)
 */
export function cleanWord(w: string): string {
	return w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Word-level Myers / LCS diffing that strictly preserves word separation
 */
export function computeWordDiff(original: string, improved: string): WordDiffResult {
	const w1 = original.trim().split(/\s+/).filter(Boolean);
	const w2 = improved.trim().split(/\s+/).filter(Boolean);

	const m = w1.length;
	const n = w2.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			const c1 = cleanWord(w1[i - 1]);
			const c2 = cleanWord(w2[j - 1]);
			if (c1 === c2 && c1.length > 0) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}

	const oldLineWords: Array<{ text: string; isChanged: boolean }> = [];
	const newLineWords: Array<{ text: string; isChanged: boolean }> = [];

	let i = m;
	let j = n;

	while (i > 0 || j > 0) {
		const c1 = i > 0 ? cleanWord(w1[i - 1]) : "";
		const c2 = j > 0 ? cleanWord(w2[j - 1]) : "";

		if (i > 0 && j > 0 && c1 === c2 && c1.length > 0) {
			oldLineWords.unshift({ text: w1[i - 1], isChanged: false });
			newLineWords.unshift({ text: w2[j - 1], isChanged: false });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			newLineWords.unshift({ text: w2[j - 1], isChanged: true });
			j--;
		} else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
			oldLineWords.unshift({ text: w1[i - 1], isChanged: true });
			i--;
		}
	}

	return { oldLineWords, newLineWords };
}

/**
 * Render Old Line with soft code diff red styling
 */
export function renderOldLine(
	words: Array<{ text: string; isChanged: boolean }>,
	prefix = ANSI_OLD_PREFIX
): string {
	const renderedWords = words.map((w) => {
		if (w.isChanged) {
			return `${ANSI_OLD_CHANGED} ${w.text} ${ANSI_RESET}`;
		}
		return `${ANSI_OLD_NORMAL}${w.text}${ANSI_RESET}`;
	});

	return `${prefix}${renderedWords.join(" ")}`;
}

/**
 * Render New Line with soft code diff green styling
 */
export function renderNewLine(
	words: Array<{ text: string; isChanged: boolean }>,
	prefix = ANSI_NEW_PREFIX
): string {
	const renderedWords = words.map((w) => {
		if (w.isChanged) {
			return `${ANSI_NEW_CHANGED} ${w.text} ${ANSI_RESET}`;
		}
		return `${ANSI_NEW_NORMAL}${w.text}${ANSI_RESET}`;
	});

	return `${prefix}${renderedWords.join(" ")}`;
}

/**
 * Backwards compatibility helper for existing callers
 */
export function computeTokenDiff(original: string, improved: string): DiffChunk[] {
	const { oldLineWords, newLineWords } = computeWordDiff(original, improved);
	const chunks: DiffChunk[] = [];

	for (const w of oldLineWords) {
		if (w.isChanged) {
			chunks.push({ type: "remove", text: w.text });
		} else {
			chunks.push({ type: "same", text: w.text });
		}
	}
	for (const w of newLineWords) {
		if (w.isChanged) {
			chunks.push({ type: "add", text: w.text });
		}
	}
	return chunks;
}

export function renderDiffAnsi(
	chunks: DiffChunk[],
	mode: "diff" | "improved" | "original" = "diff"
): string {
	if (mode === "original") {
		return chunks
			.filter((c) => c.type === "same" || c.type === "remove")
			.map((c) => (c.type === "remove" ? `${ANSI_OLD_CHANGED} ${c.text} ${ANSI_RESET}` : c.text))
			.join(" ");
	}

	if (mode === "improved") {
		return chunks
			.filter((c) => c.type === "same" || c.type === "add")
			.map((c) => (c.type === "add" ? `${ANSI_NEW_CHANGED} ${c.text} ${ANSI_RESET}` : c.text))
			.join(" ");
	}

	return chunks
		.map((c) => {
			if (c.type === "remove") return `${ANSI_OLD_CHANGED} ${c.text} ${ANSI_RESET}`;
			if (c.type === "add") return `${ANSI_NEW_CHANGED} ${c.text} ${ANSI_RESET}`;
			return c.text;
		})
		.join(" ");
}
