import {
	createElement,
	hydrate,
	options,
	Component,
	createContext,
	createRef
} from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';
import { logCall, clearLog, getLog } from '../_util/logCall';

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

	it('provides context to components resuming in a later slice', () => {
		const Ctx = createContext('default');
		class Reader extends Component {
			render() {
				return <span>{this.context}</span>;
			}
		}
		Reader.contextType = Ctx;

		scratch.innerHTML = '<span>live</span>';
		const span = scratch.firstChild;

		// Provider mounts, Reader suspends
		budget = 1;
		hydrate(
			<Ctx.Provider value="live">
				<Reader />
			</Ctx.Provider>,
			scratch
		);
		expect(queue.length).to.equal(1);

		flushSlice(Infinity);
		expect(scratch.firstChild).to.equal(span);
		expect(scratch.innerHTML).to.equal('<span>live</span>');
	});

	it('applies refs to adopted DOM when a suspended component resumes', () => {
		const ref = createRef();
		const Widget = () => <span ref={ref}>w</span>;

		scratch.innerHTML = '<div><span>w</span></div>';
		const span = scratch.firstChild.firstChild;

		budget = 0;
		hydrate(
			<div>
				<Widget />
			</div>,
			scratch
		);
		expect(ref.current).to.equal(null);

		flushSlice(Infinity);
		expect(ref.current).to.equal(span);
	});

	it('resumes components whose shouldComponentUpdate returns false', () => {
		class Gate extends Component {
			shouldComponentUpdate() {
				return false;
			}
			render() {
				return <li onClick={() => clicks.push('gate')}>g</li>;
			}
		}

		scratch.innerHTML = '<li>g</li>';
		const li = scratch.firstChild;

		budget = 0;
		hydrate(<Gate />, scratch);
		expect(queue.length).to.equal(1);

		flushSlice(Infinity);
		expect(scratch.firstChild).to.equal(li);
		li.click();
		expect(clicks).to.deep.equal(['gate']);
	});

	it('resumes a suspended child inline when its parent re-renders first', () => {
		/** @type {Parent} */
		let parent;
		const Kid = () => <li onClick={() => clicks.push('kid')}>k</li>;
		class Parent extends Component {
			constructor(props) {
				super(props);
				this.state = { label: 'x' };
				parent = this;
			}
			render() {
				return (
					<div>
						<span>{this.state.label}</span>
						<Kid />
					</div>
				);
			}
		}

		scratch.innerHTML = '<div><span>x</span><li>k</li></div>';
		const li = scratch.querySelector('li');

		// Parent mounts, Kid suspends
		budget = 1;
		hydrate(<Parent />, scratch);
		expect(queue.length).to.equal(1);

		// A state update above the suspended child resumes it inline through
		// the MODE_SUSPENDED path in diff()
		parent.setState({ label: 'y' });
		rerender();

		expect(scratch.querySelector('span').textContent).to.equal('y');
		expect(scratch.querySelector('li')).to.equal(li);
		li.click();
		expect(clicks).to.deep.equal(['kid']);

		// The stale queue entry must be a harmless no-op
		flushSlice(Infinity);
		expect(scratch.querySelector('li')).to.equal(li);
		li.click();
		expect(clicks).to.deep.equal(['kid', 'kid']);
	});

	it('completes hydration with the deadline-based scheduler from the PR example', async () => {
		// This test runs the realistic orchestrator: performance.now() deadline
		// + setTimeout flushes, with preact's default microtask render queue.
		uninstall();
		const prevDebounce = options.debounceRendering;
		options.debounceRendering = undefined;

		const BUDGET = 1;
		// eslint-disable-next-line unicorn/no-thenable
		const sentinel = { then() {} };
		const pending = [];
		let deadline = 0;
		let scheduled = false;
		let slices = 0;

		options._yield = vnode => {
			if (vnode._parent && performance.now() > deadline) throw sentinel;
		};
		const prevCatchError = options._catchError;
		options._catchError = (error, vnode, oldVNode, errorInfo) => {
			if (error === sentinel) {
				pending.push(vnode._component);
				schedule();
				return;
			}
			prevCatchError(error, vnode, oldVNode, errorInfo);
		};
		uninstall = () => {
			options._yield = undefined;
			options._catchError = prevCatchError;
			options.debounceRendering = prevDebounce;
		};

		function schedule() {
			if (!scheduled) {
				scheduled = true;
				setTimeout(flush);
			}
		}

		// Resumed components render unconditionally, so the queue must be
		// pumped one component at a time with a deadline check after each
		// render — force-updating the whole queue at once would hydrate all
		// remaining flat siblings in a single task.
		function flush() {
			slices++;
			deadline = performance.now() + BUDGET;
			pump();
		}

		function pump() {
			const c = pending.shift();
			if (!c) {
				scheduled = false;
				if (pending.length) schedule();
				return;
			}
			c.forceUpdate();
			// preact renders in its own microtask; check the deadline after it
			queueMicrotask(() => {
				if (performance.now() > deadline) {
					scheduled = false;
					if (pending.length) schedule();
				} else {
					pump();
				}
			});
		}

		const spin = ms => {
			const end = performance.now() + ms;
			while (performance.now() < end);
		};
		const COUNT = 40;
		const SpinItem = ({ i }) => {
			spin(0.5);
			return <li onClick={() => clicks.push(i)}>{`c${i}`}</li>;
		};
		const BigApp = () => (
			<ul>
				{Array.from({ length: COUNT }, (_, i) => (
					<SpinItem key={i} i={i} />
				))}
			</ul>
		);
		const html =
			'<ul>' +
			Array.from({ length: COUNT }, (_, i) => `<li>c${i}</li>`).join('') +
			'</ul>';

		scratch.innerHTML = html;
		const lis = Array.from(scratch.querySelectorAll('li'));
		clearLog();

		deadline = performance.now() + BUDGET;
		hydrate(<BigApp />, scratch);

		// Hydration must not have completed synchronously
		expect(pending.length).to.be.greaterThan(0);

		// Wait until the scheduler drains
		for (let guard = 0; (pending.length || scheduled) && guard < 200; guard++) {
			await new Promise(r => setTimeout(r, 5));
		}
		await new Promise(r => setTimeout(r, 10));

		expect(pending.length).to.equal(0);
		expect(slices).to.be.greaterThan(1);
		expect(scratch.innerHTML).to.equal(html);
		expect(Array.from(scratch.querySelectorAll('li'))).to.deep.equal(lis);
		expect(getLog()).to.deep.equal([]);
		lis[0].click();
		lis[COUNT - 1].click();
		expect(clicks).to.deep.equal([0, COUNT - 1]);
	});

	describe('documented limitations (single-DOM-root components only)', () => {
		// `_excess` stores a single resume node, so suspending a component whose
		// SSR output isn't exactly one DOM node misbehaves. These tests pin down
		// the current behavior so any improvement (e.g. RTS-emitted markers)
		// shows up as a diff. A real scheduler must only suspend components
		// known to render a single root node.

		it('fragment-root: loses trailing nodes mid-slice, recreates them on resume', () => {
			const Multi = () => [<li>1</li>, <li>2</li>];
			scratch.innerHTML = '<ul><li>1</li><li>2</li></ul>';
			const [li1, li2] = scratch.querySelectorAll('li');

			budget = 0;
			hydrate(
				<ul>
					<Multi />
				</ul>,
				scratch
			);
			// The second root node is dropped while the component is suspended
			expect(scratch.innerHTML).to.equal('<ul><li>1</li></ul>');

			flushSlice(Infinity);
			// Final markup is correct, but <li>2</li> was recreated, not adopted
			expect(scratch.innerHTML).to.equal('<ul><li>1</li><li>2</li></ul>');
			const lis = scratch.querySelectorAll('li');
			expect(lis[0]).to.equal(li1);
			expect(lis[1]).to.not.equal(li2);
		});

		it('null-root: transiently duplicates the stolen sibling node until resume', () => {
			const Nothing = () => null;
			scratch.innerHTML = '<ul><li>3</li></ul>';
			const li = scratch.querySelector('li');

			budget = 0;
			hydrate(
				<ul>
					<Nothing />
					<li>3</li>
				</ul>,
				scratch
			);
			// The suspended null-renderer claimed <li>3</li> as its resume
			// point, so the real sibling deopted and created a duplicate
			expect(scratch.innerHTML).to.equal('<ul><li>3</li><li>3</li></ul>');

			flushSlice(Infinity);

			// On resume the unclaimed stolen node is removed again: the final
			// markup is correct, but the surviving <li> is the recreated one
			expect(scratch.innerHTML).to.equal('<ul><li>3</li></ul>');
			expect(scratch.querySelector('li')).to.not.equal(li);
		});

		it('a shape-learning policy avoids both pitfalls', () => {
			// The scheduler-side fix: never suspend a component type until one
			// instance has rendered and proven to produce exactly one DOM root.
			// First instances hydrate synchronously, null/fragment-root types
			// are never suspended, and repeated single-root types (the common
			// list case) remain sliceable.
			uninstall();

			const shapes = new WeakMap();
			// eslint-disable-next-line unicorn/no-thenable
			const sentinel = { then() {} };
			const pending = [];
			let allow = Infinity;

			const isSingleRoot = vnode => {
				const children = vnode._children;
				let root = null;
				if (children) {
					for (let i = 0; i < children.length; i++) {
						if (children[i] != null) {
							if (root) return false;
							root = children[i];
						}
					}
				}
				if (!root) return false;
				return typeof root.type != 'function' || isSingleRoot(root);
			};

			options._yield = vnode => {
				if (vnode._parent && shapes.get(vnode.type) && --allow < 0) {
					throw sentinel;
				}
			};
			const prevCatchError = options._catchError;
			options._catchError = (error, vnode, oldVNode, errorInfo) => {
				if (error === sentinel) {
					pending.push(vnode._component);
					return;
				}
				prevCatchError(error, vnode, oldVNode, errorInfo);
			};
			const prevDiffed = options.diffed;
			options.diffed = vnode => {
				// Unknown types can never be suspended, so any vnode we learn
				// from here rendered for real
				if (typeof vnode.type == 'function' && !shapes.has(vnode.type)) {
					shapes.set(vnode.type, isSingleRoot(vnode));
				}
				if (prevDiffed) prevDiffed(vnode);
			};
			uninstall = () => {
				options._yield = undefined;
				options._catchError = prevCatchError;
				options.diffed = prevDiffed;
			};

			const Nothing = () => null;
			const Pair = () => [<li>p1</li>, <li>p2</li>];
			const Note = ({ n }) => <li onClick={() => clicks.push(n)}>{n}</li>;
			const PolicyApp = () => (
				<ul>
					<Note n="1" />
					<Nothing />
					<Note n="2" />
					<Pair />
					<Note n="3" />
					<Note n="4" />
				</ul>
			);
			const html =
				'<ul><li>1</li><li>2</li><li>p1</li><li>p2</li><li>3</li><li>4</li></ul>';

			scratch.innerHTML = html;
			const lis = Array.from(scratch.querySelectorAll('li'));
			clearLog();

			// One learned-single-root instance beyond the first may render
			allow = 1;
			hydrate(<PolicyApp />, scratch);

			// Note 1 taught the policy (rendered sync), Nothing and Pair were
			// never suspended, Note 2 used the allowance, Notes 3+4 deferred
			expect(pending.length).to.equal(2);
			// No corruption at any point: the DOM is untouched mid-slice
			expect(scratch.innerHTML).to.equal(html);

			allow = Infinity;
			pending.splice(0).forEach(c => c.forceUpdate());
			rerender();

			expect(scratch.innerHTML).to.equal(html);
			expect(Array.from(scratch.querySelectorAll('li'))).to.deep.equal(lis);
			expect(getLog()).to.deep.equal([]);
			lis[5].click();
			expect(clicks).to.deep.equal(['4']);
		});
	});
});
