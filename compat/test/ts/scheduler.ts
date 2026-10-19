import {
	unstable_runWithPriority,
	unstable_NormalPriority,
	unstable_LowPriority,
	unstable_IdlePriority,
	unstable_UserBlockingPriority,
	unstable_ImmediatePriority,
	unstable_now
} from '../../src';
import { unstable_now as schedulerNow } from '../../scheduler';

const noop = () => null;
unstable_runWithPriority(unstable_IdlePriority, noop);
unstable_runWithPriority(unstable_LowPriority, noop);
unstable_runWithPriority(unstable_NormalPriority, noop);
unstable_runWithPriority(unstable_UserBlockingPriority, noop);
unstable_runWithPriority(unstable_ImmediatePriority, noop);

if (typeof unstable_now() === 'number') {
}

// The preact/compat/scheduler entry exports it as a function, like the runtime
export const now: number = schedulerNow();
