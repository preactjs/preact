import { jsx } from '../../jsx-runtime';
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
});
