import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h, render, Component } from 'preact';
import { memo, forwardRef } from 'preact/compat';
import { getInstance, isRoot, getDevtoolsType } from '../../../src/devtools/vnode';
import { ElementTypeFunction, ElementTypeClass, ElementTypeHostComponent, ElementTypeMemo, ElementTypeForwardRef } from '../../../src/devtools/constants';

/** @jsx h */

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
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

	describe('isRoot', () => {
		it('should check if a vnode is a root', () => {
			render(<div>Hello World</div>, scratch);
			let root = scratch._children;

			expect(isRoot(root)).to.equal(true);
			expect(isRoot(root._children[0])).to.equal(false);
		});
	});

	describe('getDevtoolsType', () => {
		it('should detect Function-Components', () => {
			function Foo() {
				return <div />;
			}
			expect(getDevtoolsType(<Foo />)).to.equal(ElementTypeFunction);
		});

		it('should detect Class-Components', () => {
			class Foo extends Component {
				render() {
					return <div />;
				}
			}
			expect(getDevtoolsType(<Foo />)).to.equal(ElementTypeClass);
		});

		it('should detect HTML-Nodes', () => {
			expect(getDevtoolsType(<div />)).to.equal(ElementTypeHostComponent);
		});

		it('should detect memo-Components', () => {
			function Foo() {
				return <div />;
			}
			let Bar = memo(Foo);
			expect(getDevtoolsType(<Bar />)).to.equal(ElementTypeMemo);
		});

		it('should detect forwardRef-Component', () => {
			function Foo() {
				return <div />;
			}
			let Bar = forwardRef(Foo);
			expect(getDevtoolsType(<Bar />)).to.equal(ElementTypeForwardRef);
		});
	});
});
