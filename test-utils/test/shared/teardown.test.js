const { Component, render } = require('preact');
const { teardown, setupRerender } = require('../../src');
const { setupScratch } = require('../../../test/_util/helpers');

describe('teardown', () => {
	let rerender, scratch;
	beforeEach(() => {
		rerender = setupRerender();
		scratch = setupScratch();
	});

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
