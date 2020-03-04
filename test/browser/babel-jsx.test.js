import { jsx } from 'preact';
import { setupScratch, teardown } from '../_util/helpers';

describe('Babel jsx/jsxDEV', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should keep ref in props', () => {
		const ref = () => null;
		const vnode = jsx('div', { ref });
		expect(vnode.props.ref).to.equal(ref);
		expect(vnode.ref).to.equal(ref);
	});

	it('should add keys', () => {
		const vnode = jsx('div', null, 'foo');
		expect(vnode.key).to.equal('foo');
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
