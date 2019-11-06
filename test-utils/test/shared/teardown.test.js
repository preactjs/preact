import { options } from 'preact';
import { teardown } from 'preact/test-utils';

describe('teardown', () => {
	it('should restore debounce', () => {
		teardown();
		expect(options.__test__previousDebounce).to.be.undefined;
	});

	it('should flush the queue', () => {
		const spy = sinon.spy();
		options.__test__drainQueue = spy;
		teardown();
		expect(spy).to.be.calledOnce;
	});
});
