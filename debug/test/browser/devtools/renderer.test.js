import { createElement, render, options, Fragment, Component } from 'preact';
import { memo, forwardRef, Suspense } from 'preact/compat';
import * as sinon from 'sinon';
import {
	createRenderer,
	getFilteredChildren
} from '../../../src/devtools/10/renderer';
import { setupOptions } from '../../../src/devtools/10/options';
import { expect } from 'chai';
import { toSnapshot } from '../../../src/devtools/10/debug';
import { useState } from 'preact/hooks';
import { act, setupRerender } from 'preact/test-utils';
import { getDisplayName } from '../../../src/devtools/10/vnode';
import { setupScratch, teardown } from '../../../../test/_util/helpers';
import {
	HTML_ELEMENT,
	FUNCTION_COMPONENT,
	CLASS_COMPONENT,
	MEMO,
	FORWARD_REF,
	SUSPENSE
} from '../../../src/devtools/10/constants';

/** @jsx createElement */

/**
 * @param {import('../../../src/internal').Options} options
 */
export function setupMockHook(options) {
	const spy = sinon.spy();

	/** @type {import('../../../src/devtools/10/types').PreactDevtoolsHook} */
	const fakeHook = {
		connected: true,
		attach: () => 1,
		detach: () => null,
		emit: spy,
		renderers: new Map()
	};
	const renderer = createRenderer(fakeHook, { type: new Set(), regex: [] });
	const destroy = setupOptions(options, renderer);
	return {
		renderer,
		destroy,
		spy
	};
}

