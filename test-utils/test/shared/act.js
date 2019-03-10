import { options } from 'preact';

import { act } from '../../src';

describe('act', () => {

	it('should reset options after act finishes', () => {
		expect(options.afterPaint).to.equal(undefined);
		act(() => {
			console.log('testing');
		});
		expect(options.afterPaint).to.equal(undefined);
	});

});
