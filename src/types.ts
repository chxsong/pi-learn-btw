export type DiffType = "same" | "remove" | "add";

export interface DiffChunk {
	type: DiffType;
	text: string;
}

export interface CoachResponse {
	has_issues: boolean;
	improved: string;
	diff?: DiffChunk[];
}

export interface CoachRecord {
	id: string;
	timestamp: number;
	original: string;
	improved: string;
	changeRatio: number;
}

export interface CoachConfig {
	enabled: boolean;
	provider: string;
	modelId: string;
	targetLanguage: string;
	rewritePrompt: boolean;
	defaultView: "diff" | "improved" | "original";
	minWords: number;
	maxWords?: number;
	shortcut: string;
	hasSeenWelcome?: boolean;
}

export interface CoachStats {
	totalPrompts: number;
	totalErrorsLogged: number;
	avgChangeRatio: number;
	improvementPercentage: number | null;
	trendDescription: string;
	recentRecords: CoachRecord[];
	topVocab: Array<{ word: string; count: number }>;
}
