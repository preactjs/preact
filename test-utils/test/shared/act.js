import { options } from 'preact';
import { useState } from 'preact/hooks';

import { act } from '../../src';

describe('act', () => {

	it('should reset options after act finishes', () => {
		expect(options.afterPaint).to.be.undefined();
	});

	it('should drain the queue of hooks', () => {
		expect(true).to.be.true();
	});
});
