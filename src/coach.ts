import { computeTokenDiff } from "./diff.ts";
import type { CoachResponse, DiffChunk } from "./types.ts";

export function normalizeForComparison(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s]/gu, "")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Checks whether improved sentence has substantive changes beyond just casing and punctuation
 */
export function isSubstantiveDifference(original: string, improved: string): boolean {
	const normOriginal = normalizeForComparison(original);
	const normImproved = normalizeForComparison(improved);
	return normOriginal !== normImproved;
}

export function buildCoachPrompt(userPrompt: string, targetLanguage = "English"): string {
	return `You are a high-speed, practical ${targetLanguage} expression coach for software developers chatting with an AI agent.

CRITICAL RULES:
1. IGNORE capitalization and case sensitivity completely (e.g. lowercase sentence starts). Developers type quickly in lowercase in terminal prompts. Do NOT flag or correct these.
2. IGNORE minor punctuation marks (e.g. missing periods at the end, missing commas, or question marks). Do NOT flag or correct these.
3. If the user prompt is ALREADY grammatically correct and idiomatic in ${targetLanguage} aside from casing or punctuation, you MUST set "has_issues": false.
4. ONLY make improvements when there are SUBSTANTIVE issues:
   - Grammatical errors in ${targetLanguage} (e.g. incorrect tenses, agreement, prepositions).
   - Awkward or unidiomatic developer phrasing in ${targetLanguage}.

Respond ONLY with strict, valid JSON:
{
  "has_issues": boolean,
  "improved": "string"
}

User prompt:
"${userPrompt}"`;
}

export function parseCoachResponse(rawText: string, originalPrompt: string): CoachResponse {
	let cleaned = rawText.trim();
	if (cleaned.startsWith("```")) {
		cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
	}

	try {
		const parsed = JSON.parse(cleaned) as CoachResponse;

		if (typeof parsed.has_issues !== "boolean") {
			parsed.has_issues = true;
		}

		if (!parsed.improved || typeof parsed.improved !== "string") {
			parsed.improved = originalPrompt;
			parsed.has_issues = false;
		}

		// Client-side safety gate:
		// If the only differences are casing or punctuation, force has_issues = false!
		if (!isSubstantiveDifference(originalPrompt, parsed.improved)) {
			parsed.has_issues = false;
			parsed.improved = originalPrompt;
		}

		if (!Array.isArray(parsed.diff) || parsed.diff.length === 0) {
			if (parsed.has_issues && parsed.improved !== originalPrompt) {
				parsed.diff = computeTokenDiff(originalPrompt, parsed.improved);
			} else {
				parsed.diff = [{ type: "same", text: originalPrompt }];
			}
		}

		return parsed;
	} catch {
		return {
			has_issues: false,
			improved: originalPrompt,
			diff: [{ type: "same", text: originalPrompt }],
		};
	}
}

export function calculateChangeRatio(diff: DiffChunk[], originalPrompt: string): number {
	const originalWords = originalPrompt.trim().split(/\s+/).filter(Boolean).length || 1;
	const removedWords = diff
		.filter((d) => d.type === "remove")
		.reduce((sum, d) => sum + d.text.trim().split(/\s+/).filter(Boolean).length, 0);

	return Number((removedWords / originalWords).toFixed(3));
}
