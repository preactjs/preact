import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	Suspense,
	useState,
	useLayoutEffect
} from 'preact/compat';
import { options } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { createLazy } from './suspense-utils';

/* eslint-env browser */

/**
 * Time-sliced hydration (options._yield, see #407) must compose with real
 * suspensions: the slicing sentinel is intercepted by the scheduler's
 * _catchError wrapper while genuine thenables (lazy/data suspensions) fall
 * through to compat's Suspense handling.
 */
describe('hydration yielding + Suspense interop', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;
	let unhandledEvents = [];

	let budget;
	let queue;
	let uninstall;

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	function installSlicing() {
		// eslint-disable-next-line unicorn/no-thenable
		const sentinel = { then() {} };
		queue = [];
		budget = Infinity;

		const prevYield = options._yield;
		const prevCatchError = options._catchError;

		options._yield = vnode => {
			if (vnode._parent && --budget < 0) throw sentinel;
		};

		options._catchError = (error, vnode, oldVNode, errorInfo) => {
			if (error === sentinel) {
				queue.push(vnode._component);
				return;
			}
			prevCatchError(error, vnode, oldVNode, errorInfo);
		};

		uninstall = () => {
			options._yield = prevYield;
			options._catchError = prevCatchError;
		};
	}

	function flushSlice(n) {
		budget = n;
		const pending = queue.splice(0);
		pending.forEach(c => c.forceUpdate());
		rerender();
	}

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		installSlicing();

		unhandledEvents = [];
		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		uninstall();
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);
			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('slices around a real lazy suspension without interfering', () => {
		const clicks = [];
		const [Lazy, resolve] = createLazy();
		const Item = ({ name }) => (
			<li onClick={() => clicks.push(name)}>{name}</li>
		);
		const App = () => (
			<ul>
				<Item name="a" />
				<Suspense fallback={null}>
					<Lazy />
				</Suspense>
				<Item name="c" />
			</ul>
		);

		const html = '<ul><li>a</li><li>b</li><li>c</li></ul>';
		scratch.innerHTML = html;
		const lis = Array.from(scratch.querySelectorAll('li'));

		// App + Item a mount; Suspense, Lazy and Item c all defer: Lazy via a
		// real promise, the others via the slicing sentinel
		budget = 2;
		hydrate(<App />, scratch);
		expect(scratch.innerHTML).to.equal(html);

		// Resume the sliced components; the lazy subtree stays pending
		flushSlice(Infinity);
		expect(scratch.innerHTML).to.equal(html);
		lis[0].click();
		lis[2].click();
		expect(clicks).to.deep.equal(['a', 'c']);
		lis[1].click();
		expect(clicks).to.deep.equal(['a', 'c']); // lazy still inert

		return resolve(() => <Item name="b" />).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(html);
			expect(Array.from(scratch.querySelectorAll('li'))).to.deep.equal(lis);
			lis[1].click();
			expect(clicks).to.deep.equal(['a', 'c', 'b']);
		});
	});

	it('runs hooks and effects exactly once for components resumed in a slice', () => {
		let effects = 0;
		function Counter() {
			const [n, setN] = useState(0);
			useLayoutEffect(() => {
				effects++;
			}, []);
			return <button onClick={() => setN(n + 1)}>{n}</button>;
		}

		scratch.innerHTML = '<button>0</button>';
		const button = scratch.firstChild;

		budget = 0;
		hydrate(<Counter />, scratch);
		expect(queue.length).to.equal(1);
		expect(effects).to.equal(0);

		flushSlice(Infinity);
		expect(effects).to.equal(1);
		expect(scratch.firstChild).to.equal(button);

		button.click();
		rerender();
		expect(effects).to.equal(1);
		expect(scratch.firstChild).to.equal(button);
		expect(button.textContent).to.equal('1');
	});
});
