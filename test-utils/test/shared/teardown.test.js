const { options } = require('preact');
const { teardown } = require('../../src');

describe('teardown', () => {
	it('should restore debounce', () => {
		teardown();
		expect(options.__test__previousDebounce).toBeUndefined();
	});

	it('should flush the queue', () => {
		const spy = jasmine.createSpy();
		options.__test__drainQueue = spy;
		teardown();
		expect(spy).toHaveBeenCalledTimes(1);
	});
});
