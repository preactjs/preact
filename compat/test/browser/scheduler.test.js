import {
	unstable_runWithPriority,
	unstable_NormalPriority,
	unstable_LowPriority,
	unstable_IdlePriority,
	unstable_UserBlockingPriority,
	unstable_ImmediatePriority,
	unstable_now
} from 'preact/compat/scheduler';

describe('scheduler', () => {
	describe('runWithPriority', () => {
		it('should call callback ', () => {
			const spy = sinon.spy();
			unstable_runWithPriority(unstable_IdlePriority, spy);
			expect(spy.callCount).to.equal(1);

			unstable_runWithPriority(unstable_LowPriority, spy);
			expect(spy.callCount).to.equal(2);

			unstable_runWithPriority(unstable_NormalPriority, spy);
			expect(spy.callCount).to.equal(3);

			unstable_runWithPriority(unstable_UserBlockingPriority, spy);
			expect(spy.callCount).to.equal(4);

			unstable_runWithPriority(unstable_ImmediatePriority, spy);
			expect(spy.callCount).to.equal(5);
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
