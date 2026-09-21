import assert from "node:assert";
import { describe, it } from "node:test";
import { computeWordDiff, renderNewLine, renderOldLine } from "../src/diff.ts";

describe("Diff Module", () => {
	const original = "how would you know that i am currently need english helper";
	const improved = "How do you know that I currently need English assistance";

	it("should compute word-level diff without sticking words together", () => {
		const result = computeWordDiff(original, improved);

		// Old line words
		const oldWords = result.oldLineWords.map((w) => w.text);
		assert.ok(oldWords.includes("how"));
		assert.ok(oldWords.includes("would"));
		assert.ok(oldWords.includes("you"));
		assert.ok(oldWords.includes("helper"));

		// New line words
		const newWords = result.newLineWords.map((w) => w.text);
		assert.ok(newWords.includes("How"));
		assert.ok(newWords.includes("do"));
		assert.ok(newWords.includes("assistance"));

		// Verify that casing differences (how vs How, i vs I, english vs English) are NOT marked as changed
		const howWord = result.oldLineWords.find((w) => w.text.toLowerCase() === "how");
		assert.strictEqual(howWord?.isChanged, false, "'how' should not be marked changed due to casing");
	});

	it("should render old line with soft code-diff red styling", () => {
		const result = computeWordDiff(original, improved);
		const rendered = renderOldLine(result.oldLineWords);

		// Must contain code diff red ANSI sequence
		assert.ok(rendered.includes("\x1b[48;2;78;24;28m"), "Should contain soft code-diff red background");
		assert.ok(rendered.startsWith("\x1b[38;2;248;81;73m- \x1b[0m"), "Should start with soft red '- '");
		// Ensure words are space-separated
		assert.ok(!rendered.includes("youknow"), "Words must not be stuck together");
		assert.ok(!rendered.includes("currentlyneed"), "Words must not be stuck together");
	});

	it("should render new line with soft code-diff green styling", () => {
		const result = computeWordDiff(original, improved);
		const rendered = renderNewLine(result.newLineWords);

		// Must contain code diff green ANSI sequence
		assert.ok(rendered.includes("\x1b[48;2;20;55;28m"), "Should contain soft code-diff green background");
		assert.ok(rendered.startsWith("\x1b[38;2;63;185;80m+ \x1b[0m"), "Should start with soft green '+ '");
		// Ensure words are space-separated
		assert.ok(!rendered.includes("youknow"), "Words must not be stuck together");
	});
});
