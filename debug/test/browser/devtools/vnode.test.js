import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h, render } from 'preact';
import { getInstance } from '../../../src/devtools/vnode';
import { clearState } from '../../../src/devtools/cache';
import { clearStringTable } from '../../../src/devtools/string-table';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
		clearState();
		clearStringTable();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('getInstance', () => {
		it('should work with roots', () => {
			render(<div>foo</div>, scratch);
			let inst = getInstance(scratch._children);
			render(<div>bar</div>, scratch);
			let inst2 = getInstance(scratch._children);

			expect(inst).to.not.equal(undefined);
			expect(inst).to.not.equal(null);
			expect(inst).to.equal(inst2);
		});

		it('should work with empty roots', () => {
			const Foo = () => null;
			const Bar = () => null;

			render(<Foo />, scratch);
			let inst = getInstance(scratch._children);
			render(<Bar />, scratch);
			let inst2 = getInstance(scratch._children);

			expect(inst).to.not.equal(undefined);
			expect(inst).to.not.equal(null);
			expect(inst).to.equal(inst2);
		});
	});
});
