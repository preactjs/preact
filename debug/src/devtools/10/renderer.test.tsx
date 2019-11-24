import { h, render, Options, options, Fragment } from 'preact';
import * as sinon from 'sinon';
import { createRenderer, getFilteredChildren } from './renderer';
import { setupOptions } from '../10/options';
import { DevtoolsHook } from '../hook';
import { expect } from 'chai';
import { toSnapshot } from '../debug';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { getDisplayName } from './vnode';
import { FilterState } from '../adapter/filter';
import { Renderer } from '../renderer';

export function setupScratch() {
	const div = document.createElement('div');
	div.id = 'scratch';
	document.body.appendChild(div);
	return div;
}

export function setupMockHook(options: Options) {
	const spy = sinon.spy();
	const fakeHook: DevtoolsHook = {
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
	let scratch: HTMLDivElement;
	let destroy: () => void;
	let spy: sinon.SinonSpy;
	let renderer: Renderer;

	beforeEach(() => {
		scratch = setupScratch();
		const mock = setupMockHook(options);
		destroy = mock.destroy;
		spy = mock.spy;
		renderer = mock.renderer;
	});

	afterEach(() => {
		scratch.remove();
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

		const Foo = (props: any) => <div>{props.children}</div>;
		const Bar = (props: any) => <span>{props.children}</span>;

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

			let update: () => void;
			function Parent(props: { children: any }) {
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

			function Foo(props: any) {
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

			const filters: FilterState = {
				regex: [],
				type: new Set(['dom'])
			};

			expect(
				getFilteredChildren(vnode, filters).map(getDisplayName)
			).to.deep.equal(['Foo', 'Bar']);
		});
	});
});