describe('Renderer 10', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let destroy;

	/** @type {sinon.SinonSpy} */
	let spy;

	/** @type {import('../../../src/devtools/10/types').Renderer} */
	let renderer;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		const mock = setupMockHook(options);
		destroy = mock.destroy;
		spy = mock.spy;
		renderer = mock.renderer;
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
		if (destroy) destroy();
	});

	it('should detect root nodes', () => {
		render(<div />, scratch);
		expect(toSnapshot(spy.args[0][1])).to.deep.equal([
			'rootId: 1',
			'Add 1 <Fragment> to parent 1',
			'Add 2 <div> to parent 1'
		]);

		render(<div />, scratch);
		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Update timings 1',
			'Update timings 2'
		]);
	});

	it('should mount children', () => {
		render(
			<div>
				<span>foo</span>
				<span>bar</span>
			</div>,
			scratch
		);
		expect(toSnapshot(spy.args[0][1])).to.deep.equal([
			'rootId: 1',
			'Add 1 <Fragment> to parent 1',
			'Add 2 <div> to parent 1',
			'Add 3 <span> to parent 2',
			'Add 4 <span> to parent 2'
		]);
	});

	it('should unmount nodes', () => {
		render(
			<div>
				<span>foo</span>
				<span>bar</span>
			</div>,
			scratch
		);
		render(<div />, scratch);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Update timings 2',
			'Remove 4',
			'Remove 3'
		]);
	});

	it('should mount after update', () => {
		render(<div>foo</div>, scratch);
		render(
			<div>
				<span />
			</div>,
			scratch
		);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Add 3 <span> to parent 2',
			'Update timings 1',
			'Update timings 2'
		]);
	});

	it('should mount after filtered update', () => {
		renderer.applyFilters({
			regex: [],
			type: new Set(['dom'])
		});

		const Foo = props => <div>{props.children}</div>;
		const Bar = props => <span>{props.children}</span>;

		render(
			<div>
				<Foo />
			</div>,
			scratch
		);
		render(
			<div>
				<Foo>
					<Bar>bar</Bar>
				</Foo>
			</div>,
			scratch
		);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Add 3 <Bar> to parent 2',
			'Update timings 1',
			'Update timings 2'
		]);
	});

	it('should skip text', () => {
		render(<div>foo</div>, scratch);
		render(<div>bar</div>, scratch);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Update timings 1',
			'Update timings 2'
		]);
	});

	it('should reorder children', () => {
		render(
			<div>
				<p key="A">A</p>
				<p key="B">B</p>
			</div>,
			scratch
		);
		render(
			<div>
				<p key="B">B</p>
				<p key="A">A</p>
			</div>,
			scratch
		);

		expect(toSnapshot(spy.args[1][1])).to.deep.equal([
			'rootId: 1',
			'Update timings 1',
			'Update timings 2',
			'Update timings 4',
			'Update timings 3',
			'Reorder 2 [4, 3]'
		]);
	});

	describe('inspect', () => {
		it('should serialize vnodes', () => {
			render(
				<div>
					<span>
						<p>foo</p>
					</span>
				</div>,
				scratch
			);

			expect(renderer.inspect(2)).to.deep.equal({
				context: null,
				canEditHooks: false,
				hooks: null,
				id: 2,
				type: HTML_ELEMENT,
				name: 'div',
				canEditProps: true,
				props: {
					children: {
						name: 'span',
						type: 'vnode'
					}
				},
				canEditState: true,
				state: null
			});
		});

		it('should inspect state', () => {
			class Foo extends Component {
				constructor(props) {
					super(props);
					this.state = { foo: 123 };
				}

				render() {
					return <div />;
				}
			}

			render(<Foo />, scratch);

			expect(renderer.inspect(2)).to.deep.equal({
				context: null,
				canEditHooks: false,
				hooks: null,
				id: 2,
				type: CLASS_COMPONENT,
				name: 'Foo',
				canEditProps: true,
				props: null,
				canEditState: true,
				state: {
					foo: 123
				}
			});
		});

		it('should not throw if vnode is not found', () => {
			expect(() => renderer.inspect(2)).to.not.throw();
		});

		it('should detect html elements', () => {
			render(<div />, scratch);
			expect(renderer.inspect(2).type).to.equal(HTML_ELEMENT);
		});

		it('should detect function components', () => {
			const Foo = () => <div />;
			render(<Foo />, scratch);
			expect(renderer.inspect(2).type).to.equal(FUNCTION_COMPONENT);
		});

		it('should detect class components', () => {
			class Foo extends Component {
				render() {
					return <div />;
				}
			}

			render(<Foo />, scratch);
			expect(renderer.inspect(2).type).to.equal(CLASS_COMPONENT);
		});

		it("should detect memo'ed components", () => {
			// eslint-disable-next-line react/display-name
			const Foo = memo(() => <div />);
			render(<Foo />, scratch);
			expect(renderer.inspect(2).type).to.equal(MEMO);
		});

		it('should detect forwardRef components', () => {
			// eslint-disable-next-line react/display-name
			const Foo = forwardRef(() => <div />);
			render(<Foo />, scratch);
			expect(renderer.inspect(2).type).to.equal(FORWARD_REF);
		});

		it('should detect Suspense components', () => {
			render(<Suspense fallback={null} />, scratch);
			expect(renderer.inspect(2).type).to.equal(SUSPENSE);
		});
	});

	describe('getVNodeById', () => {
		it('should get the vnode', () => {
			const vnode = <div />;
			render(vnode, scratch);
			expect(renderer.getVNodeById(2)).to.equal(vnode);
		});
	});

	describe('has', () => {
		it('should check if an id exists in the cache', () => {
			expect(renderer.has(2)).to.equal(false);

			const vnode = <div />;
			render(vnode, scratch);
			expect(renderer.has(2)).to.equal(true);
		});
	});

	describe('forceUpdate', () => {
		it('should not throw if vnode not found', () => {
			expect(() => renderer.forceUpdate(42)).to.not.throw();
		});

		it('should not throw if vnode is not a component', () => {
			render(<div />, scratch);
			expect(() => {
				renderer.forceUpdate(2);
				rerender();
			}).to.not.throw();
		});

		it('should update a component', () => {
			const spy = sinon.spy();
			class Foo extends Component {
				render() {
					spy();
					return <div />;
				}
			}

			render(<Foo />, scratch);
			renderer.forceUpdate(2);
			rerender();

			expect(spy.callCount).to.equal(2);
		});
	});

	describe('findDomForVNode', () => {
		it('should return null if vnode not found', () => {
			expect(renderer.findDomForVNode(2)).to.equal(null);
		});

		it('should return dom', () => {
			render(<div />, scratch);
			expect(renderer.findDomForVNode(2)).to.deep.equal([
				scratch.firstChild,
				null
			]);
		});
	});

	describe('findVNodeIdForDom', () => {
		it('should return -1 if vnode not found', () => {
			expect(
				renderer.findVNodeIdForDom(document.createElement('div'))
			).to.equal(-1);
		});

		it('should find filtered nodes', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});
			render(<div />, scratch);
			expect(renderer.findVNodeIdForDom(scratch.firstChild)).to.equal(1);
		});

		it('should find non-filtered nodes', () => {
			const Foo = () => <div />;
			render(<Foo />, scratch);
			expect(renderer.findVNodeIdForDom(scratch.firstChild)).to.equal(3);
		});
	});

	describe('update', () => {
		it('should not throw when vnode is not found', () => {
			expect(() => renderer.update(12, 'props', [], null)).to.not.throw();
		});

		it('should no-op non-components', () => {
			render(<div />, scratch);
			expect(() => renderer.update(2, 'props', [], null)).to.not.throw();
		});

		it('should update props', () => {
			const spy = sinon.spy();
			const Foo = props => {
				spy(props);
				return <div />;
			};

			render(<Foo />, scratch);
			renderer.update(2, 'props', ['foo'], 123);
			rerender();

			expect(spy.args[1][0]).to.deep.equal({ foo: 123 });
		});

		it('should deeply update props', () => {
			const spy = sinon.spy();
			const Foo = props => {
				spy(props);
				return <div />;
			};

			render(<Foo foo={{ bar: { bob: 123 } }} />, scratch);
			renderer.update(2, 'props', ['foo', 'bar', 'bob'], 123);
			rerender();

			expect(spy.args[1][0]).to.deep.equal({ foo: { bar: { bob: 123 } } });
		});

		it('should update state', () => {
			const spy = sinon.spy();
			class Foo extends Component {
				render() {
					spy(this.state);
					return <div />;
				}
			}

			render(<Foo />, scratch);
			renderer.update(2, 'state', ['foo'], 123);
			rerender();

			expect(spy.args[1][0]).to.deep.equal({ foo: 123 });
		});

		it('should update context', () => {
			const spy = sinon.spy();
			class Foo extends Component {
				render() {
					spy(this.context);
					return <div />;
				}
			}

			render(<Foo />, scratch);
			renderer.update(2, 'context', ['foo'], 123);
			rerender();

			expect(spy.args[1][0]).to.deep.equal({ foo: 123 });
		});
	});

	describe('filters', () => {
		it('should apply regex filters', () => {
			renderer.applyFilters({
				regex: [/span/i],
				type: new Set()
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <div> to parent 1'
			]);
		});

		it('should ignore case for regex', () => {
			renderer.applyFilters({
				regex: [/SpAn/i],
				type: new Set()
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <div> to parent 1'
			]);
		});

		it('should filter by dom type #1', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});
			render(
				<div>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1'
			]);
		});

		it('should filter by dom type #2', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});

			function Foo() {
				return <div>foo</div>;
			}
			render(
				<div>
					<Foo />
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <Foo> to parent 1'
			]);
		});

		it('should filter by fragment type', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['fragment'])
			});

			function Foo() {
				return <div>foo</div>;
			}
			render(
				<div>
					<Foo />
					<Fragment>asdf</Fragment>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <div> to parent 1',
				'Add 3 <Foo> to parent 2',
				'Add 4 <div> to parent 3'
			]);
		});

		it('should filter on update', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});

			let update;
			function Parent(props) {
				const [i, setI] = useState(0);
				update = () => setI(i + 1);
				return <div>{props.children}</div>;
			}

			const Foo = () => <div />;
			render(
				<Parent>
					<div>
						<Foo />
					</div>
				</Parent>,
				scratch
			);

			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <Parent> to parent 1',
				'Add 3 <Foo> to parent 2'
			]);

			act(() => {
				update();
			});

			expect(toSnapshot(spy.args[1][1])).to.deep.equal([
				'rootId: 1',
				'Update timings 2',
				'Update timings 3'
			]);
		});

		it('should update filters after 1st render', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});

			function Foo() {
				return <div>foo</div>;
			}
			render(
				<div>
					<Foo />
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <Foo> to parent 1'
			]);

			renderer.applyFilters({
				regex: [],
				type: new Set()
			});

			expect(toSnapshot(spy.args[1][1])).to.deep.equal([
				'rootId: 1',
				'Remove 2'
			]);

			expect(toSnapshot(spy.args[2][1])).to.deep.equal([
				'rootId: 1',
				'Add 3 <div> to parent 1',
				'Add 4 <Foo> to parent 3',
				'Add 5 <div> to parent 4',
				'Add 6 <span> to parent 3',
				'Add 7 <span> to parent 3',
				'Update timings 1'
			]);
		});

		it('should update filters after 1st render with unmounts', () => {
			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});

			function Foo(props) {
				return <div>{props.children}</div>;
			}
			render(
				<div>
					<Foo>
						<h1>
							<Foo>foo</Foo>
						</h1>
					</Foo>
					<span>foo</span>
					<span>bar</span>
				</div>,
				scratch
			);
			expect(toSnapshot(spy.args[0][1])).to.deep.equal([
				'rootId: 1',
				'Add 1 <Fragment> to parent 1',
				'Add 2 <Foo> to parent 1',
				'Add 3 <Foo> to parent 2'
			]);

			renderer.applyFilters({
				regex: [],
				type: new Set()
			});

			expect(toSnapshot(spy.args[1][1])).to.deep.equal([
				'rootId: 1',
				'Remove 2'
			]);
			expect(toSnapshot(spy.args[2][1])).to.deep.equal([
				'rootId: 1',
				'Add 4 <div> to parent 1',
				'Add 5 <Foo> to parent 4',
				'Add 6 <div> to parent 5',
				'Add 7 <h1> to parent 6',
				'Add 3 <Foo> to parent 7',
				'Add 8 <div> to parent 3',
				'Add 9 <span> to parent 4',
				'Add 10 <span> to parent 4',
				'Update timings 1'
			]);

			renderer.applyFilters({
				regex: [],
				type: new Set(['dom'])
			});

			expect(toSnapshot(spy.args[3][1])).to.deep.equal([
				'rootId: 1',
				'Remove 4',
				'Remove 5',
				'Remove 9',
				'Remove 10'
			]);

			expect(toSnapshot(spy.args[4][1])).to.deep.equal([
				'rootId: 1',
				'Add 11 <Foo> to parent 1',
				'Add 3 <Foo> to parent 11',
				'Update timings 1'
			]);
		});
	});

	describe('getFilteredChildren', () => {
		it('should get direct children', () => {
			const Foo = () => <div>foo</div>;
			const Bar = () => <div>bar</div>;

			const vnode = (
				<div>
					<Foo />
					<Bar />
					<span />
				</div>
			);

			render(vnode, scratch);

			const filters = {
				regex: [],
				type: new Set(['dom'])
			};

			expect(
				getFilteredChildren(vnode, filters).map(getDisplayName)
			).to.deep.equal(['Foo', 'Bar']);
		});
	});
});
