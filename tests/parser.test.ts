import assert from "node:assert";
import { describe, it } from "node:test";
import { calculateChangeRatio, isSubstantiveDifference, parseCoachResponse } from "../src/coach.ts";

describe("Coach Parser & Metrics Module", () => {
	const original = "i like to chat with ai in english, currently, i wanna improve this performance.";

	it("should parse standard valid JSON response", () => {
		const raw = JSON.stringify({
			has_issues: true,
			improved: "I like chatting with AI in English. Currently, I want to improve my fluency.",
			diff: [
				{ type: "remove", text: "i like to chat" },
				{ type: "add", text: "I like chatting" },
				{ type: "same", text: " with AI in English." },
			],
			vocabulary: [{ word: "fluency", chinese: "流利度" }],
		});

		const res = parseCoachResponse(raw, original);
		assert.strictEqual(res.has_issues, true);
		assert.strictEqual(res.improved, "I like chatting with AI in English. Currently, I want to improve my fluency.");
		assert.strictEqual(res.diff.length, 3);
		assert.strictEqual(res.vocabulary[0].word, "fluency");
	});

	it("should cleanly parse JSON wrapped in markdown code fence", () => {
		const raw = "```json\n" +
			JSON.stringify({
				has_issues: false,
				improved: original,
				diff: [{ type: "same", text: original }],
				vocabulary: [],
			}) +
			"\n```";

		const res = parseCoachResponse(raw, original);
		assert.strictEqual(res.has_issues, false);
		assert.strictEqual(res.improved, original);
	});

	it("should ignore differences that are only casing or punctuation marks", () => {
		const prompt = "i want to know how this works";
		// LLM capitalized 'I' and added a period
		const pedanticLlmResponse = JSON.stringify({
			has_issues: true,
			improved: "I want to know how this works.",
			diff: [],
			vocabulary: [],
		});

		assert.strictEqual(isSubstantiveDifference(prompt, "I want to know how this works."), false);

		const res = parseCoachResponse(pedanticLlmResponse, prompt);
		// Should be automatically filtered out as has_issues: false!
		assert.strictEqual(res.has_issues, false);
		assert.strictEqual(res.improved, prompt);
	});

	it("should detect substantive differences", () => {
		const prompt = "how would you know that i am currently need english helper";
		const improved = "How do you know that I currently need English assistance?";
		assert.strictEqual(isSubstantiveDifference(prompt, improved), true);
	});

	it("should fall back gracefully on malformed JSON without throwing", () => {
		const raw = "This is not JSON at all! Just some text.";
		const res = parseCoachResponse(raw, original);
		assert.strictEqual(res.has_issues, false);
		assert.strictEqual(res.improved, original);
	});

	it("should calculate change ratio correctly", () => {
		const diff = [
			{ type: "same" as const, text: "I " },
			{ type: "remove" as const, text: "wanna" },
			{ type: "add" as const, text: "want to" },
			{ type: "same" as const, text: " test." },
		];
		const prompt = "I wanna test.";
		const ratio = calculateChangeRatio(diff, prompt);
		assert.strictEqual(ratio, 0.333);
	});
});
