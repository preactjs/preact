import { unstable_batchedUpdates } from 'preact/compat';

describe('unstable_batchedUpdates', () => {
	it('should execute & return cb', () => {
		expect(unstable_batchedUpdates(() => false)).to.equal(false);
		expect(unstable_batchedUpdates(arg => arg, true)).to.equal(true);
	});
});
