import { createElement, render, Fragment } from '../../src/';
import { getDomSibling } from '../../src/tree';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

/**
 * @typedef {import('../../src/internal').Internal} Internal
 * @typedef {import('../../src/internal').PreactElement} PreactElement
 */

describe('getDomSibling', () => {
	/** @type {PreactElement} */
	let scratch;

	/** @type {(dom: PreactElement) => Internal} */
	const getRoot = dom => dom._child;

	const Root = props => props.children;
	const createPortal = (vnode, parent) => (
		<Root _parentDom={parent}>{vnode}</Root>
	);

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		// @ts-ignore
		teardown(scratch);
	});

	it('should find direct sibling', () => {
		render(
			<div>
				<div>A</div>
				<div>B</div>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child;
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find direct text node sibling', () => {
		render(
			<div>
				<div>A</div>B
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child;
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find nested text node sibling', () => {
		render(
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<Fragment>B</Fragment>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child;
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find direct sibling through empty Components', () => {
		render(
			<div key="parent">
				<div key="A">A</div>
				<Fragment key="fragment-1" />
				<Fragment key="fragment-2" />
				<div key="B">B</div>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find text node sibling with placeholder', () => {
		render(<div>A{null}B</div>, scratch);
		let internal = getRoot(scratch)._child._child;
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find sibling with placeholder', () => {
		render(
			<div key="parent">
				<div key="A">A</div>
				{null}
				<div key="B">B</div>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find sibling with nested placeholder', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<div key="A">A</div>
				</Fragment>
				<Fragment key="0.1">{null}</Fragment>
				<Fragment key="0.2">
					<div key="B">B</div>
				</Fragment>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find sibling in parent', () => {
		render(
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<div>B</div>
			</div>,
			scratch
		);
		let internal = getRoot(scratch)._child._child._child;
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find unrelated sibling from a DOM VNode', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<Fragment key="0.0.0">
						<Fragment key="0.0.0.0">
							<div key="A">A</div>
						</Fragment>
					</Fragment>
				</Fragment>
				<Fragment key="0.1">
					<Fragment key="0.1.0" />
					<Fragment key="0.1.1" />
					<Fragment key="0.1.2" />
				</Fragment>
				<Fragment key="0.2">
					<Fragment key="0.2.0" />
					<Fragment key="0.2.1" />
					<Fragment key="0.2.2">
						<div key="B">B</div>
					</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child._child._child;
		expect(divAInternal.type).to.equal('div');
		expect(divAInternal.key).to.equal('A');
		expect(getDomSibling(divAInternal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find unrelated sibling from a Fragment VNode', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<Fragment key="0.0.0">
						<Fragment key="0.0.0.0">
							<div key="A">A</div>
						</Fragment>
					</Fragment>
				</Fragment>
				<Fragment key="0.1">
					<Fragment key="0.1.0">
						<div key="B">B</div>
					</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let fragment = getRoot(scratch)._child._child._child._child;
		expect(fragment.type).to.equal(Fragment);
		expect(fragment.key).to.equal('0.0.0.0');
		expect(getDomSibling(fragment)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find unrelated sibling from a Component VNode', () => {
		const Foo = props => props.children;
		render(
			<div key="0">
				<Fragment key="0.0">
					<Fragment key="0.0.0">
						<Foo key="0.0.0.0">
							<div key="A">A</div>
						</Foo>
					</Fragment>
				</Fragment>
				<Fragment key="0.1">
					<Fragment key="0.1.0">
						<div key="B">B</div>
					</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let foo = getRoot(scratch)._child._child._child._child;
		expect(foo.type).to.equal(Foo);
		expect(foo.key).to.equal('0.0.0.0');
		expect(getDomSibling(foo)).to.equalNode(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling through components', () => {
		const Foo = props => props.children;
		render(
			<div key="0">
				<Foo key="0.0">
					<div key="A">A</div>
				</Foo>
				<Foo key="0.1" />
				<Foo key="0.2">
					<Foo key="0.2.0">
						<div key="B">B</div>
					</Foo>
				</Foo>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child;
		expect(divAInternal.type).to.equal('div');
		expect(divAInternal.key).to.equal('A');
		expect(getDomSibling(divAInternal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should find sibling rendered in Components that wrap JSX children', () => {
		const Foo = props => <p key="p">{props.children}</p>;
		render(
			<div key="0">
				<div key="A">A</div>
				<Foo key="Foo">
					<span key="span">a span</span>
				</Foo>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child;
		expect(divAInternal.type).to.equal('div');
		expect(divAInternal.key).to.equal('A');

		let sibling = getDomSibling(divAInternal);
		expect(sibling).to.equalNode(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling rendered in Components without JSX children', () => {
		const Foo = () => <p key="p">A paragraph</p>;
		render(
			<div key="0">
				<div key="A">A</div>
				<Foo key="Foo" />
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child;
		expect(divAInternal.type).to.equal('div');
		expect(divAInternal.key).to.equal('A');

		let sibling = getDomSibling(divAInternal);
		expect(sibling).to.equalNode(scratch.firstChild.childNodes[1]);
	});

	it('should climb through Components without JSX children', () => {
		const Foo = () => <div key="A">A</div>;

		render(
			<div key="0">
				<Foo key="Foo" />
				<div key="B">B</div>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child;
		expect(divAInternal.key).to.equal('A');

		let sibling = getDomSibling(divAInternal);
		expect(sibling).to.equalNode(scratch.firstChild.childNodes[1]);
	});

	it('should return null if last sibling', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<div key="A">A</div>
				</Fragment>
				<Fragment key="0.1">
					<div key="B">B</div>
				</Fragment>
				<Fragment key="0.2">
					<div key="C">C</div>
				</Fragment>
			</div>,
			scratch
		);

		const divCInternal = getRoot(scratch)._child._child._next._next._child;
		expect(divCInternal.key).to.equal('C');
		expect(getDomSibling(divCInternal)).to.equal(null);
	});

	it('should return null if no sibling', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<Fragment key="0.0.0">
						<Fragment key="0.0.0.0">
							<div key="A">A</div>
						</Fragment>
					</Fragment>
				</Fragment>
				<Fragment key="0.1">
					<Fragment key="0.1.0">{null}</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child._child._child;
		expect(divAInternal.key).to.equal('A');
		expect(getDomSibling(divAInternal)).to.equal(null);
	});

	it('should return null if no sibling with lots of empty trees', () => {
		render(
			<div key="0">
				<Fragment key="0.0">
					<Fragment key="0.0.0">
						<Fragment key="0.0.0.0">
							<div key="A">A</div>
						</Fragment>
					</Fragment>
				</Fragment>
				<Fragment key="0.1">
					<Fragment key="0.1.0" />
					<Fragment key="0.1.1" />
					<Fragment key="0.1.2" />
				</Fragment>
				<Fragment key="0.2">
					<Fragment key="0.2.0" />
					<Fragment key="0.2.1" />
					<Fragment key="0.2.2">{null}</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child._child._child;
		expect(divAInternal.key).to.equal('A');
		expect(getDomSibling(divAInternal)).to.equal(null);
	});

	it('should return null if current parent has no siblings (even if parent has siblings at same level)', () => {
		render(
			<div key="0">
				<div key="0.0">
					<div key="0.0.0" />
					<div key="A">A</div>
					<Fragment key="0.1.2" />
				</div>
				<div key="0.1">
					<Fragment key="0.1.0" />
					<div key="B">B</div>
				</div>
			</div>,
			scratch
		);

		let divAInternal = getRoot(scratch)._child._child._child._next;
		expect(divAInternal.key).to.equal('A');
		expect(getDomSibling(divAInternal)).to.equal(null);
	});

	it("should return null if it's the only child", () => {
		render(<div key="A">A</div>, scratch);

		let internal = getRoot(scratch)._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.be.null;
	});

	it('should skip over portals with different parentDom', () => {
		const portalParent = document.createElement('div');

		render(
			<div>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, portalParent)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</div>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(
			scratch.firstChild.childNodes[1]
		);
	});

	it('should recurse into portals with same parentDom', () => {
		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, scratch)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(scratch.childNodes[1]);
	});

	it('should recurse into portals with a text child with same parentDom', () => {
		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal('B', scratch)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._child;
		expect(internal.key).to.equal('A');
		expect(getDomSibling(internal)).to.equalNode(scratch.childNodes[1]);
	});

	it('should skip over root nodes with a different parentDom than its parent', () => {
		const portalParent = document.createElement('div');

		render(
			<div>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, portalParent)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</div>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._next;
		expect(internal.type).to.equal(Root);
		expect(internal.props._parentDom).to.equal(portalParent);
		expect(getDomSibling(internal)).to.equalNode(scratch.firstChild.lastChild);
	});

	it('should return a sibling for root nodes with the same parentDom as its parent', () => {
		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, scratch)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._next;
		expect(internal.type).to.equal(Root);
		expect(internal.props._parentDom).to.equal(scratch);
		expect(getDomSibling(internal)).to.equalNode(scratch.lastChild);
	});

	it('should not recurse upwards through a Portal with a different parentDom than its parent', () => {
		const portalParent = document.createElement('div');

		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, portalParent)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._next._child;
		expect(internal.key).to.equal('B');
		expect(getDomSibling(internal)).to.equal(null);
	});

	it('should find siblings of children of Portals with different parentDoms than its parent', () => {
		const portalParent = document.createElement('div');

		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(
					[
						<div key="B">B</div>,
						<Fragment>
							<div key="B2">B2</div>
						</Fragment>
					],
					portalParent
				)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let internal = getRoot(scratch)._child._child._next._child;
		expect(internal.key).to.equal('B');
		expect(getDomSibling(internal)).to.equal(portalParent.lastChild);
	});

	it('should find siblings of Portals when the Portal has the same parentDom as its parent', () => {
		render(
			<Fragment>
				<Fragment>
					<div key="A">A</div>
				</Fragment>
				{createPortal(<div key="B">B</div>, scratch)}
				<Fragment>
					<div key="C">C</div>
				</Fragment>
			</Fragment>,
			scratch
		);

		let portalInternal = getRoot(scratch)._child._child._next;
		let internal = portalInternal._child;
		expect(portalInternal.type).to.equal(Root);
		expect(portalInternal.props._parentDom).to.equalNode(scratch);
		expect(internal.key).to.equal('B');
		expect(getDomSibling(internal)).to.equalNode(scratch.lastChild);
	});
});
