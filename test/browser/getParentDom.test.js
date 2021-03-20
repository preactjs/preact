import { createElement, render, Fragment } from '../../src/';
import { getParentDom } from '../../src/tree';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx createElement */

describe('getParentDom', () => {
	/** @type {import('../../src/internal').PreactElement} */
	let scratch;

	const getRoot = dom => dom._children;

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

	it('should find direct parent of DOM children', () => {
		render(
			<div>
				<div>A</div>
				<div>B</div>
				<div>C</div>
			</div>,
			scratch
		);

		let domInternals = getRoot(scratch)._children[0]._children;
		for (let internal of domInternals) {
			expect(internal.type).to.equal('div');
			expect(getParentDom(internal)).to.equalNode(scratch.firstChild);
		}
	});

	it('should find direct parent of text node', () => {
		render(
			<div>
				<div>A</div>B<div>C</div>
			</div>,
			scratch
		);

		let domInternals = getRoot(scratch)._children[0]._children;
		let expectedTypes = ['div', null, 'div'];
		for (let i = 0; i < domInternals.length; i++) {
			expect(domInternals[i].type).to.equal(expectedTypes[i]);
			expect(getParentDom(domInternals[i])).to.equalNode(scratch.firstChild);
		}
	});

	it('should find parent through Fragments', () => {
		render(
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<Fragment>B</Fragment>
			</div>,
			scratch
		);

		let domInternals = [
			getRoot(scratch)._children[0]._children[0]._children[0],
			getRoot(scratch)._children[0]._children[1]._children[0]
		];

		let expectedTypes = ['div', null];
		for (let i = 0; i < domInternals.length; i++) {
			expect(domInternals[i].type).to.equal(expectedTypes[i]);
			expect(getParentDom(domInternals[i])).to.equalNode(scratch.firstChild);
		}
	});

	it('should find parent through nested Fragments/Components', () => {
		const Foo = props => props.children;
		render(
			<div>
				<Fragment>
					<Foo>
						<div>A</div>
					</Foo>
				</Fragment>
				<Fragment>
					<Foo>B</Foo>
				</Fragment>
			</div>,
			scratch
		);

		let domInternals = [
			getRoot(scratch)._children[0]._children[0]._children[0]._children[0],
			getRoot(scratch)._children[0]._children[1]._children[0]._children[0]
		];

		let expectedTypes = ['div', null];
		for (let i = 0; i < domInternals.length; i++) {
			expect(domInternals[i].type).to.equal(expectedTypes[i]);
			expect(getParentDom(domInternals[i])).to.equalNode(scratch.firstChild);
		}
	});

	it('should find parent of nested Fragments & Components', () => {
		const Foo = props => props.children;
		render(
			<div>
				<Fragment>
					<Foo>
						<div>A</div>
					</Foo>
				</Fragment>
				<Fragment>
					<Fragment>
						<Fragment>B</Fragment>
					</Fragment>
				</Fragment>
			</div>,
			scratch
		);

		let domInternals = [
			getRoot(scratch)._children[0]._children[0]._children[0],
			getRoot(scratch)._children[0]._children[1]._children[0]
		];

		let expectedTypes = [Foo, Fragment];
		for (let i = 0; i < domInternals.length; i++) {
			expect(domInternals[i].type).to.equal(expectedTypes[i]);
			expect(getParentDom(domInternals[i])).to.equalNode(scratch.firstChild);
		}
	});

	it('should find correct parent if rendered in Components that wrap JSX children', () => {
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

		let internal = getRoot(scratch)._children[0]._children[1]._children[0]
			._children[0];
		let parentDom = getParentDom(internal);

		expect(internal.type).to.equal('span');
		expect(scratch.firstChild.childNodes[1].nodeName).to.equal('P');
		expect(parentDom).to.equalNode(scratch.firstChild.childNodes[1]);
	});

	it('should find parent through Components without JSX children', () => {
		const Foo = () => (
			<Fragment>
				<Fragment>
					<p>A</p>
				</Fragment>
			</Fragment>
		);

		render(
			<div key="0">
				<Foo key="Foo" />
			</div>,
			scratch
		);

		let internal = getRoot(scratch)._children[0]._children[0]._children[0]
			._children[0];
		let parent = getParentDom(internal);

		expect(internal.type).to.equal('p');
		expect(parent).to.equalNode(scratch.firstChild);
	});

	it('should return container DOM if first child is a component', () => {
		const Foo = props => props.children;
		render(
			<Foo>
				<div>A</div>
			</Foo>,
			scratch
		);

		const internal = getRoot(scratch)._children[0];
		expect(internal.type).to.equal(Foo);
		expect(getParentDom(internal)).to.equal(scratch);
	});

	it('should return parentDom of root node', () => {
		const portalParent = document.createElement('div');

		const Foo = props => props.children;
		render(
			<div>
				{createPortal(
					<Foo>
						<div>A</div>
					</Foo>,
					portalParent
				)}
			</div>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<div></div>');

		let internal = getRoot(scratch)._children[0]._children[0];
		expect(internal.type).to.equal(Root);
		expect(getParentDom(internal)).to.equalNode(portalParent);
	});

	it('should return parentDom of root node if ancestors contain a root node', () => {
		const portalParent = document.createElement('div');

		const Foo = props => props.children;
		render(
			<div>
				{createPortal(
					<Foo>
						<div>A</div>
					</Foo>,
					portalParent
				)}
			</div>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<div></div>');

		let fooInternal = getRoot(scratch)._children[0]._children[0]._children[0];
		expect(fooInternal.type).to.equal(Foo);
		expect(getParentDom(fooInternal)).to.equalNode(portalParent);

		let divInternal = fooInternal._children[0];
		expect(divInternal.type).to.equal('div');
		expect(getParentDom(divInternal)).to.equalNode(portalParent);
	});

	it('should return parentDom of root node returned from a Component', () => {
		const portalParent = document.createElement('div');
		const Foo = () => createPortal(<div>A</div>, portalParent);

		render(
			<div>
				<Foo />
			</div>,
			scratch
		);

		expect(scratch.innerHTML).to.equal('<div></div>');

		let internal = getRoot(scratch)._children[0]._children[0]._children[0]
			._children[0];
		expect(internal.type).to.equal('div');
		expect(getParentDom(internal)).to.equalNode(portalParent);
	});
});
