import assert from "node:assert";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it } from "node:test";
import { appendRecord, calculateStats, formatStatsDashboard, loadRecords } from "../src/store.ts";
import type { CoachRecord } from "../src/types.ts";

describe("Store & Analytics Module", () => {
	const tempDir = path.join(os.tmpdir(), "pi-english-coach-test-" + Date.now());
	const tempHistory = path.join(tempDir, "test-history.jsonl");

	it("should append and load records correctly", () => {
		const record1: CoachRecord = {
			id: "1",
			timestamp: Date.now(),
			original: "i have a idea",
			improved: "I have an idea",
			changeRatio: 0.25,
		};

		appendRecord(tempHistory, record1);

		const loaded = loadRecords(tempHistory);
		assert.strictEqual(loaded.length, 1);
		assert.strictEqual(loaded[0].original, "i have a idea");
		assert.strictEqual(loaded[0].improved, "I have an idea");
	});

	it("should calculate improvement trend and top new words over multiple records", () => {
		const records: CoachRecord[] = [
			// Early records
			{ id: "1", timestamp: 1, original: "need help", improved: "need assistance", changeRatio: 0.5 },
			{ id: "2", timestamp: 2, original: "need help", improved: "need assistance", changeRatio: 0.5 },
			{ id: "3", timestamp: 3, original: "a b", improved: "c d", changeRatio: 0.5 },
			// Later records (improving)
			{ id: "4", timestamp: 4, original: "a b", improved: "a d", changeRatio: 0.2 },
			{ id: "5", timestamp: 5, original: "a b", improved: "a d", changeRatio: 0.1 },
			{ id: "6", timestamp: 6, original: "a b", improved: "a d", changeRatio: 0.1 },
		];

		const stats = calculateStats(records);
		assert.strictEqual(stats.totalPrompts, 6);
		assert.ok(stats.improvementPercentage !== null && stats.improvementPercentage > 0);
		assert.ok(stats.trendDescription.includes("fewer mistakes"));
		assert.strictEqual(stats.topVocab[0].word, "assistance");
		assert.strictEqual(stats.topVocab[0].count, 2);

		const dashboard = formatStatsDashboard(stats);
		assert.ok(dashboard.some((line) => line.includes("Total prompts analyzed:") && line.includes("6")));
		assert.ok(dashboard.some((line) => line.includes("assistance") && line.includes("2x")));
	});

	// Cleanup
	it("cleanup temp directory", () => {
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});
});
