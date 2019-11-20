import { unstable_batchedUpdates } from 'preact/compat';

describe('unstable_batchedUpdates', () => {
	it('should call the callback', () => {
		const spy = sinon.spy();
		unstable_batchedUpdates(spy);
		expect(spy).to.be.calledOnce;
	});

	it('should call callback with only one arg', () => {
		const spy = sinon.spy();
		unstable_batchedUpdates(spy, 'foo', 'bar');
		expect(spy).to.be.calledWithExactly('foo');
	});
});
