import { setupScratch, teardown } from '../../../../test/_util/helpers';
import { h, render, Component } from 'preact';
import { initDevTools } from '../../../src/devtools';
import { createMockDevtoolsHook } from './mock-hook';
import { selectElement, getVNodePath, createSelection, getPathFrame } from '../../../src/devtools/selection';
import { createIdMapper } from '../../../src/devtools/cache';
import { createFilterManager } from '../../../src/devtools/filter';

/** @jsx h */

function getRendered(scratch) {
	return scratch._children._children[0];
}

describe('devtools', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let teardownDevtools;

	let warnings = [];

	beforeEach(() => {
		createMockDevtoolsHook();
		teardownDevtools = initDevTools();
		scratch = setupScratch();
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));
	});

	afterEach(() => {
		teardown(scratch);
		teardownDevtools();
		console.warn.restore();
	});

	describe('selectElement', () => {
		it('should warn when a vnode was not found', () => {
			selectElement(() => null)(1);
			expect(warnings[0]).to.match(/not\sfound/);
		});

		it('should set $r to instance for classes', () => {
			class App extends Component {
				render() {
					return <div>foo</div>;
				}
			}

			render(<App />, scratch);
			const vnode = getRendered(scratch);

			selectElement(() => vnode)(1);
			expect(window.$r instanceof App).to.equal(true);
		});

		it('should normalize function components', () => {
			function App() {
				return <div />;
			}

			render(<App />, scratch);
			const vnode = getRendered(scratch);

			selectElement(() => vnode)(1);
			expect(window.$r).to.deep.equal({
				type: App,
				props: null
			});
		});
	});

	describe('getVNodePath', () => {
		it('should return null if vnode not found', () => {
			const m = createIdMapper();
			expect(getVNodePath(m)(1)).to.equal(null);
		});

		it('should return path to vnode', () => {
			render(<div>foo</div>, scratch);
			const vnode = getRendered(scratch);
			const m = createIdMapper();
			m.getId(vnode);

			expect(getVNodePath(m)(1)).to.deep.equal([
				{
					displayName: 'div',
					index: 0,
					key: undefined
				}
			]);
		});
	});

	describe('createSelection', () => {
		it('should set empty tracked path', () => {
			const m = createIdMapper();
			const s = createSelection(m, createFilterManager(), () => new Set());
			s.setTrackedPath(null);
			expect(s.getBestMatch()).to.equal(null);
		});

		it('should return nothing if path is empty', () => {
			const m = createIdMapper();
			const s = createSelection(m, createFilterManager(), () => new Set());
			s.setTrackedPath([]);
			expect(s.getBestMatch()).to.equal(null);
		});

		it('should get vnode by tracked path', () => {
			function Bar() {
				return <div />;
			}
			function Foo() {
				return <Bar />;
			}

			render(<Foo />, scratch);
			const vnode = scratch._children;
			const getRoots = () => new Set([vnode]);
			const m = createIdMapper();
			m.getId(vnode);
			m.getId(vnode._children[0]);
			m.getId(vnode._children[0]._children[0]);

			const s = createSelection(m, createFilterManager(), getRoots);

			const pathFrame = [vnode._children[0], vnode._children[0]._children[0]]
				.map(x => getPathFrame(x));
			s.setTrackedPath(pathFrame);
			expect(s.getBestMatch()).to.deep.equal({
				id: 3,
				isFullMatch: false
			});
		});
	});
});
