import {
	unstable_runWithPriority,
	unstable_NormalPriority,
	unstable_LowPriority,
	unstable_IdlePriority,
	unstable_UserBlockingPriority,
	unstable_ImmediatePriority,
	unstable_now
} from '../../src';

const noop = () => null;
unstable_runWithPriority(unstable_IdlePriority, noop);
unstable_runWithPriority(unstable_LowPriority, noop);
unstable_runWithPriority(unstable_NormalPriority, noop);
unstable_runWithPriority(unstable_UserBlockingPriority, noop);
unstable_runWithPriority(unstable_ImmediatePriority, noop);

if (typeof unstable_now() === 'number') {
}
