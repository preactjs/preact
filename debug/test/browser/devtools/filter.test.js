import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h, render } from 'preact';
import { updateComponentFilters } from '../../../src/devtools/filter';

/** @jsx h */

/**
 *
 * @param {import('../../../src/internal').VNode[]} roots
 */
function createMockHook(roots) {
	return {
		getFiberRoots: sinon.spy(() => roots)
	};
}

describe.only('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('updateComponentFilters', () => {
		it('should unmount currently active roots', () => {
			render(<div>foo</div>, scratch);
			const root = scratch._children;

			const mockHook = createMockHook([root]);
			updateComponentFilters(mockHook, {})([]);
			expect(root._children).to.deep.equal([]);
		});
	});
});
