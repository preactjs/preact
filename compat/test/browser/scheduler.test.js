import {
	unstable_runWithPriority,
	unstable_NormalPriority,
	unstable_LowPriority,
	unstable_IdlePriority,
	unstable_UserBlockingPriority,
	unstable_ImmediatePriority,
	unstable_now
} from 'preact/compat/scheduler';
import { vi } from 'vitest';

describe('scheduler', () => {
	describe('runWithPriority', () => {
		it('should call callback ', () => {
			const spy = vi.fn();
			unstable_runWithPriority(unstable_IdlePriority, spy);
			expect(spy).toHaveBeenCalledTimes(1);

			unstable_runWithPriority(unstable_LowPriority, spy);
			expect(spy).toHaveBeenCalledTimes(2);

			unstable_runWithPriority(unstable_NormalPriority, spy);
			expect(spy).toHaveBeenCalledTimes(3);

			unstable_runWithPriority(unstable_UserBlockingPriority, spy);
			expect(spy).toHaveBeenCalledTimes(4);

			unstable_runWithPriority(unstable_ImmediatePriority, spy);
			expect(spy).toHaveBeenCalledTimes(5);
		});
	});

	describe('unstable_now', () => {
		it('should return number', () => {
			const res = unstable_now();
			expect(res).is.a('number');
			expect(res > 0).to.equal(true);
		});
	});
});
