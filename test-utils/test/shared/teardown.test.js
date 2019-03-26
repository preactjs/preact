const { Component, render } = require('preact');
const { teardown, setupRerender, setupScratch } = require('../../src');

describe('teardown', () => {
	let rerender, scratch;
	beforeEach(() => {
		rerender = setupRerender();
		scratch = setupScratch();
	});

	it('should clear the children of scratch', () => {
		render('<div>inner</div>', scratch);
		teardown(scratch);
		setTimeout(() => {
			expect(scratch.firstChild).to.be.null;
			expect(scratch.innerHTML).to.equal('');
		}, 0);
	})

	it('should restore debounce', () => {
		teardown(scratch);
		expect(Component.__test__previousDebounce).to.be.undefined;
	});

	it('should flush the queue', () => {
		const spy = sinon.spy();
		Component.__test__drainQueue = spy;
		teardown(scratch);
		expect(spy).to.be.calledOnce;
	});
});
