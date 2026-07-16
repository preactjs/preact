import { createElement, hydrate, options, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';
import { logCall, clearLog, getLog } from '../_util/logCall';

/**
 * Tests for time-sliced (interruptible) hydration, see #407.
 *
 * Core exposes `options._yield`, invoked right before a freshly mounting
 * component renders during hydration. Throwing a thenable from the hook
 * suspends that component via the regular suspended-hydration machinery
 * (MODE_SUSPENDED | MODE_HYDRATE + `_excess`); calling `forceUpdate()` on the
 * suspended component later resumes hydrating its subtree in place. The
 * orchestration below is what an opt-in addon would ship: a sentinel, a
 * `_catchError` wrapper that queues suspended components, and a scheduler
 * that resumes them in budgeted slices.
 */
describe('hydration yielding (#407)', () => {
	/** @type {HTMLElement} */
	let scratch;
	let rerender;

	/** Components allowed to freshly mount before the walk suspends */
	let budget;
	/** Suspended components waiting for the next slice */
	let queue;
	let uninstall;

	function installSlicing() {
		// The sentinel must be thenable so diff() treats it as a suspension
		// eslint-disable-next-line unicorn/no-thenable
		const sentinel = { then() {} };
		queue = [];
		budget = Infinity;

		const prevYield = options._yield;
		const prevCatchError = options._catchError;

		options._yield = vnode => {
			// Never suspend the root fragment: its DOM span is the whole tree
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

	/** Resume all suspended components, allowing `n` new mounts this slice */
	function flushSlice(n) {
		budget = n;
		const pending = queue.splice(0);
		pending.forEach(c => c.forceUpdate());
		rerender();
	}

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemove;

	beforeAll(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemove = logCall(Element.prototype, 'remove');
	});

	afterAll(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemove();
	});

	beforeEach(() => {
		rerender = setupRerender();
		scratch = setupScratch();
		installSlicing();
		clearLog();
	});

	afterEach(() => {
		uninstall();
		teardown(scratch);
	});

	let mounts, clicks;
	class Section extends Component {
		componentDidMount() {
			mounts.push(this.props.name);
		}
		render() {
			return <section>{this.props.children}</section>;
		}
	}
	const Item = ({ children, name }) => (
		<li onClick={() => clicks.push(name)}>{children}</li>
	);
	const App = () => (
		<div>
			<Section name="a">
				<Item name="A">A</Item>
			</Section>
			<Section name="b">
				<Item name="B">B</Item>
			</Section>
			<Section name="c">
				<Item name="C">C</Item>
			</Section>
		</div>
	);
	const APP_HTML =
		'<div>' +
		'<section><li>A</li></section>' +
		'<section><li>B</li></section>' +
		'<section><li>C</li></section>' +
		'</div>';

	beforeEach(() => {
		mounts = [];
		clicks = [];
	});

	it('suspends the hydration walk without touching the SSR DOM', () => {
		scratch.innerHTML = APP_HTML;
		const sections = Array.from(scratch.querySelectorAll('section'));
		const items = Array.from(scratch.querySelectorAll('li'));
		clearLog();

		// Allow App, Section a and Item A to mount, then suspend
		budget = 3;
		hydrate(<App />, scratch);

		expect(queue.length).to.equal(2); // Section b + Section c
		expect(mounts).to.deep.equal(['a']);
		expect(scratch.innerHTML).to.equal(APP_HTML);
		expect(getLog()).to.deep.equal([]);

		flushSlice(Infinity);

		expect(queue.length).to.equal(0);
		expect(mounts).to.deep.equal(['a', 'b', 'c']);
		expect(scratch.innerHTML).to.equal(APP_HTML);
		// Every SSR node was adopted, none recreated or moved
		expect(Array.from(scratch.querySelectorAll('section'))).to.deep.equal(
			sections
		);
		expect(Array.from(scratch.querySelectorAll('li'))).to.deep.equal(items);
		expect(getLog()).to.deep.equal([]);
	});

	it('makes hydrated slices interactive while later slices are pending', () => {
		scratch.innerHTML = APP_HTML;
		clearLog();

		budget = 3;
		hydrate(<App />, scratch);

		const [liA, , liC] = scratch.querySelectorAll('li');
		liA.click();
		liC.click();
		// Item C hasn't hydrated yet, so only A responds
		expect(clicks).to.deep.equal(['A']);

		flushSlice(Infinity);

		liC.click();
		expect(clicks).to.deep.equal(['A', 'C']);
	});

	it('re-suspends fresh mounts in later slices until the walk completes', () => {
		scratch.innerHTML = APP_HTML;
		clearLog();

		// Only App itself mounts; all three sections suspend
		budget = 1;
		hydrate(<App />, scratch);
		expect(queue.length).to.equal(3);
		expect(mounts).to.deep.equal([]);

		// Resumed components always render, but their children are fresh
		// mounts and re-suspend with an exhausted budget
		flushSlice(0);
		expect(queue.length).to.equal(3); // Item A, B, C
		expect(mounts).to.deep.equal(['a', 'b', 'c']);
		expect(scratch.innerHTML).to.equal(APP_HTML);

		flushSlice(Infinity);
		expect(queue.length).to.equal(0);
		expect(scratch.innerHTML).to.equal(APP_HTML);
		expect(getLog()).to.deep.equal([]);
	});

	it('reuses the SSR text node when a text-root component resumes', () => {
		const Txt = () => 'hello';
		const TextApp = () => (
			<div>
				<Txt />
			</div>
		);

		scratch.innerHTML = '<div>hello</div>';
		const textNode = scratch.firstChild.firstChild;
		clearLog();

		budget = 1;
		hydrate(<TextApp />, scratch);
		expect(queue.length).to.equal(1);

		flushSlice(Infinity);
		expect(scratch.firstChild.firstChild).to.equal(textNode);
		expect(scratch.innerHTML).to.equal('<div>hello</div>');
	});

	it('still propagates real errors thrown during hydration', () => {
		const Boom = () => {
			throw new Error('boom');
		};

		scratch.innerHTML = '<div></div>';
		budget = Infinity;
		expect(() =>
			hydrate(
				<div>
					<Boom />
				</div>,
				scratch
			)
		).to.throw('boom');
	});

	it('does not affect hydration when no hook is installed', () => {
		uninstall();
		// Reinstall a noop uninstall so afterEach stays happy
		uninstall = () => {};

		scratch.innerHTML = APP_HTML;
		clearLog();
		hydrate(<App />, scratch);

		expect(mounts).to.deep.equal(['a', 'b', 'c']);
		expect(scratch.innerHTML).to.equal(APP_HTML);
		expect(getLog()).to.deep.equal([]);
	});
});
