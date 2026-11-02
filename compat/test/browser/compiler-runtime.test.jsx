import { createElement, render, useState } from 'preact/compat';
import { c as _c } from 'preact/compat/compiler-runtime';
import { act } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('compiler-runtime', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should fill the cache with the memo cache sentinel', () => {
		let cache;
		function App() {
			cache = _c(3);
			return null;
		}

		render(<App />, scratch);
		expect(cache).to.have.length(3);
		const sentinel = Symbol.for('react.memo_cache_sentinel');
		expect(cache.every(v => v === sentinel)).to.equal(true);
	});

	it('should keep the cache stable across renders and per instance', () => {
		const caches = [];
		let update;
		function Child() {
			caches.push(_c(1));
			return null;
		}
		function App() {
			const [, set] = useState(0);
			update = () => set(v => v + 1);
			return (
				<div>
					<Child />
					<Child />
				</div>
			);
		}

		render(<App />, scratch);
		act(() => update());
		expect(caches).to.have.length(4);
		expect(caches[0]).to.not.equal(caches[1]);
		expect(caches[2]).to.equal(caches[0]);
		expect(caches[3]).to.equal(caches[1]);
	});

	it('should memoize compiled output', () => {
		let renders = 0;
		let update;
		function Label(props) {
			renders++;
			return <span>{props.text}</span>;
		}

		// Shape emitted by babel-plugin-react-compiler with target '19'
		function App(props) {
			const $ = _c(2);
			const [count, setCount] = useState(0);
			update = () => setCount(count + 1);
			let t0;
			if ($[0] !== props.text) {
				t0 = <Label text={props.text} />;
				$[0] = props.text;
				$[1] = t0;
			} else {
				t0 = $[1];
			}
			return (
				<div>
					{count}
					{t0}
				</div>
			);
		}

		render(<App text="a" />, scratch);
		expect(scratch.innerHTML).to.equal('<div>0<span>a</span></div>');
		expect(renders).to.equal(1);

		act(() => update());
		expect(scratch.innerHTML).to.equal('<div>1<span>a</span></div>');
		expect(renders).to.equal(1);

		render(<App text="b" />, scratch);
		expect(scratch.innerHTML).to.equal('<div>1<span>b</span></div>');
		expect(renders).to.equal(2);
	});
});
