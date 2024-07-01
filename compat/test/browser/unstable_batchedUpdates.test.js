import { unstable_batchedUpdates, flushSync } from 'preact/compat';

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

describe('flushSync', () => {
	it('should invoke the given callback', () => {
		const returnValue = {};
		const spy = sinon.spy(() => returnValue);
		const result = flushSync(spy);
		expect(spy).to.have.been.calledOnce;
		expect(result).to.equal(returnValue);
	});

	it('should invoke the given callback with the given argument', () => {
		const returnValue = {};
		const spy = sinon.spy(() => returnValue);
		const result = flushSync(spy, 'foo');
		expect(spy).to.be.calledWithExactly('foo');
		expect(result).to.equal(returnValue);
	});
});
