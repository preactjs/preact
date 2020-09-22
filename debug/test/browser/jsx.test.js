import { jsx } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('Babel jsx/jsxDEV', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should support source and self', () => {
		const self = 'foo';
		const source = {
			fileName: '/foo.js',
			lineNumber: 2
		};
		const vnode = jsx('div', null, 'foo', false, source, self);
		expect(vnode.__source).to.equal(source);
		expect(vnode.__self).to.equal(self);
	});
});
