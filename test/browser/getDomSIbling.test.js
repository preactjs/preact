import { h, render, Fragment } from '../../src/index';
import { getDomSibling } from '../../src/component';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

describe('getDomSibling', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should find direct sibling', () => {
		render((
			<div>
				<div>A</div>
				<div>B</div>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling with placeholder', () => {
		render((
			<div>
				<div>A</div>
				{null}
				<div>B</div>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling in parent', () => {
		render((
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<div>B</div>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find unrelated sibling', () => {
		render((
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<Fragment>
					<div>B</div>
				</Fragment>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});
});
