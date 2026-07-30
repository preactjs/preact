import { createElement, render } from 'preact';
import { useState } from 'preact/hooks';
import { unstable_batchedUpdates, flushSync } from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('unstable_batchedUpdates', () => {
	it('should call the callback', () => {
		const spy = sinon.spy();
		unstable_batchedUpdates(spy);
		expect(spy).to.be.calledOnce;
	});

	it('should call callback with only one arg', () => {
		const spy = sinon.spy();
		// @ts-expect-error
		unstable_batchedUpdates(spy, 'foo', 'bar');
		expect(spy).to.be.calledWithExactly('foo');
	});
});

describe('flushSync', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

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

	it('should batch updates and flush them synchronously', () => {
		let setA;
		let setB;
		const renders = sinon.spy();

		function App() {
			const [a, updateA] = useState(0);
			const [b, updateB] = useState(0);
			setA = updateA;
			setB = updateB;
			renders();
			return createElement('p', null, a + b);
		}

		render(createElement(App), scratch);
		flushSync(() => {
			setA(1);
			setB(1);
		});

		expect(scratch.textContent).to.equal('2');
		expect(renders).to.have.been.calledTwice;
	});
});
