export var unstable_ImmediatePriority: number;
export var unstable_UserBlockingPriority: number;
export var unstable_NormalPriority: number;
export var unstable_LowPriority: number;
export var unstable_IdlePriority: number;

export function unstable_runWithPriority(
	priority: number,
	callback: () => void
): void;

export function unstable_now(): DOMHighResTimeStamp;
