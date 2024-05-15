import { createElement, render, toChildArray } from 'preact';
import {
	setupScratch,
	teardown,
	getMixedArray,
	mixedArrayHTML
} from '../_util/helpers';

/** @jsx createElement */

describe('toChildArray', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	let children;

	let Foo = props => {
		children = toChildArray(props.children);
		return <div>{children}</div>;
	};

	let Bar = () => <span>Bar</span>;

	beforeEach(() => {
		scratch = setupScratch();
		children = undefined;
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('returns an empty array with no child', () => {
		render(<Foo />, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(0);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('returns an empty array with null as a child', () => {
		render(<Foo>{null}</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(0);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('returns an empty array with false as a child', () => {
		render(<Foo>{false}</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(0);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('returns an empty array with true as a child', () => {
		render(<Foo>{true}</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(0);
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('should skip a function child', () => {
		const child = num => num.toFixed(2);
		render(<Foo>{child}</Foo>, scratch);
		expect(children).to.be.an('array');
		expect(scratch.innerHTML).to.equal('<div></div>');
	});

	it('returns an array containing a VNode with a text child', () => {
		render(<Foo>text</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(1);
		expect(children[0]).to.equal('text');
		expect(scratch.innerHTML).to.equal('<div>text</div>');
	});

	it('returns an array containing a VNode with a number child', () => {
		render(<Foo>{1}</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(1);
		expect(children[0]).to.equal(1);
		expect(scratch.innerHTML).to.equal('<div>1</div>');
	});

	it('returns an array containing a VNode with a DOM node child', () => {
		render(
			<Foo>
				<span />
			</Foo>,
			scratch
		);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(1);
		expect(children[0].type).to.equal('span');
		expect(scratch.innerHTML).to.equal('<div><span></span></div>');
	});

	it('returns an array containing a VNode with a Component child', () => {
		render(
			<Foo>
				<Bar />
			</Foo>,
			scratch
		);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(1);
		expect(children[0].type).to.equal(Bar);
		expect(scratch.innerHTML).to.equal('<div><span>Bar</span></div>');
	});

	it('returns an array with multiple children', () => {
		render(
			<Foo>
				0<span />
				<input />
				<div />1
			</Foo>,
			scratch
		);

		expect(children).to.be.an('array');
		expect(children[0]).to.equal('0');
		expect(children[1].type).to.equal('span');
		expect(children[2].type).to.equal('input');
		expect(children[3].type).to.equal('div');
		expect(children[4]).to.equal('1');
		expect(scratch.innerHTML).to.equal(
			`<div>0<span></span><input><div></div>1</div>`
		);
	});

	it('returns an array with non-renderables removed with a mixed array as children', () => {
		const mixedArray = getMixedArray();
		render(<Foo>{mixedArray}</Foo>, scratch);

		expect(children).to.be.an('array');
		expect(children).to.have.lengthOf(8); // Length of flattened mixedArray with non-renderables removed
		expect(scratch.innerHTML).to.equal(`<div>${mixedArrayHTML}</div>`);

		function filterAndReduceChildren(acc, child) {
			if (Array.isArray(child)) {
				return child.reduce(filterAndReduceChildren, acc);
			}

			if (
				child != null &&
				typeof child != 'boolean' &&
				typeof child != 'function'
			) {
				acc.push(child);
			}

			return acc;
		}

		let renderableArray = filterAndReduceChildren([], mixedArray);

		expect(children).to.have.lengthOf(renderableArray.length);

		for (let i = 0; i < renderableArray.length; i++) {
			let originalChild = renderableArray[i];
			let actualChild = children[i];

			if (
				typeof originalChild == 'string' ||
				typeof originalChild == 'number'
			) {
				expect(actualChild).to.equal(originalChild);
			} else {
				expect(actualChild.type).to.equal(originalChild.type);
			}
		}
	});

	it('flattens sibling and nested arrays', () => {
		const list1 = [0, 1];
		const list2 = [2, 3];
		const list3 = [4, 5];
		const list4 = [6, 7];
		const list5 = [8, 9];

		const flatList = [...list1, ...list2, ...list3, ...list4, ...list5];

		render(
			<Foo>
				{[list1, list2]}
				{[list3, list4]}
				{list5}
			</Foo>,
			scratch
		);

		expect(children).to.be.an('array');
		expect(scratch.innerHTML).to.equal('<div>0123456789</div>');

		for (let i = 0; i < flatList.length; i++) {
			expect(children[i]).to.equal(flatList[i]);
		}
	});
});
