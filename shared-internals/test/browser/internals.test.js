import {
	createElement,
	render,
	Component,
	createRef,
	options,
	Fragment
} from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import {
	getParent,
	getComponent,
	getDom,
	getChildren,
	getComponentVNode,
	getContainerVNode,
	getOptionsDiff,
	getOptionsCommit,
	getOptionsRoot,
	setOptionsDiff,
	setOptionsCommit,
	setOptionsRoot
} from '../../src';

/** @jsx createElement */

describe('shared-internals', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('getParent', () => {
		it('should get the parent of a vnode', () => {
			const child = <span />;
			const vnode = <div>{child}</div>;
			render(vnode, scratch);

			expect(getParent(child)).to.equal(vnode);
		});

		it('should be null when there is no parent', () => {
			const vnode = <div />;
			render(vnode, scratch);

			const root = getParent(vnode);
			expect(getParent(root)).to.equal(null);
		});
	});

	describe('getComponent', () => {
		it('should return null for non-component vnodes', () => {
			const vnode = <div />;
			render(vnode, scratch);
			expect(getComponent(vnode)).to.equal(null);
		});

		it('should return component instance', () => {
			const Foo = () => <div />;
			const vnode = <Foo />;
			render(vnode, scratch);
			expect(getComponent(vnode) instanceof Component).to.equal(true);
		});
	});

	describe('getDom', () => {
		it('should be null when not set', () => {
			const vnode = <div />;
			expect(getDom(vnode)).to.equal(null);
		});

		it('should return the dom node', () => {
			const vnode = <div />;
			render(vnode, scratch);
			expect(getDom(vnode)).to.equal(scratch.firstChild);
		});
	});

	describe('getChildren', () => {
		it('should be null initially', () => {
			expect(getChildren(<div />)).to.equal(null);
		});

		it('should get children array', () => {
			const Foo = props => props.children;
			const vnode = (
				<Foo>
					foo
					<span />
				</Foo>
			);
			render(vnode, scratch);

			const res = getChildren(vnode);
			expect(Array.isArray(res)).to.equal(true);
			expect(res.length).to.equal(2);

			// Should convert string to text ndoe
			expect(typeof res[0]).to.equal('object');
		});
	});

	describe('getComponentVNode', () => {
		it('should get the vnode of a component', () => {
			const Foo = () => <div />;
			let ref = createRef();
			const vnode = <Foo ref={ref} />;
			render(vnode, scratch);

			expect(getComponentVNode(ref.current)).to.equal(vnode);
		});
	});

	describe('getContainerVNode', () => {
		it('should return undefined', () => {
			expect(getContainerVNode(scratch)).to.equal(undefined);
		});

		it('should return root Fragment vnode', () => {
			render(<div />, scratch);
			expect(getContainerVNode(scratch).type).to.equal(Fragment);
		});
	});

	describe('options', () => {
		let prevDiff;
		let prevCommit;
		let prevRoot;

		beforeEach(() => {
			prevDiff = options._diff;
			prevCommit = options._commit;
			prevRoot = options._root;
		});

		afterEach(() => {
			options._diff = prevDiff;
			options._commit = prevCommit;
			options._root = prevRoot;
		});

		describe('getOptionsDiff', () => {
			it('should be undefined if not set', () => {
				expect(getOptionsDiff(options)).to.be.undefined;
			});

			it('should get option._diff', () => {
				const spy = sinon.spy();
				options._diff = spy;
				expect(getOptionsDiff(options)).to.equal(spy);
			});
		});

		describe('getOptionsCommit', () => {
			it('should be undefined if not set', () => {
				expect(getOptionsCommit(options)).to.be.undefined;
			});

			it('should get option._commit', () => {
				const spy = sinon.spy();
				options._commit = spy;
				expect(getOptionsCommit(options)).to.equal(spy);
			});
		});

		describe('getOptionsRoot', () => {
			it('should be undefined if not set', () => {
				expect(getOptionsRoot(options)).to.be.undefined;
			});

			it('should get option._commit', () => {
				const spy = sinon.spy();
				options._root = spy;
				expect(getOptionsRoot(options)).to.equal(spy);
			});
		});

		describe('setOptionsDiff', () => {
			it('should set options._diff', () => {
				const spy = sinon.spy();
				setOptionsDiff(options, spy);
				expect(options._diff).to.equal(spy);
			});
		});

		describe('setOptionsCommit', () => {
			it('should set options._commit', () => {
				const spy = sinon.spy();
				setOptionsCommit(options, spy);
				expect(options._commit).to.equal(spy);
			});
		});

		describe('setOptionsRoot', () => {
			it('should set options._root', () => {
				const spy = sinon.spy();
				setOptionsRoot(options, spy);
				expect(options._root).to.equal(spy);
			});
		});
	});
});
