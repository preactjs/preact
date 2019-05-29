import { h, render, Fragment } from '../../src/index';
import { getDomSibling } from '../../src/component';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

describe('getDomSibling', () => {

	chai.use((chai, util) => {
		const Assertion = chai.Assertion;

		Assertion.addMethod('equalElement', function (expectedNode) {
			const obj = this._obj;
			new Assertion(obj).to.be.instanceof(Node);
			new Assertion(obj).to.have.property('tagName', expectedNode.tagName);
			this.assert(
				obj === expectedNode,
				'expected #{this} to be #{exp} but got #{act}',
				'expected ${this} not to be #{exp}',
				expectedNode,
				obj
			);
		});
	});

	/** @type {import('../../src/internal').PreactElement} */
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

	it('should find direct text node sibling', () => {
		render((
			<div>
				<div>A</div>
				B
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find nested text node sibling', () => {
		render((
			<div>
				<Fragment>
					<div>A</div>
				</Fragment>
				<Fragment>
					B
				</Fragment>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find text node sibling with placeholder', () => {
		render((
			<div>
				A
				{null}
				B
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling with placeholder', () => {
		render((
			<div key="parent">
				<div key="A">A</div>
				{null}
				<div key="B">B</div>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0];
		expect(getDomSibling(vnode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling with nested placeholder', () => {
		render((
			<div key="0">
				<Fragment key="0.0">
					<div key="A">A</div>
				</Fragment>
				<Fragment key="0.1">
					{null}
				</Fragment>
				<Fragment key="0.2">
					<div key="B">B</div>
				</Fragment>
			</div>
		), scratch);
		let vnode = scratch._prevVNode._children[0]._children[0]._children[0];
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

	it('should find unrelated sibling from a DOM VNode', () => {
		render((
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
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0]._children[0]._children[0]._children[0];
		expect(divAVNode.type).to.equal('div');
		expect(getDomSibling(divAVNode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find unrelated sibling from a Fragment VNode', () => {
		render((
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
			</div>
		), scratch);

		let fragment = scratch._prevVNode._children[0]._children[0]._children[0]._children[0];
		expect(fragment.type).to.equal(Fragment);
		expect(getDomSibling(fragment)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find unrelated sibling from a Component VNode', () => {
		const Foo = props => props.children;
		render((
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
			</div>
		), scratch);

		let foo = scratch._prevVNode._children[0]._children[0]._children[0]._children[0];
		expect(foo.type).to.equal(Foo);
		expect(getDomSibling(foo)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling through components', () => {
		const Foo = props => props.children;
		render((
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
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0]._children[0];
		expect(divAVNode.type).to.equal('div');
		expect(getDomSibling(divAVNode)).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling rendered in Components that wrap JSX children', () => {
		const Foo = props => <p key="p">{props.children}</p>;
		render((
			<div key="0">
				<div key="A">A</div>
				<Foo key="Foo">
					<span key="span">a span</span>
				</Foo>
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0];
		expect(divAVNode.type).to.equal('div');

		let sibling = getDomSibling(divAVNode);
		expect(sibling.nodeName).to.equal('p');
		expect(sibling).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should find sibling rendered in Components without JSX children', () => {
		const Foo = props => <p key="p">A paragraph</p>;
		render((
			<div key="0">
				<div key="A">A</div>
				<Foo key="Foo" />
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0];
		expect(divAVNode.type).to.equal('div');

		let sibling = getDomSibling(divAVNode);
		expect(sibling.nodeName).to.equal('p');
		expect(sibling).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should climb through Components without JSX children', () => {
		const divAVNode = <div key="A">A</div>;
		const Foo = () => divAVNode;

		render((
			<div key="0">
				<Foo key="Foo" />
				<div key="B">B</div>
			</div>
		), scratch);

		let sibling = getDomSibling(divAVNode);
		expect(sibling.nodeName).to.equal('p');
		expect(sibling).to.equal(scratch.firstChild.childNodes[1]);
	});

	it('should return null if last sibling', () => {
		render((
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
			</div>
		), scratch);

		const divCVNode = scratch._prevVNode._children[0]._children[2]._children[0];
		expect(getDomSibling(divCVNode)).to.equal(null);
	});

	it('should return null if no sibling', () => {
		render((
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
						{null}
					</Fragment>
				</Fragment>
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0]._children[0]._children[0]._children[0];
		expect(getDomSibling(divAVNode)).to.equal(null);
	});

	it('should return null if no sibling with lots of empty trees', () => {
		render((
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
						{null}
					</Fragment>
				</Fragment>
			</div>
		), scratch);

		let divAVNode = scratch._prevVNode._children[0]._children[0]._children[0]._children[0]._children[0];
		expect(getDomSibling(divAVNode)).to.equal(null);
	});
});
