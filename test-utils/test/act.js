import { options } from 'preact';

import { act } from '../src';

/** @jsx h */


describe('useRef', () => {

	it('should reset options after act finishes', () => {
		expect(options.afterPaint).to.be.undefined();
	});

});
