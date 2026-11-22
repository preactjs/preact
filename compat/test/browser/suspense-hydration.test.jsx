import { setupRerender, act } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	render,
	Fragment,
	Suspense,
	use,
	memo,
	useId,
	useState,
	useEffect,
	useContext,
	createContext,
	useSyncExternalStore,
	createPortal
} from 'preact/compat';
import { logCall, getLog, clearLog } from '../../../test/_util/logCall';
import {
	createEvent,
	setupScratch,
	teardown
} from '../../../test/_util/helpers';
import { ul, li, div } from '../../../test/_util/dom';
import {
	createLazy,
	createSuspender,
	createSuspenseLoader
} from './suspense-utils';
import { vi } from 'vitest';

/* eslint-env browser */
describe('suspense hydration', () => {
	/** @type {HTMLDivElement} */
	let scratch,
		rerender,
		unhandledEvents = [];

	const List = ({ children }) => <ul>{children}</ul>;
	const ListItem = ({ children, onClick = null }) => (
		<li onClick={onClick}>{children}</li>
	);

	function onUnhandledRejection(event) {
		unhandledEvents.push(event);
	}

	let resetAppendChild;
	let resetInsertBefore;
	let resetRemoveChild;
	let resetRemove;

	beforeAll(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveChild = logCall(Element.prototype, 'removeChild');
		resetRemove = logCall(Element.prototype, 'remove');
	});

	afterAll(() => {
		resetAppendChild();
		resetInsertBefore();
		resetRemoveChild();
		resetRemove();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		unhandledEvents = [];
		if ('onunhandledrejection' in window) {
			window.addEventListener('unhandledrejection', onUnhandledRejection);
		}
	});

	afterEach(() => {
		teardown(scratch);

		if ('onunhandledrejection' in window) {
			window.removeEventListener('unhandledrejection', onUnhandledRejection);

			if (unhandledEvents.length) {
				throw unhandledEvents[0].reason;
			}
		}
	});

	it('should leave DOM untouched when suspending while hydrating', () => {
		scratch.innerHTML = '<div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Hello</div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should not claim a marked sibling when an unmarked boundary suspends', async () => {
		const originalHtml =
			'<div><button id="first">first</button><!--$s--><button id="second">second</button><!--/$s--></div>';
		scratch.innerHTML = originalHtml;
		const first = scratch.querySelector('#first');
		const second = scratch.querySelector('#second');
		const listeners = [vi.fn(), vi.fn()];
		const [LazyFirst, resolveFirst] = createLazy();
		const [LazySecond, resolveSecond] = createLazy();

		hydrate(
			<div>
				<Suspense>
					<LazyFirst />
				</Suspense>
				<Suspense>
					<LazySecond />
				</Suspense>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal(originalHtml);

		await resolveFirst(() => (
			<button id="first" onClick={listeners[0]}>
				first
			</button>
		));
		rerender();
		await resolveSecond(() => (
			<button id="second" onClick={listeners[1]}>
				second
			</button>
		));
		rerender();

		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		first.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).not.toHaveBeenCalled();
		second.dispatchEvent(createEvent('click'));
		expect(listeners[1]).toHaveBeenCalledOnce();
		expect(listeners[0]).toHaveBeenCalledOnce();
	});

	it('should preserve a hydrated sibling when an unmarked boundary suspends', async () => {
		scratch.innerHTML =
			'<div><button id="first">first</button><!--$s--><button id="second">second</button><!--/$s--></div>';
		const first = scratch.querySelector('#first');
		const second = scratch.querySelector('#second');
		const listeners = [vi.fn(), vi.fn()];
		const [Lazy, resolve] = createLazy();

		hydrate(
			<div>
				<Suspense>
					<Lazy />
				</Suspense>
				<Suspense>
					<button id="second" onClick={listeners[1]}>
						second
					</button>
				</Suspense>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		second.dispatchEvent(createEvent('click'));
		expect(listeners[1]).toHaveBeenCalledOnce();
		expect(listeners[0]).not.toHaveBeenCalled();

		await resolve(() => (
			<button id="first" onClick={listeners[0]}>
				first
			</button>
		));
		rerender();

		expect(scratch.querySelectorAll('button').length).to.equal(2);
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		expect(first.outerHTML).to.equal('<button id="first">first</button>');
		expect(second.outerHTML).to.equal('<button id="second">second</button>');
		first.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).toHaveBeenCalledOnce();
	});

	it('should not claim the markers of an already-hydrated sibling', async () => {
		scratch.innerHTML =
			'<div><!--$s:0--><button id="first">first</button><!--/$s:0--><!--$s:1--><button id="second">second</button><!--/$s:1--></div>';
		const first = scratch.querySelector('#first');
		const second = scratch.querySelector('#second');
		const listeners = [vi.fn(), vi.fn()];
		const [Lazy, resolve] = createLazy();
		clearLog();

		hydrate(
			<div>
				<Suspense>
					<button id="first" onClick={listeners[0]}>
						first
					</button>
				</Suspense>
				<Suspense>
					<Lazy />
				</Suspense>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		first.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).not.toHaveBeenCalled();

		await resolve(() => (
			<button id="second" onClick={listeners[1]}>
				second
			</button>
		));
		rerender();

		expect(getLog()).to.deep.equal([]);
		expect(scratch.querySelectorAll('button').length).to.equal(2);
		expect(first.outerHTML).to.equal('<button id="first">first</button>');
		expect(second.outerHTML).to.equal('<button id="second">second</button>');
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		second.dispatchEvent(createEvent('click'));
		expect(listeners[1]).toHaveBeenCalledOnce();
		expect(listeners[0]).toHaveBeenCalledOnce();
	});

	it('should hydrate marked siblings that resolve in reverse order', async () => {
		const originalHtml =
			'<div><!--$s--><button id="first">first</button><!--/$s--><!--$s--><button id="second">second</button><!--/$s--></div>';
		scratch.innerHTML = originalHtml;
		const first = scratch.querySelector('#first');
		const second = scratch.querySelector('#second');
		const listeners = [vi.fn(), vi.fn()];
		const [LazyFirst, resolveFirst] = createLazy();
		const [LazySecond, resolveSecond] = createLazy();

		hydrate(
			<div>
				<Suspense>
					<LazyFirst />
				</Suspense>
				<Suspense>
					<LazySecond />
				</Suspense>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal(originalHtml);

		await resolveSecond(() => (
			<button id="second" onClick={listeners[1]}>
				second
			</button>
		));
		rerender();
		await resolveFirst(() => (
			<button id="first" onClick={listeners[0]}>
				first
			</button>
		));
		rerender();

		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
		first.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).not.toHaveBeenCalled();
		second.dispatchEvent(createEvent('click'));
		expect(listeners[1]).toHaveBeenCalledOnce();
		expect(listeners[0]).toHaveBeenCalledOnce();
	});

	it('should preserve suspended siblings around a hydrated marked boundary', async () => {
		scratch.innerHTML =
			'<ul><!--$s:0--><li>first</li><!--/$s:0--><!--$s:1--><li>second</li><!--/$s:1--><!--$s:2--><li>third</li><!--/$s:2--></ul>';
		const [first, second, third] = scratch.querySelectorAll('li');
		const listeners = [vi.fn(), vi.fn(), vi.fn()];
		const [LazyFirst, resolveFirst] = createLazy();
		const [LazyThird, resolveThird] = createLazy();
		clearLog();

		hydrate(
			<List>
				<Suspense>
					<LazyFirst />
				</Suspense>
				<Suspense>
					<ListItem onClick={listeners[1]}>second</ListItem>
				</Suspense>
				<Suspense>
					<LazyThird />
				</Suspense>
			</List>,
			scratch
		);
		rerender();
		expect(scratch.querySelectorAll('li')[0]).to.equal(first);
		expect(scratch.querySelectorAll('li')[1]).to.equal(second);
		expect(scratch.querySelectorAll('li')[2]).to.equal(third);

		await resolveThird(() => <ListItem onClick={listeners[2]}>third</ListItem>);
		rerender();
		await resolveFirst(() => <ListItem onClick={listeners[0]}>first</ListItem>);
		rerender();

		expect(getLog()).to.deep.equal([]);
		expect(scratch.querySelectorAll('li').length).to.equal(3);
		expect(scratch.querySelectorAll('li')[0]).to.equal(first);
		expect(scratch.querySelectorAll('li')[1]).to.equal(second);
		expect(scratch.querySelectorAll('li')[2]).to.equal(third);
		expect(scratch.textContent).to.equal('firstsecondthird');
		first.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).not.toHaveBeenCalled();
		expect(listeners[2]).not.toHaveBeenCalled();
		second.dispatchEvent(createEvent('click'));
		third.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).toHaveBeenCalledOnce();
		expect(listeners[2]).toHaveBeenCalledOnce();
	});

	it('should hydrate an empty marked boundary between siblings', async () => {
		const originalHtml =
			'<div><button id="before">before</button><!--$s--><!--/$s--><button id="after">after</button></div>';
		scratch.innerHTML = originalHtml;
		const before = scratch.querySelector('#before');
		const after = scratch.querySelector('#after');
		const listeners = [vi.fn(), vi.fn()];
		const [Lazy, resolve] = createLazy();
		clearLog();

		hydrate(
			<div>
				<button id="before" onClick={listeners[0]}>
					before
				</button>
				<Suspense>
					<Lazy />
				</Suspense>
				<button id="after" onClick={listeners[1]}>
					after
				</button>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		before.dispatchEvent(createEvent('click'));
		after.dispatchEvent(createEvent('click'));
		expect(listeners[0]).toHaveBeenCalledOnce();
		expect(listeners[1]).toHaveBeenCalledOnce();

		await resolve(() => null);
		rerender();

		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(scratch.querySelector('#before')).to.equal(before);
		expect(scratch.querySelector('#after')).to.equal(after);
		expect(getLog()).to.deep.equal([]);
	});

	it('should continue hydrating and updating siblings while boundaries are suspended', async () => {
		scratch.innerHTML =
			'<div><button id="first">first</button><!--$s--><button id="second">second</button><!--/$s--><button id="counter">0</button></div>';
		const first = scratch.querySelector('#first');
		const second = scratch.querySelector('#second');
		const counter = scratch.querySelector('#counter');
		const onRef = vi.fn();
		const [LazyFirst, resolveFirst] = createLazy();
		const [LazySecond, resolveSecond] = createLazy();

		function Counter() {
			const [count, setCount] = useState(0);
			return (
				<button id="counter" ref={onRef} onClick={() => setCount(count + 1)}>
					{count}
				</button>
			);
		}

		hydrate(
			<div>
				<Suspense>
					<LazyFirst />
				</Suspense>
				<Suspense>
					<LazySecond />
				</Suspense>
				<Counter />
			</div>,
			scratch
		);
		rerender();

		expect(onRef).toHaveBeenCalledWith(counter);
		counter.dispatchEvent(createEvent('click'));
		rerender();
		expect(counter.textContent).to.equal('1');
		expect(scratch.querySelector('#counter')).to.equal(counter);
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);

		await resolveSecond(() => <button id="second">second</button>);
		rerender();
		await resolveFirst(() => <button id="first">first</button>);
		rerender();

		counter.dispatchEvent(createEvent('click'));
		rerender();
		expect(counter.textContent).to.equal('2');
		expect(scratch.querySelectorAll('button').length).to.equal(3);
		expect(scratch.querySelector('#counter')).to.equal(counter);
		expect(scratch.querySelector('#first')).to.equal(first);
		expect(scratch.querySelector('#second')).to.equal(second);
	});

	it('should hydrate nested empty ranges after a marked sibling', async () => {
		scratch.innerHTML =
			'<div><!--$s:0--><button id="before">before</button><!--/$s:0--><!--$s:1--><!--$s:2--><!--/$s:2--><!--/$s:1--></div>';
		const before = scratch.querySelector('#before');
		const onClick = vi.fn();
		const [LazyOuter, resolveOuter] = createLazy();
		const [LazyInner, resolveInner] = createLazy();
		const expectedRange = '<!--$s:1--><!--$s:2--><!--/$s:2--><!--/$s:1-->';

		hydrate(
			<div>
				<Suspense>
					<button id="before" onClick={onClick}>
						before
					</button>
				</Suspense>
				<Suspense>
					<LazyOuter>
						<Suspense>
							<LazyInner />
						</Suspense>
					</LazyOuter>
				</Suspense>
			</div>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.contain(expectedRange);

		await resolveOuter(props => props.children);
		rerender();
		await resolveInner(() => null);
		rerender();

		expect(scratch.innerHTML).to.contain(expectedRange);
		expect(scratch.querySelectorAll('button').length).to.equal(1);
		expect(scratch.querySelector('#before')).to.equal(before);
		before.dispatchEvent(createEvent('click'));
		expect(onClick).toHaveBeenCalledOnce();
	});

	it('should use the server snapshot when suspended hydration resumes', async () => {
		scratch.innerHTML = '<div>server</div>';
		clearLog();

		const snapshots = [];
		const [Lazy, resolve] = createLazy();

		function StoreValue() {
			const value = useSyncExternalStore(
				() => () => {},
				() => {
					snapshots.push('client');
					return 'client';
				},
				() => {
					snapshots.push('server');
					return 'server';
				}
			);
			return <div>{value}</div>;
		}

		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender();
		expect(snapshots).to.deep.equal([]);

		await resolve(() => <StoreValue />);
		rerender();

		const [first, ...rest] = snapshots;
		expect(first).to.equal('server');
		expect(rest.every(snap => snap === 'client')).to.equal(true);
		expect(scratch.innerHTML).to.equal('<div>client</div>');
	});

	it('Should not crash when oldVNode._children is null during shouldComponentUpdate optimization', () => {
		const originalHtml = '<div>Hello</div>';
		scratch.innerHTML = originalHtml;
		clearLog();

		class ErrorBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { hasError: false };
			}

			static getDerivedStateFromError() {
				return { hasError: true };
			}

			render() {
				return this.props.children;
			}
		}

		const [Lazy, resolve] = createLazy();
		function App() {
			return (
				<Suspense>
					<ErrorBoundary>
						<Lazy />
					</ErrorBoundary>
				</Suspense>
			);
		}

		hydrate(<App />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		let i = 0;
		class ThrowOrRender extends React.Component {
			shouldComponentUpdate() {
				return i === 0;
			}
			render() {
				if (i === 0) {
					i++;
					throw new Error('Test error');
				}
				return <div>Hello</div>;
			}
		}

		return resolve(ThrowOrRender).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			clearLog();
		});
	});

	it('does not crash when a hydrated suspended component bails out with shouldComponentUpdate', () => {
		scratch.innerHTML = '<div>ssr</div>';
		clearLog();

		const promise = new Promise(() => {});
		let update;

		class Suspender extends React.Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				throw promise;
			}
		}

		class App extends React.Component {
			constructor(props) {
				super(props);
				this.state = { tick: 0 };
				update = () => this.setState({ tick: this.state.tick + 1 });
			}

			render() {
				return (
					<Suspense fallback={<div>loading</div>}>
						<Suspender tick={this.state.tick} />
					</Suspense>
				);
			}
		}

		hydrate(<App />, scratch);
		expect(scratch.innerHTML).to.equal('<div>ssr</div>');

		update();
		expect(() => rerender()).not.to.throw();
		expect(scratch.innerHTML).to.equal('<div>ssr</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();
	});

	it('does not crash when a hydrated suspended component with no DOM bails out with shouldComponentUpdate', () => {
		scratch.innerHTML = '';
		clearLog();

		const promise = new Promise(() => {});
		let update;

		class Suspender extends React.Component {
			shouldComponentUpdate() {
				return false;
			}

			render() {
				throw promise;
			}
		}

		class App extends React.Component {
			constructor(props) {
				super(props);
				this.state = { tick: 0 };
				update = () => this.setState({ tick: this.state.tick + 1 });
			}

			render() {
				return (
					<Suspense fallback={<div>loading</div>}>
						<Suspender tick={this.state.tick} />
					</Suspense>
				);
			}
		}

		hydrate(<App />, scratch);
		expect(scratch.innerHTML).to.equal('');

		update();
		expect(() => rerender()).not.to.throw();
		expect(scratch.innerHTML).to.equal('');
		expect(getLog()).to.deep.equal([]);
		clearLog();
	});

	it('should leave DOM untouched when suspending while hydrating', () => {
		scratch.innerHTML = '<!-- test --><div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<!-- test --><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<!-- test --><div>Hello</div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should properly attach event listeners when suspending while hydrating', () => {
		scratch.innerHTML = '<div>Hello</div><div>World</div>';
		clearLog();

		const helloListener = vi.fn();
		const worldListener = vi.fn();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
				<div onClick={worldListener}>World!</div>
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Hello</div><div>World!</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		scratch.querySelector('div:last-child').dispatchEvent(createEvent('click'));
		expect(worldListener, 'worldListener 1').toHaveBeenCalledOnce();

		return resolve(() => <div onClick={helloListener}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Hello</div><div>World!</div>');
			expect(getLog()).to.deep.equal([]);

			scratch
				.querySelector('div:first-child')
				.dispatchEvent(createEvent('click'));
			expect(helloListener, 'helloListener').toHaveBeenCalledOnce();

			scratch
				.querySelector('div:last-child')
				.dispatchEvent(createEvent('click'));
			expect(worldListener, 'worldListener 2').toHaveBeenCalledTimes(2);

			clearLog();
		});
	});

	it('should allow siblings to update around suspense boundary', () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();

		/** @type {() => void} */
		let increment;
		function Counter() {
			const [count, setCount] = useState(0);
			increment = () => setCount(c => c + 1);
			return <div>Count: {count}</div>;
		}

		hydrate(
			<Fragment>
				<Counter />
				<Suspense>
					<Lazy />
				</Suspense>
			</Fragment>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Count: 0</div><div>Hello</div>');
		// Re: DOM OP below - Known issue with hydrating merged text nodes
		expect(getLog()).to.deep.equal(['<div>Count: .appendChild(#text)']);
		clearLog();

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should allow parents to update around suspense boundary and unmount', async () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();

		/** @type {() => void} */
		let increment;
		function Counter() {
			const [count, setCount] = useState(0);
			increment = () => setCount(c => c + 1);
			return (
				<Fragment>
					<div>Count: {count}</div>
					<Suspense>
						<Lazy />
					</Suspense>
				</Fragment>
			);
		}

		let hide;
		function Component() {
			const [show, setShow] = useState(true);
			hide = () => setShow(false);

			return show ? <Counter /> : null;
		}

		hydrate(<Component />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Count: 0</div><div>Hello</div>');
		// Re: DOM OP below - Known issue with hydrating merged text nodes
		expect(getLog()).to.deep.equal(['<div>Count: .appendChild(#text)']);
		clearLog();

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		await resolve(() => <div>Hello</div>);
		rerender();
		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		hide();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('should allow parents to update around suspense boundary and unmount before resolves', async () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';
		clearLog();

		const [Lazy] = createLazy();

		/** @type {() => void} */
		let increment;
		function Counter() {
			const [count, setCount] = useState(0);
			increment = () => setCount(c => c + 1);
			return (
				<Fragment>
					<div>Count: {count}</div>
					<Suspense>
						<Lazy />
					</Suspense>
				</Fragment>
			);
		}

		let hide;
		function Component() {
			const [show, setShow] = useState(true);
			hide = () => setShow(false);

			return show ? <Counter /> : null;
		}

		hydrate(<Component />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div>Count: 0</div><div>Hello</div>');
		// Re: DOM OP below - Known issue with hydrating merged text nodes
		expect(getLog()).to.deep.equal(['<div>Count: .appendChild(#text)']);
		clearLog();

		increment();
		rerender();

		expect(scratch.innerHTML).to.equal('<div>Count: 1</div><div>Hello</div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		hide();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('should allow parents to unmount before resolves', async () => {
		scratch.innerHTML = '<div>Count: 0</div><div>Hello</div>';

		const [Lazy] = createLazy();

		function Counter() {
			return (
				<Fragment>
					<div>Count: 0</div>
					<Suspense>
						<Lazy />
					</Suspense>
				</Fragment>
			);
		}

		let hide;
		function Component() {
			const [show, setShow] = useState(true);
			hide = () => setShow(false);

			return show ? <Counter /> : null;
		}

		hydrate(<Component />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do

		hide();
		rerender();
		expect(scratch.innerHTML).to.equal('');
	});

	it('should properly hydrate when there is DOM and Components between Suspense and suspender', () => {
		scratch.innerHTML = '<div><div>Hello</div></div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<div>
					<Fragment>
						<Lazy />
					</Fragment>
				</div>
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal('<div><div>Hello</div></div>');
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => <div>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div><div>Hello</div></div>');
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('should properly hydrate suspense with Fragment siblings', () => {
		const originalHtml = ul([li(0), li(1), li(2), li(3), li(4)]);

		const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

		scratch.innerHTML = originalHtml;
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<ul>
				<Fragment>
					<li onClick={listeners[0]}>0</li>
					<li onClick={listeners[1]}>1</li>
				</Fragment>
				<Suspense>
					<Lazy />
				</Suspense>
				<Fragment>
					<li onClick={listeners[3]}>3</li>
					<li onClick={listeners[4]}>4</li>
				</Fragment>
			</ul>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		expect(listeners[4]).not.toHaveBeenCalled();

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[4]).toHaveBeenCalledOnce();

		return resolve(() => (
			<Fragment>
				<li onClick={listeners[2]}>2</li>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(3)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[2]).toHaveBeenCalledOnce();

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[4]).toHaveBeenCalledTimes(2);
		});
	});

	it('should properly hydrate suspense with Component & Fragment siblings', () => {
		const originalHtml = ul([li(0), li(1), li(2), li(3), li(4)]);

		const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

		scratch.innerHTML = originalHtml;
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<List>
				<Fragment>
					<ListItem onClick={listeners[0]}>0</ListItem>
					<ListItem onClick={listeners[1]}>1</ListItem>
				</Fragment>
				<Suspense>
					<Lazy />
				</Suspense>
				<Fragment>
					<ListItem onClick={listeners[3]}>3</ListItem>
					<ListItem onClick={listeners[4]}>4</ListItem>
				</Fragment>
			</List>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		expect(listeners[4]).not.toHaveBeenCalled();

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[4]).toHaveBeenCalledOnce();

		return resolve(() => (
			<Fragment>
				<ListItem onClick={listeners[2]}>2</ListItem>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(3)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[2]).toHaveBeenCalledOnce();

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[4]).toHaveBeenCalledTimes(2);
		});
	});

	it('should suspend hydration with components with state and event listeners between suspender and Suspense', () => {
		let html = div([div('Count: 0'), div('Hello')]);
		scratch.innerHTML = html;
		clearLog();

		function Counter({ children }) {
			const [count, setCount] = useState(0);
			return (
				<div onClick={() => setCount(count + 1)}>
					<div>Count: {count}</div>
					{children}
				</div>
			);
		}

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Counter>
					<Lazy />
				</Counter>
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal(['<div>Count: .appendChild(#text)']);
		clearLog();

		scratch.firstElementChild.dispatchEvent(createEvent('click'));
		rerender();

		html = div([div('Count: 1'), div('Hello')]);
		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		const lazySpy = vi.fn();
		return resolve(() => <div onClick={lazySpy}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			const lazyDiv = scratch.firstChild.firstChild.nextSibling;
			expect(lazyDiv.textContent).to.equal('Hello');
			expect(lazySpy).not.toHaveBeenCalled();

			lazyDiv.dispatchEvent(createEvent('click'));
			rerender();

			expect(lazySpy).toHaveBeenCalledOnce();
		});
	});

	it('should maintain state of sibling components around suspender', () => {
		let html = [div('Count: 0'), div('Hello'), div('Count: 0')].join('');
		scratch.innerHTML = html;
		clearLog();

		function Counter() {
			const [count, setCount] = useState(0);
			return <div onClick={() => setCount(count + 1)}>Count: {count}</div>;
		}

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Counter />
				<Lazy />
				<Counter />
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([
			'<div>Count: .appendChild(#text)',
			'<div>Count: .appendChild(#text)'
		]);
		clearLog();

		// Update state of first Counter
		scratch.firstElementChild.dispatchEvent(createEvent('click'));
		rerender();

		html = [div('Count: 1'), div('Hello'), div('Count: 0')].join('');
		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		// Update state of second Counter
		scratch.lastElementChild.dispatchEvent(createEvent('click'));
		rerender();

		html = [div('Count: 1'), div('Hello'), div('Count: 1')].join('');
		expect(scratch.innerHTML).to.equal(html);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		const lazySpy = vi.fn();
		return resolve(() => <div onClick={lazySpy}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			const lazyDiv = scratch.firstChild.nextSibling;
			expect(lazyDiv.textContent).to.equal('Hello');
			expect(lazySpy).not.toHaveBeenCalled();

			lazyDiv.dispatchEvent(createEvent('click'));
			rerender();

			expect(lazySpy).toHaveBeenCalledOnce();
		});
	});

	it('should allow component to re-suspend using normal suspension mechanics after initial suspended hydration resumes', () => {
		const originalHtml = [div('a'), div('b1'), div('c')].join('');
		scratch.innerHTML = originalHtml;
		clearLog();

		const bOnClickSpy = vi.fn();
		const cOnClickSpy = vi.fn();

		const [Lazy, resolve] = createLazy();

		/** @type {(c: React.JSX.Element) => void} */
		let setChild;
		function App() {
			// Mimic some state that may cause a suspend
			const [child, setChildInternal] = useState(<Lazy />);
			setChild = setChildInternal;

			return (
				<Suspense fallback={<div>fallback</div>}>
					<div>a</div>
					{child}
					<div onClick={cOnClickSpy}>c</div>
				</Suspense>
			);
		}

		// Validate initial hydration suspend resumes (initial markup stays the same
		// and event listeners attached)
		hydrate(<App />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML, 'initial HTML').to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		scratch.lastChild.dispatchEvent(createEvent('click'));
		rerender();
		expect(cOnClickSpy).toHaveBeenCalledOnce();

		return resolve(() => <div onClick={bOnClickSpy}>b1</div>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML, 'hydration resumes').to.equal(originalHtml);
				expect(getLog()).to.deep.equal([]);
				clearLog();

				scratch.firstChild.nextSibling.dispatchEvent(createEvent('click'));
				rerender();
				expect(bOnClickSpy).toHaveBeenCalledOnce();

				// suspend again and validate normal suspension works (fallback renders
				// and result)
				const [Lazy2, resolve2] = createLazy();
				setChild(<Lazy2 />);
				rerender();

				expect(scratch.innerHTML, 'second suspend').to.equal(div('fallback'));
				expect(getLog()).to.deep.equal([
					'<div>b1.remove()',
					'<div>a.remove()',
					'<div>c.remove()',
					'<div>.appendChild(#text)',
					'<div>.appendChild(<div>fallback)'
				]);
				clearLog();

				return resolve2(() => <div onClick={bOnClickSpy}>b2</div>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML, 'second suspend resumes').to.equal(
					[div('a'), div('b2'), div('c')].join('')
				);
				expect(getLog()).to.deep.equal([
					'<div>fallback.appendChild(<div>a)',
					'<div>fallback.remove()',
					'<div>a.appendChild(<div>a)',
					'<div>.appendChild(#text)',
					'<div>a.appendChild(<div>b2)',
					'<div>ab2.appendChild(<div>c)'
				]);

				scratch.firstChild.nextSibling.dispatchEvent(createEvent('click'));
				expect(bOnClickSpy).toHaveBeenCalledTimes(2);

				scratch.lastChild.dispatchEvent(createEvent('click'));
				expect(cOnClickSpy).toHaveBeenCalledTimes(2);
			});
	});

	it('should preserve component state when re-suspending after streaming-style hydration', async () => {
		scratch.innerHTML =
			'<!--$s:2--><div><p>Hello</p><button>Count: 0</button></div><!--/$s:2-->';

		let promise = Promise.resolve('Hello');
		let increment;
		function App() {
			const message = use(promise);
			const [count, setCount] = useState(0);
			increment = () => setCount(value => value + 1);
			return (
				<div>
					<p>{message}</p>
					<button>Count: {count}</button>
				</div>
			);
		}

		hydrate(
			<Suspense fallback={<div>Fallback</div>}>
				<App />
			</Suspense>,
			scratch
		);
		await promise;
		rerender();
		rerender();

		increment();
		rerender();
		expect(scratch.querySelector('button').textContent).to.equal('Count: 1');

		promise = Promise.resolve('Hello');
		increment();
		rerender();
		await promise;
		rerender();
		rerender();

		expect(scratch.querySelector('button').textContent).to.equal('Count: 2');
	});

	it('should preserve component state when re-suspending after client render', async () => {
		let promise = Promise.resolve('Hello');
		let increment;
		function App() {
			use(promise);
			const [count, setCount] = useState(0);
			increment = () => setCount(value => value + 1);
			return <button>Count: {count}</button>;
		}

		render(
			<Suspense fallback="Fallback">
				<App />
			</Suspense>,
			scratch
		);
		await promise;
		rerender();
		rerender();
		increment();
		rerender();
		expect(scratch.textContent).to.equal('Count: 1');

		promise = Promise.resolve('Hello');
		increment();
		rerender();
		await promise;
		rerender();
		rerender();
		expect(scratch.textContent).to.equal('Count: 2');
	});

	it('should correctly hydrate and rerender a memoized lazy data loader', () => {
		const originalHtml = '<p>Count: 5</p>';
		scratch.innerHTML = originalHtml;

		const [useSuspenseLoader, resolve] = createSuspenseLoader();

		/** @type {() => void} */
		let increment;
		const DataLoader = memo(function DataLoader() {
			const initialCount = useSuspenseLoader();
			const [count, setCount] = useState(initialCount);
			increment = () => setCount(c => c + 1);

			return <p>Count: {count}</p>;
		});

		function App() {
			return (
				<Suspense>
					<DataLoader />
				</Suspense>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		expect(scratch.innerHTML).to.equal(originalHtml);

		return resolve(5).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<p>Count: 5</p>');

			increment();
			rerender();

			expect(scratch.innerHTML).to.equal('<p>Count: 6</p>');
		});
	});

	it('should properly hydrate suspense when resolves to a Fragment', () => {
		const originalHtml = ul([
			li(0),
			li(1),
			'<!--$s-->',
			li(2),
			li(3),
			'<!--/$s-->',
			li(4),
			li(5)
		]);

		const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

		scratch.innerHTML = originalHtml;
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<List>
				<Fragment>
					<ListItem onClick={listeners[0]}>0</ListItem>
					<ListItem onClick={listeners[1]}>1</ListItem>
				</Fragment>
				<Suspense>
					<Lazy />
				</Suspense>
				<Fragment>
					<ListItem onClick={listeners[4]}>4</ListItem>
					<ListItem onClick={listeners[5]}>5</ListItem>
				</Fragment>
			</List>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(getLog()).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(listeners[5]).not.toHaveBeenCalled();

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[5]).toHaveBeenCalledOnce();

		return resolve(() => (
			<Fragment>
				<ListItem onClick={listeners[2]}>2</ListItem>
				<ListItem onClick={listeners[3]}>3</ListItem>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(4)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[3]).toHaveBeenCalledOnce();

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[5]).toHaveBeenCalledTimes(2);
		});
	});

	it('should properly hydrate suspense when resolves to a Fragment without children', () => {
		const originalHtml = ul([
			li(0),
			li(1),
			'<!--$s-->',
			'<!--/$s-->',
			li(2),
			li(3)
		]);

		const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];

		scratch.innerHTML = originalHtml;
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<List>
				<Fragment>
					<ListItem onClick={listeners[0]}>0</ListItem>
					<ListItem onClick={listeners[1]}>1</ListItem>
				</Fragment>
				<Suspense>
					<Lazy />
				</Suspense>
				<Fragment>
					<ListItem onClick={listeners[2]}>2</ListItem>
					<ListItem onClick={listeners[3]}>3</ListItem>
				</Fragment>
			</List>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(getLog()).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(listeners[3]).not.toHaveBeenCalled();

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[3]).toHaveBeenCalledOnce();

		return resolve(() => null).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(2)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[1]).toHaveBeenCalledOnce();

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[3]).toHaveBeenCalledTimes(2);
		});
	});

	it('Should hydrate a fragment with multiple children correctly', () => {
		scratch.innerHTML = '<!--$s--><div>Hello</div><div>World!</div><!--/$s-->';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><div>Hello</div><div>World!</div><!--/$s-->'
		);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => (
			<>
				<div>Hello</div>
				<div>World!</div>
			</>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<!--$s--><div>Hello</div><div>World!</div><!--/$s-->'
			);
			expect(getLog()).to.deep.equal([]);

			clearLog();
		});
	});

	it('Should hydrate a fragment with no children correctly', () => {
		scratch.innerHTML = '<!--$s--><!--/$s--><div>Hello world</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<>
				<Suspense>
					<Lazy />
				</Suspense>
				<div>Hello world</div>
			</>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><!--/$s--><div>Hello world</div>'
		);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(() => null).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<!--$s--><!--/$s--><div>Hello world</div>'
			);
			expect(getLog()).to.deep.equal([]);

			clearLog();
		});
	});

	it('Should hydrate a fragment with no children correctly deeply', () => {
		scratch.innerHTML =
			'<!--$s--><!--$s--><!--/$s--><!--/$s--><div>Hello world</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		const [Lazy2, resolve2] = createLazy();
		hydrate(
			<>
				<Suspense>
					<Lazy>
						<Suspense>
							<Lazy2 />
						</Suspense>
					</Lazy>
				</Suspense>
				<div>Hello world</div>
			</>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><!--$s--><!--/$s--><!--/$s--><div>Hello world</div>'
		);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(p => p.children).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<!--$s--><!--$s--><!--/$s--><!--/$s--><div>Hello world</div>'
			);
			expect(getLog()).to.deep.equal([]);

			clearLog();
			return resolve2(() => null).then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<!--$s--><!--$s--><!--/$s--><!--/$s--><div>Hello world</div>'
				);
				expect(getLog()).to.deep.equal([]);

				clearLog();
			});
		});
	});

	it('Should hydrate a fragment with multiple children correctly deeply', () => {
		scratch.innerHTML =
			'<!--$s--><!--$s--><p>I am</p><span>Fragment</span><!--/$s--><!--/$s--><div>Hello world</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		const [Lazy2, resolve2] = createLazy();
		hydrate(
			<>
				<Suspense>
					<Lazy>
						<Suspense>
							<Lazy2 />
						</Suspense>
					</Lazy>
				</Suspense>
				<div>Hello world</div>
			</>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><!--$s--><p>I am</p><span>Fragment</span><!--/$s--><!--/$s--><div>Hello world</div>'
		);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		return resolve(p => p.children).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<!--$s--><!--$s--><p>I am</p><span>Fragment</span><!--/$s--><!--/$s--><div>Hello world</div>'
			);
			expect(getLog()).to.deep.equal([]);

			clearLog();
			return resolve2(() => (
				<>
					<p>I am</p>
					<span>Fragment</span>
				</>
			)).then(() => {
				rerender();
				expect(scratch.innerHTML).to.equal(
					'<!--$s--><!--$s--><p>I am</p><span>Fragment</span><!--/$s--><!--/$s--><div>Hello world</div>'
				);
				expect(getLog()).to.deep.equal([]);

				clearLog();
			});
		});
	});

	it('should properly hydrate suspense when resolves to a Fragment with $s:id markers', () => {
		const originalHtml = ul([
			li(0),
			li(1),
			'<!--$s:0-->',
			li(2),
			li(3),
			'<!--/$s:0-->',
			li(4),
			li(5)
		]);

		const listeners = [vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn()];

		scratch.innerHTML = originalHtml;
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<List>
				<Fragment>
					<ListItem onClick={listeners[0]}>0</ListItem>
					<ListItem onClick={listeners[1]}>1</ListItem>
				</Fragment>
				<Suspense>
					<Lazy />
				</Suspense>
				<Fragment>
					<ListItem onClick={listeners[4]}>4</ListItem>
					<ListItem onClick={listeners[5]}>5</ListItem>
				</Fragment>
			</List>,
			scratch
		);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(getLog()).to.deep.equal([]);
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(listeners[5]).not.toHaveBeenCalled();

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[5]).toHaveBeenCalledOnce();

		return resolve(() => (
			<Fragment>
				<ListItem onClick={listeners[2]}>2</ListItem>
				<ListItem onClick={listeners[3]}>3</ListItem>
			</Fragment>
		)).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(4)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[3]).toHaveBeenCalledOnce();

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[5]).toHaveBeenCalledTimes(2);
		});
	});

	it('should keep its own markers when re-rendered by a parent while suspended during hydration', async () => {
		const originalHtml =
			'<!--$s:0--><p>outer</p><!--$s:1--><p>nested</p><!--/$s:1--><!--/$s:0--><div>0</div>';
		scratch.innerHTML = originalHtml;
		const outer = scratch.childNodes[1];
		const nested = scratch.childNodes[3];
		clearLog();

		const [LazyOuter, resolveOuter] = createLazy();
		const [LazyNested, resolveNested] = createLazy();

		let update;
		function App() {
			const [count, setCount] = useState(0);
			update = () => setCount(count + 1);
			return (
				<>
					<Suspense>
						<LazyOuter />
					</Suspense>
					<div>{count}</div>
				</>
			);
		}

		hydrate(<App />, scratch);
		rerender();

		update();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<!--$s:0--><p>outer</p><!--$s:1--><p>nested</p><!--/$s:1--><!--/$s:0--><div>1</div>'
		);
		clearLog();

		await resolveOuter(() => (
			<>
				<p>outer</p>
				<Suspense>
					<LazyNested />
				</Suspense>
			</>
		));
		rerender();
		await resolveNested(() => <p>nested</p>);
		rerender();

		expect(scratch.innerHTML).to.equal(
			'<!--$s:0--><p>outer</p><!--$s:1--><p>nested</p><!--/$s:1--><!--/$s:0--><div>1</div>'
		);
		expect(scratch.childNodes[1]).to.equal(outer);
		expect(scratch.childNodes[3]).to.equal(nested);
		expect(getLog()).to.deep.equal([]);
	});

	it('should use updated DOM when stream patcher replaces content before suspend resolves', () => {
		scratch.innerHTML =
			'<!--$s:0--><span>Loading</span><!--/$s:0--><div>after</div>';
		clearLog();

		const [Lazy, resolve] = createLazy();
		hydrate(
			<>
				<Suspense>
					<Lazy />
				</Suspense>
				<div>after</div>
			</>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<!--$s:0--><span>Loading</span><!--/$s:0--><div>after</div>'
		);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		// Simulate stream patcher: replace fallback content while anchor comments
		// remain. The deferred restoration should use the current DOM, not stale
		// references to the removed <span>.
		const endMarker = scratch.childNodes[2]; // <!--/$s:0-->
		scratch.removeChild(scratch.childNodes[1]); // remove <span>Loading</span>
		const resolved = document.createElement('div');
		resolved.textContent = 'Resolved';
		scratch.insertBefore(resolved, endMarker);

		expect(scratch.innerHTML).to.equal(
			'<!--$s:0--><div>Resolved</div><!--/$s:0--><div>after</div>'
		);
		// Clear the stream patcher's own DOM ops before asserting on rerender
		clearLog();

		return resolve(() => <div>Resolved</div>).then(() => {
			rerender();
			// Should match the stream-patched <div>Resolved</div>, no extra DOM ops
			expect(scratch.innerHTML).to.equal(
				'<!--$s:0--><div>Resolved</div><!--/$s:0--><div>after</div>'
			);
			expect(getLog()).to.deep.equal([]);
			clearLog();
		});
	});

	it('Should not crash when oldVNode._children is null during shouldComponentUpdate optimization', () => {
		const originalHtml = '<div>Hello</div>';
		scratch.innerHTML = originalHtml;
		clearLog();

		class ErrorBoundary extends React.Component {
			constructor(props) {
				super(props);
				this.state = { hasError: false };
			}

			static getDerivedStateFromError() {
				return { hasError: true };
			}

			render() {
				return this.props.children;
			}
		}

		const [Lazy, resolve] = createLazy();
		function App() {
			return (
				<Suspense>
					<ErrorBoundary>
						<Lazy />
					</ErrorBoundary>
				</Suspense>
			);
		}

		hydrate(<App />, scratch);
		rerender(); // Flush rerender queue to mimic what preact will really do
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
		clearLog();

		let i = 0;
		class ThrowOrRender extends React.Component {
			shouldComponentUpdate() {
				return i === 0;
			}
			render() {
				if (i === 0) {
					i++;
					throw new Error('Test error');
				}
				return <div>Hello</div>;
			}
		}

		return resolve(ThrowOrRender).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			clearLog();
		});
	});

	it('should mount a portal fresh while a sibling suspends during hydration', async () => {
		scratch.innerHTML = '<p>a</p><p>lazy</p>';
		const portalRoot = document.createElement('div');
		portalRoot.innerHTML = '<em>existing</em>';
		document.body.appendChild(portalRoot);

		const [Lazy, resolve] = createLazy();
		function App() {
			return (
				<Suspense fallback={<div>fallback</div>}>
					<p>a</p>
					{createPortal(<p>b</p>, portalRoot)}
					<Lazy />
				</Suspense>
			);
		}

		try {
			hydrate(<App />, scratch);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>a</p><p>lazy</p>');
			expect(portalRoot.innerHTML).to.equal('<em>existing</em><p>b</p>');

			await resolve(() => <p>lazy</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>a</p><p>lazy</p>');
			expect(portalRoot.innerHTML).to.equal('<em>existing</em><p>b</p>');
		} finally {
			portalRoot.remove();
		}
	});

	describe('unmounting a suspender while a sibling is pending', () => {
		let setShow, setKey;
		const Box = ({ children }) => {
			const [show, set] = useState(true);
			setShow = set;
			return <div>{show ? children : null}</div>;
		};
		// Same DOM parent as its sibling: restoring suspenders that live in
		// different DOM parents is a separate issue.
		const Keyed = ({ Lazy }) => {
			const [key, set] = useState(1);
			setKey = set;
			return <Lazy key={key} />;
		};

		it('should not re-render a resolved suspender unmounted before the boundary completes', async () => {
			const [LazyA, resolveA] = createLazy();
			const [LazyB, resolveB] = createLazy();
			scratch.innerHTML = '<div><p>a</p></div><p>b</p>';
			hydrate(
				<Suspense fallback={null}>
					<Box>
						<LazyA />
					</Box>
					<LazyB />
				</Suspense>,
				scratch
			);
			rerender();
			await resolveA(() => <p>a</p>);
			rerender();
			setShow(false);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');

			await resolveB(() => <p>b</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');
		});

		it('should not re-render a pending suspender unmounted before the boundary completes', async () => {
			const [LazyA, resolveA] = createLazy();
			const [LazyB, resolveB] = createLazy();
			scratch.innerHTML = '<div><p>a</p></div><p>b</p>';
			hydrate(
				<Suspense fallback={null}>
					<Box>
						<LazyA />
					</Box>
					<LazyB />
				</Suspense>,
				scratch
			);
			rerender();
			setShow(false);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');

			await resolveB(() => <p>b</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');

			await resolveA(() => <p>a</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');
			setShow(true);
			rerender();
			expect(scratch.innerHTML).to.equal('<div><p>a</p></div><p>b</p>');
		});

		it('should complete the boundary when the last pending suspender unmounts', async () => {
			const [LazyA, resolveA] = createLazy();
			const [LazyB, resolveB] = createLazy();
			scratch.innerHTML = '<div><p>a</p></div><p>b</p>';
			hydrate(
				<Suspense fallback={null}>
					<Box>
						<LazyA />
					</Box>
					<LazyB />
				</Suspense>,
				scratch
			);
			rerender();
			await resolveB(() => <p>b</p>);
			rerender();
			setShow(false);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');

			await resolveA(() => <p>a</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<div></div><p>b</p>');
		});

		it('should render a new instance mounted in place of an unmounted suspender', async () => {
			const [LazyA, resolveA] = createLazy();
			const [LazyB, resolveB] = createLazy();
			scratch.innerHTML = '<p>a</p><p>b</p>';
			hydrate(
				<Suspense fallback={null}>
					<Keyed Lazy={LazyA} />
					<LazyB />
				</Suspense>,
				scratch
			);
			rerender();
			setKey(2);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>b</p>');

			await resolveA(() => <p>a</p>);
			rerender();
			await resolveB(() => <p>b</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>a</p><p>b</p>');
		});

		it('should render a resolved new instance mounted in place of an unmounted suspender', async () => {
			const [LazyA, resolveA] = createLazy();
			const [LazyB, resolveB] = createLazy();
			scratch.innerHTML = '<p>a</p><p>b</p>';
			hydrate(
				<Suspense fallback={null}>
					<Keyed Lazy={LazyA} />
					<LazyB />
				</Suspense>,
				scratch
			);
			rerender();
			await resolveA(() => <p>a</p>);
			rerender();
			setKey(2);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>a</p><p>b</p>');

			await resolveB(() => <p>b</p>);
			rerender();
			expect(scratch.innerHTML).to.equal('<p>a</p><p>b</p>');
		});
	});

	it('should give ids inside a boundary the same value whenever it resolves', async () => {
		const Id = () => <input id={useId()} />;
		const [Lazy, resolve] = createLazy();
		const App = ({ Inner }) => (
			<Fragment>
				<Id />
				<Suspense fallback={<i>f</i>}>
					<Inner />
				</Suspense>
				<Id />
			</Fragment>
		);
		const ids = el => [...el.querySelectorAll('input')].map(i => i.id);

		const other = document.createElement('div');
		render(<App Inner={Id} />, other);

		render(<App Inner={Lazy} />, scratch);
		await resolve(Id);
		rerender();
		expect(ids(scratch)).to.deep.equal(ids(other));
	});
});

describe('suspense hydration resuming into mismatched server DOM', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should remove server-rendered nodes the resumed boundary does not claim', async () => {
		scratch.innerHTML = '<!--$s--><section>About</section><!--/$s-->';

		const [Lazy, resolve] = createLazy();
		hydrate(
			<Suspense>
				<Lazy />
			</Suspense>,
			scratch
		);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><section>About</section><!--/$s-->'
		);

		await resolve(() => <article>User</article>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<!--$s--><article>User</article><!--/$s-->'
		);
	});
});

describe('suspense hydration owning a streamed range', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should remove the whole range when unmounted while suspended', async () => {
		scratch.innerHTML =
			'<main><!--$s--><p>a</p><p>b</p><!--/$s--><footer>f</footer></main>';
		const footer = scratch.querySelector('footer');
		const [Lazy, resolve] = createLazy();
		let leave;
		function App() {
			const [left, setLeft] = useState(false);
			leave = () => setLeft(true);
			return (
				<main>
					{left ? (
						<h2>gone</h2>
					) : (
						<Suspense>
							<Lazy />
						</Suspense>
					)}
					<footer>f</footer>
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		leave();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>gone</h2><footer>f</footer></main>'
		);
		expect(scratch.querySelector('footer')).to.equal(footer);

		await resolve(() => <p>resolved</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>gone</h2><footer>f</footer></main>'
		);
	});

	it('should remove the whole range when unmounted after re-suspending', async () => {
		scratch.innerHTML = '<main><!--$s--><p>a</p><p>b</p><!--/$s--></main>';
		const [Lazy] = createLazy();
		let step;
		function App() {
			const [n, setN] = useState(0);
			step = () => setN(n => n + 1);
			return (
				<main>
					{n < 2 ? (
						<Suspense>
							<Lazy n={n} />
						</Suspense>
					) : (
						<h2>gone</h2>
					)}
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		step();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><!--$s--><p>a</p><p>b</p><!--/$s--></main>'
		);
		step();
		rerender();
		expect(scratch.innerHTML).to.equal('<main><h2>gone</h2></main>');
	});

	it('should remove nested ranges with their suspended owner and leave sibling ranges', async () => {
		scratch.innerHTML =
			'<main><input><!--$s--><p>root</p><!--/$s--><!--$s--><p>route</p><!--$s--><p>nested</p><!--/$s--><!--/$s--></main>';
		const input = scratch.querySelector('input');
		const [RootLazy, resolveRoot] = createLazy();
		const [RouteLazy, resolveRoute] = createLazy();
		let leave;
		function Route() {
			return (
				<Suspense>
					<RouteLazy />
				</Suspense>
			);
		}
		function App() {
			const [left, setLeft] = useState(false);
			leave = () => setLeft(true);
			return (
				<main>
					<input />
					<Suspense>
						<RootLazy />
					</Suspense>
					{left ? <h2>destination</h2> : <Route />}
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		input.value = 'draft';
		input.focus();
		leave();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><input><!--$s--><p>root</p><!--/$s--><h2>destination</h2></main>'
		);
		expect(scratch.querySelector('input')).to.equal(input);
		expect(input.value).to.equal('draft');
		expect(document.activeElement).to.equal(input);

		await resolveRoute(() => <p>route</p>);
		await resolveRoot(() => <p>root resolved</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><input><!--$s--><p>root resolved</p><!--/$s--><h2>destination</h2></main>'
		);
	});

	it('should mount a sibling after a range that re-suspended', async () => {
		scratch.innerHTML = '<main><!--$s--><p>server</p><!--/$s--></main>';
		const [Lazy, resolve] = createLazy();
		let set;
		function App() {
			const [label, setLabel] = useState(null);
			set = setLabel;
			return (
				<main>
					<Suspense>
						<Lazy />
					</Suspense>
					{label && <h2>{label}</h2>}
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		set('after');
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><!--$s--><p>server</p><!--/$s--><h2>after</h2></main>'
		);
		const h2 = scratch.querySelector('h2');

		await resolve(() => <p>resolved</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><!--$s--><p>resolved</p><!--/$s--><h2>after</h2></main>'
		);
		expect(scratch.querySelector('h2')).to.equal(h2);

		set('updated');
		rerender();
		expect(scratch.querySelector('h2').textContent).to.equal('updated');
	});

	it('should mount a sibling before a suspended range', async () => {
		scratch.innerHTML = '<main><!--$s--><p>server</p><!--/$s--></main>';
		const [Lazy, resolve] = createLazy();
		let show;
		function App() {
			const [shown, setShown] = useState(0);
			show = () => setShown(n => n + 1);
			return (
				<main>
					{shown > 0 && <h2>first</h2>}
					{shown > 1 && <h3>second</h3>}
					<Suspense>
						<Lazy />
					</Suspense>
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		show();
		rerender();
		show();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>first</h2><h3>second</h3><!--$s--><p>server</p><!--/$s--></main>'
		);

		await resolve(() => <p>resolved</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>first</h2><h3>second</h3><!--$s--><p>resolved</p><!--/$s--></main>'
		);
	});

	it('should mount several siblings at once before a suspended range', async () => {
		scratch.innerHTML = '<main><!--$s--><p>server</p><!--/$s--></main>';
		const [Lazy, resolve] = createLazy();
		let show;
		function App() {
			const [shown, setShown] = useState(false);
			show = () => setShown(true);
			return (
				<main>
					{shown && <h2>first</h2>}
					{shown && <h3>second</h3>}
					<Suspense>
						<Lazy />
					</Suspense>
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		show();
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>first</h2><h3>second</h3><!--$s--><p>server</p><!--/$s--></main>'
		);

		await resolve(() => <p>resolved</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><h2>first</h2><h3>second</h3><!--$s--><p>resolved</p><!--/$s--></main>'
		);
	});

	it('should resume an empty range in place', async () => {
		scratch.innerHTML =
			'<main><h2>before</h2><!--$s--><!--/$s--><span>after</span></main>';
		const [Lazy, resolve] = createLazy();
		hydrate(
			<main>
				<h2>before</h2>
				<Suspense>
					<Lazy />
				</Suspense>
				<span>after</span>
			</main>,
			scratch
		);
		rerender();

		await resolve(() => <p>late</p>);
		rerender();
		expect(scratch.textContent).to.equal('beforelateafter');
	});

	it('should drop its markers when a resolved boundary unmounts', async () => {
		scratch.innerHTML =
			'<main><!--$s:0--><p>server</p><!--/$s:0--><span>s</span></main>';
		const [Lazy, resolve] = createLazy();
		let hide;
		function App() {
			const [shown, setShown] = useState(true);
			hide = () => setShown(false);
			return (
				<main>
					{shown && (
						<Suspense>
							<Lazy />
						</Suspense>
					)}
					<span>s</span>
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		await resolve(() => <p>server</p>);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<main><!--$s:0--><p>server</p><!--/$s:0--><span>s</span></main>'
		);

		hide();
		rerender();
		expect(scratch.innerHTML).to.equal('<main><span>s</span></main>');
	});

	it('should only drop the markers of a resolved boundary that moved', async () => {
		scratch.innerHTML =
			'<main><!--$s--><p>a</p><!--/$s--><!--$s--><p>b</p><!--/$s--><!--$s--><p>c</p><!--/$s--></main>';
		const lazies = {};
		const resolvers = {};
		for (const key of ['a', 'b', 'c']) {
			[lazies[key], resolvers[key]] = createLazy();
		}
		let setOrder;
		function App() {
			const [order, set] = useState(['a', 'b', 'c']);
			setOrder = set;
			return (
				<main>
					{order.map(key => (
						<Suspense key={key}>{createElement(lazies[key])}</Suspense>
					))}
				</main>
			);
		}

		hydrate(<App />, scratch);
		rerender();
		for (const key of ['a', 'b', 'c']) await resolvers[key](() => <p>{key}</p>);
		rerender();

		// Content moves without its markers, so markers can end up around a
		// sibling's content.
		setOrder(['c', 'a', 'b']);
		rerender();
		expect(scratch.textContent).to.equal('cab');
		setOrder(['c', 'b']);
		rerender();
		expect(scratch.textContent).to.equal('cb');
		setOrder([]);
		rerender();
		expect(scratch.innerHTML).to.equal('<main></main>');
	});
});

describe('streamed boundary ranges', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender, frames;

	const tick = () => new Promise(resolve => setTimeout(resolve));

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		frames = [];
	});

	afterEach(() => {
		teardown(scratch);
		frames.forEach(frame => frame.remove());
	});

	/**
	 * A document that is still loading, like a page the server is streaming.
	 * @returns {{ doc: Document, root: HTMLElement }}
	 */
	function loadingDoc(markup) {
		const frame = document.createElement('iframe');
		document.body.appendChild(frame);
		frames.push(frame);
		const doc = frame.contentDocument;
		doc.open();
		doc.write('<!DOCTYPE html><body><div id="root">' + markup);
		return { doc, root: doc.getElementById('root') };
	}

	function allNodes(node, out = []) {
		for (node = node.firstChild; node; node = node.nextSibling) {
			out.push(node);
			allNodes(node, out);
		}
		return out;
	}

	/** The first comment whose data starts with `data` */
	function comment(root, data) {
		return allNodes(root).find(n => n.nodeType == 8 && n.data.startsWith(data));
	}

	function commentData(root) {
		return allNodes(root)
			.filter(n => n.nodeType == 8)
			.map(n => n.data);
	}

	/** Do what the script that ends a streamed chunk does */
	function deliver(root, id, html, data = '$s=') {
		const open = comment(root, '$s?' + id);
		const close = comment(root, '/$s?' + id);
		const template = root.ownerDocument.createElement('template');
		template.innerHTML = html;
		const nodes = [...template.content.childNodes];
		while (open.nextSibling != close) open.nextSibling.remove();
		close.parentNode.insertBefore(template.content, close);
		open.data = data;
		open.__w();
		return nodes;
	}

	function Leaf({ id, log, onClick, children }) {
		useEffect(() => {
			log.push(id);
		}, []);
		return (
			<button id={id} onClick={onClick}>
				{children || id}
			</button>
		);
	}

	describe('$s= ranges', () => {
		it('should hydrate the children against the nodes in the range only', () => {
			scratch.innerHTML =
				'<div><p>a</p><!--$s=--><p>in</p><!--/$s--><p>after</p></div>';
			const [a, inside, after] = scratch.querySelectorAll('p');

			hydrate(
				<div>
					<p>a</p>
					<Suspense>
						<p>in</p>
					</Suspense>
					<p>after</p>
				</div>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<div><p>a</p><p>in</p><p>after</p></div>'
			);
			const now = scratch.querySelectorAll('p');
			expect([...now]).to.deep.equal([a, inside, after]);
		});

		it('should not adopt nodes after the range when the boundary renders more', () => {
			scratch.innerHTML =
				'<div><!--$s=--><p>in</p><!--/$s--><p>after</p></div>';
			const [inside, after] = scratch.querySelectorAll('p');

			hydrate(
				<div>
					<Suspense>
						<p>in</p>
						<p>extra</p>
					</Suspense>
					<p>after</p>
				</div>,
				scratch
			);
			rerender();

			const now = [...scratch.querySelectorAll('p')];
			expect(now.map(p => p.textContent).sort()).to.deep.equal([
				'after',
				'extra',
				'in'
			]);
			expect(now.find(p => p.textContent == 'in')).to.equal(inside);
			expect(now.find(p => p.textContent == 'after')).to.equal(after);
		});

		it('should not let the siblings adopt nodes of the range when the boundary renders less', () => {
			scratch.innerHTML =
				'<div><!--$s=--><p>one</p><p>two</p><!--/$s--><p>after</p></div>';
			const [one, , after] = scratch.querySelectorAll('p');

			hydrate(
				<div>
					<Suspense>
						<p>one</p>
					</Suspense>
					<p>after</p>
				</div>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal('<div><p>one</p><p>after</p></div>');
			const now = scratch.querySelectorAll('p');
			expect(now[0]).to.equal(one);
			expect(now[1]).to.equal(after);
		});

		it('should remove both markers once the boundary hydrated', () => {
			scratch.innerHTML = '<div><!--$s=--><p>in</p><!--/$s--></div>';
			hydrate(
				<div>
					<Suspense>
						<p>in</p>
					</Suspense>
				</div>,
				scratch
			);
			rerender();
			expect(commentData(scratch)).to.deep.equal([]);
		});
	});

	describe('a child suspends while hydrating', () => {
		const orders = {
			first: ['L', 'a', 'b'],
			middle: ['a', 'L', 'b'],
			last: ['a', 'b', 'L']
		};

		Object.keys(orders).forEach(where => {
			it(`should keep the range as sent and hydrate it later when the lazy child is ${where}`, async () => {
				const order = orders[where];
				scratch.innerHTML =
					'<main><button id="pre">pre</button><!--$s=-->' +
					order.map(id => `<button id="${id}">${id}</button>`).join('') +
					'<!--/$s--><button id="post">post</button></main>';
				const sent = scratch.innerHTML;
				const nodes = [...scratch.querySelectorAll('button')];
				const [Lazy, resolve] = createLazy();
				const log = [];
				const clicks = [];
				const leaf = id => (
					<Leaf key={id} id={id} log={log} onClick={() => clicks.push(id)} />
				);

				act(() => {
					hydrate(
						<main>
							{leaf('pre')}
							<Suspense>
								{order.map(id => (id == 'L' ? <Lazy key={id} /> : leaf(id)))}
							</Suspense>
							{leaf('post')}
						</main>,
						scratch
					);
				});

				expect(scratch.innerHTML).to.equal(sent);
				expect([...scratch.querySelectorAll('button')]).to.deep.equal(nodes);
				expect(log.sort()).to.deep.equal(['post', 'pre']);
				scratch.querySelector('#pre').click();
				scratch.querySelector('#post').click();
				expect(clicks).to.deep.equal(['pre', 'post']);

				await act(async () => {
					await resolve(() => leaf('L'));
					await tick();
				});

				expect(scratch.innerHTML).to.equal(
					sent.replace('<!--$s=-->', '').replace('<!--/$s-->', '')
				);
				expect([...scratch.querySelectorAll('button')]).to.deep.equal(nodes);
				expect(log.sort()).to.deep.equal(['L', 'a', 'b', 'post', 'pre']);
				clicks.length = 0;
				scratch.querySelectorAll('button').forEach(b => b.click());
				expect(clicks.sort()).to.deep.equal(['L', 'a', 'b', 'post', 'pre']);
			});
		});

		it('should keep the range as sent when the lazy child is deep inside elements', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><section><div><button id="a">a</button><span><b id="l">l</b></span></div></section><button id="b">b</button><!--/$s--></main>';
			const sent = scratch.innerHTML;
			const nodes = allNodes(scratch);
			const [Lazy, resolve] = createLazy();
			const log = [];

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<section>
								<div>
									<Leaf id="a" log={log} />
									<span>
										<Lazy />
									</span>
								</div>
							</section>
							<Leaf id="b" log={log} />
						</Suspense>
					</main>,
					scratch
				);
			});
			expect(scratch.innerHTML).to.equal(sent);
			expect(allNodes(scratch)).to.deep.equal(nodes);
			expect(log).to.deep.equal([]);

			await act(async () => {
				await resolve(() => <b id="l">l</b>);
				await tick();
			});
			expect(scratch.innerHTML).to.equal(
				'<main><section><div><button id="a">a</button><span><b id="l">l</b></span></div></section><button id="b">b</button></main>'
			);
			expect(allNodes(scratch)).to.deep.equal(
				nodes.filter(n => n.nodeType != 8)
			);
			expect(log.sort()).to.deep.equal(['a', 'b']);
		});

		it('should keep the range as sent when the lazy child renders several roots', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><button id="a">a</button><i>1</i><i>2</i><i>3</i><!--/$s--></main>';
			const sent = scratch.innerHTML;
			const nodes = [...scratch.querySelectorAll('*')].slice(1);
			const [Lazy, resolve] = createLazy();
			const log = [];

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<Leaf id="a" log={log} />
							<Lazy />
						</Suspense>
					</main>,
					scratch
				);
			});
			expect(scratch.innerHTML).to.equal(sent);
			expect(log).to.deep.equal([]);

			await act(async () => {
				await resolve(() => (
					<>
						<i>1</i>
						<i>2</i>
						<i>3</i>
					</>
				));
				await tick();
			});
			expect(scratch.innerHTML).to.equal(
				'<main><button id="a">a</button><i>1</i><i>2</i><i>3</i></main>'
			);
			expect([...scratch.querySelectorAll('*')].slice(1)).to.deep.equal(nodes);
			expect(log).to.deep.equal(['a']);
		});

		it('should run effects of the siblings once and attach handlers when the lazy resolves', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><button id="a">a</button><button id="l">l</button><!--/$s--></main>';
			const [Lazy, resolve] = createLazy();
			const log = [];
			const clicks = [];

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<Leaf id="a" log={log} onClick={() => clicks.push('a')} />
							<Lazy />
						</Suspense>
					</main>,
					scratch
				);
			});

			await act(async () => {
				await resolve(() => (
					<Leaf id="l" log={log} onClick={() => clicks.push('l')} />
				));
				await tick();
			});
			expect(log.sort()).to.deep.equal(['a', 'l']);
			scratch.querySelector('#a').click();
			scratch.querySelector('#l').click();
			expect(clicks).to.deep.equal(['a', 'l']);
		});
	});

	// The handler of the thrown away attempt is already attached to the server
	// node: clicking #a before the lazy resolves calls it.
	it('should not attach handlers to the range before the lazy resolves', () => {
		scratch.innerHTML =
			'<main><!--$s=--><button id="a">a</button><button id="l">l</button><!--/$s--></main>';
		const [Lazy] = createLazy();
		const clicks = [];
		act(() => {
			hydrate(
				<main>
					<Suspense>
						<button id="a" onClick={() => clicks.push('a')}>
							a
						</button>
						<Lazy />
					</Suspense>
				</main>,
				scratch
			);
		});
		scratch.querySelector('#a').click();
		expect(clicks).to.deep.equal([]);
	});

	describe('a render that is thrown away', () => {
		it('should call a callback ref once, and its cleanup on unmount only', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><p>a</p><button id="l">l</button><!--/$s--></main>';
			const [Lazy, resolve] = createLazy();
			const log = [];
			const ref = el => {
				log.push('ref:' + el.textContent);
				return () => log.push('cleanup');
			};
			let hide;
			function App() {
				const [shown, setShown] = useState(true);
				hide = () => setShown(false);
				return (
					<main>
						{shown && (
							<Suspense>
								<p ref={ref}>a</p>
								<Lazy />
							</Suspense>
						)}
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});
			expect(log).to.deep.equal([]);

			await act(async () => {
				await resolve(() => <button id="l">l</button>);
				await tick();
			});
			expect(log).to.deep.equal(['ref:a']);

			await act(async () => {
				hide();
			});
			expect(log).to.deep.equal(['ref:a', 'cleanup']);
		});

		it('should not leave a portal it mounted behind', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><p>a</p><button id="l">l</button><!--/$s--></main>';
			const portalRoot = document.createElement('div');
			scratch.appendChild(portalRoot);
			const [Lazy, resolve] = createLazy();

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<p>a</p>
							{createPortal(<b>modal</b>, portalRoot)}
							<Lazy />
						</Suspense>
					</main>,
					scratch.firstChild.parentNode
				);
			});
			expect(portalRoot.innerHTML).to.equal('');

			await act(async () => {
				await resolve(() => <button id="l">l</button>);
				await tick();
			});
			expect(portalRoot.innerHTML).to.equal('<b>modal</b>');
		});

		it('should not run the effect of an instance that rendered before the suspending sibling', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><button id="a">a</button><button id="l">l</button><!--/$s--></main>';
			const [Lazy, resolve] = createLazy();
			const log = [];
			let renders = 0;
			function A() {
				renders++;
				useEffect(() => {
					log.push('a');
				}, []);
				return <button id="a">a</button>;
			}

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<A />
							<Lazy />
						</Suspense>
					</main>,
					scratch
				);
			});
			expect(renders).to.equal(1);
			expect(log).to.deep.equal([]);

			await act(async () => {
				await resolve(() => <button id="l">l</button>);
				await tick();
			});
			expect(log).to.deep.equal(['a']);
		});

		it('should not render or touch the DOM when a thrown away instance sets state', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><button id="a">a</button><button id="l">l</button><!--/$s--></main>';
			const [Lazy, resolve] = createLazy();
			let renders = 0;
			let staleSet;
			function A() {
				const [text, setText] = useState('a');
				if (!staleSet) staleSet = setText;
				renders++;
				return <button id="a">{text}</button>;
			}

			act(() => {
				hydrate(
					<main>
						<Suspense>
							<A />
							<Lazy />
						</Suspense>
					</main>,
					scratch
				);
			});
			const sent = scratch.innerHTML;
			expect(renders).to.equal(1);

			staleSet('stale');
			rerender();
			expect(renders).to.equal(1);
			expect(scratch.innerHTML).to.equal(sent);

			await act(async () => {
				await resolve(() => <button id="l">l</button>);
				await tick();
			});
			expect(scratch.querySelector('#a').textContent).to.equal('a');
		});

		it('should not render or touch the DOM when a context update targets a thrown away instance', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><button id="a">a</button><button id="l">l</button><!--/$s--></main>';
			const [Lazy] = createLazy();
			const Ctx = createContext('one');
			let setValue;
			// Renders of the instance of the first attempt, a later attempt
			// makes new instances
			let instances = 0;
			let staleRenders = 0;
			function A() {
				const [id] = useState(() => ++instances);
				useContext(Ctx);
				if (id == 1) staleRenders++;
				return <button id="a">a</button>;
			}
			// The provider renders again when its value changes
			function Provider({ children }) {
				const [value, set] = useState('one');
				setValue = set;
				return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
			}
			function App() {
				return (
					<main>
						<Provider>
							<Suspense>
								<A />
								<Lazy />
							</Suspense>
						</Provider>
					</main>
				);
			}

			act(() => {
				hydrate(<App />, scratch);
			});
			const sent = scratch.innerHTML;
			expect(staleRenders).to.equal(1);

			setValue('two');
			rerender();
			expect(staleRenders).to.equal(1);
			expect(scratch.innerHTML).to.equal(sent);
		});
	});

	describe('shipped markers', () => {
		it('should hydrate a <!--$s--> range and keep its nodes', () => {
			scratch.innerHTML =
				'<div><p>a</p><!--$s--><p>in</p><!--/$s--><p>after</p></div>';
			const [a, inside, after] = scratch.querySelectorAll('p');

			hydrate(
				<div>
					<p>a</p>
					<Suspense>
						<p>in</p>
					</Suspense>
					<p>after</p>
				</div>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<div><p>a</p><p>in</p><p>after</p></div>'
			);
			expect([...scratch.querySelectorAll('p')]).to.deep.equal([
				a,
				inside,
				after
			]);
		});

		it('should hydrate an island <!--$s:id--> range and keep its nodes', () => {
			scratch.innerHTML = '<div><!--$s:4--><p>in</p><!--/$s:4--></div>';
			const inside = scratch.querySelector('p');

			hydrate(
				<div>
					<Suspense>
						<p>in</p>
					</Suspense>
				</div>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal('<div><p>in</p></div>');
			expect(scratch.querySelector('p')).to.equal(inside);
		});

		it('should client-render a shipped <!--$s!:id--> range and keep its siblings', () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s!:2--><i>fallback</i><!--/$s:2--><p>c</p></main>';
			const [a, c] = scratch.querySelectorAll('p');
			const fallback = scratch.querySelector('i');

			hydrate(
				<main>
					<p>a</p>
					<Suspense fallback={<i>fallback</i>}>
						<b>b</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<main><p>a</p><b>b</b><p>c</p></main>'
			);
			const [a2, c2] = scratch.querySelectorAll('p');
			expect(a2).to.equal(a);
			expect(c2).to.equal(c);
			expect(fallback.parentNode).to.equal(null);
		});
	});

	describe('$s! ranges', () => {
		it('should replace the server nodes with fresh ones at the right position', () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s!--><i>fallback</i><!--/$s--><p>c</p></main>';
			const [a, c] = scratch.querySelectorAll('p');
			const fallback = scratch.querySelector('i');

			hydrate(
				<main>
					<p>a</p>
					<Suspense fallback={<i>fallback</i>}>
						<b>b</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();

			expect(scratch.innerHTML).to.equal(
				'<main><p>a</p><b>b</b><p>c</p></main>'
			);
			const [a2, c2] = scratch.querySelectorAll('p');
			expect(a2).to.equal(a);
			expect(c2).to.equal(c);
			expect(fallback.parentNode).to.equal(null);
		});

		it('should render fresh nodes even when the server sent matching ones', () => {
			scratch.innerHTML = '<main><!--$s!--><b>b</b><!--/$s--><p>c</p></main>';
			const old = scratch.querySelector('b');

			hydrate(
				<main>
					<Suspense>
						<b>b</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();
			expect(scratch.innerHTML).to.equal('<main><b>b</b><p>c</p></main>');
			expect(scratch.querySelector('b')).to.not.equal(old);
		});
	});

	describe('$s?ID ranges while the document is loading', () => {
		const pending = id =>
			`<!--$s?${id}--><i id="fb${id}">fallback</i><!--/$s?${id}-->`;

		it('should not render the children and leave the fallback and siblings alone', () => {
			const { root } = loadingDoc(
				`<main><button id="pre">pre</button>${pending(0)}<button id="post">post</button></main>`
			);
			const sent = root.innerHTML;
			const fallback = root.querySelector('i');
			const child = vi.fn(() => <p>content</p>);
			const Child = child;
			const clicks = [];

			act(() => {
				hydrate(
					<main>
						<button id="pre" onClick={() => clicks.push('pre')}>
							pre
						</button>
						<Suspense fallback={<i id="fb0">fallback</i>}>
							<Child />
						</Suspense>
						<button id="post" onClick={() => clicks.push('post')}>
							post
						</button>
					</main>,
					root
				);
			});

			expect(child).not.toHaveBeenCalled();
			expect(root.innerHTML).to.equal(sent);
			expect(root.querySelector('i')).to.equal(fallback);
			root.querySelector('#pre').click();
			root.querySelector('#post').click();
			expect(clicks).to.deep.equal(['pre', 'post']);
		});

		it('should hydrate the streamed content in place and remove the markers', async () => {
			const { root } = loadingDoc(`<main><p>a</p>${pending(0)}<p>c</p></main>`);
			const log = [];
			const clicks = [];
			act(() => {
				hydrate(
					<main>
						<p>a</p>
						<Suspense fallback={<i id="fb0">fallback</i>}>
							<Leaf id="x" log={log} onClick={() => clicks.push('x')} />
						</Suspense>
						<p>c</p>
					</main>,
					root
				);
			});

			let nodes;
			await act(async () => {
				nodes = deliver(root, 0, '<button id="x">x</button>');
				await tick();
			});

			expect(root.innerHTML).to.equal(
				'<main><p>a</p><button id="x">x</button><p>c</p></main>'
			);
			expect(root.querySelector('#x')).to.equal(nodes[0]);
			expect(log).to.deep.equal(['x']);
			nodes[0].click();
			expect(clicks).to.deep.equal(['x']);
		});

		it('should render on the client when the server gives up on the boundary', async () => {
			const { root } = loadingDoc(`<main><p>a</p>${pending(0)}<p>c</p></main>`);
			act(() => {
				hydrate(
					<main>
						<p>a</p>
						<Suspense fallback={<i id="fb0">fallback</i>}>
							<b>client</b>
						</Suspense>
						<p>c</p>
					</main>,
					root
				);
			});

			await act(async () => {
				const open = comment(root, '$s?0');
				open.data = '$s!';
				open.__w();
				await tick();
			});

			expect(root.innerHTML).to.equal(
				'<main><p>a</p><b>client</b><p>c</p></main>'
			);
		});
	});

	describe('$s?ID when the response ends', () => {
		it('should render on the client when the document is already loaded', () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s?0--><i>fallback</i><!--/$s?0--><p>c</p></main>';
			const [a, c] = scratch.querySelectorAll('p');
			hydrate(
				<main>
					<p>a</p>
					<Suspense fallback={<i>fallback</i>}>
						<b>client</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<main><p>a</p><b>client</b><p>c</p></main>'
			);
			const [a2, c2] = scratch.querySelectorAll('p');
			expect(a2).to.equal(a);
			expect(c2).to.equal(c);
		});

		it('should render on the client when the response ends without its chunk', async () => {
			const { doc, root } = loadingDoc(
				'<main><p>a</p><!--$s?0--><i>fallback</i><!--/$s?0--><p>c</p></main>'
			);
			const child = vi.fn(() => <b>client</b>);
			const Child = child;
			act(() => {
				hydrate(
					<main>
						<p>a</p>
						<Suspense fallback={<i>fallback</i>}>
							<Child />
						</Suspense>
						<p>c</p>
					</main>,
					root
				);
			});
			expect(child).not.toHaveBeenCalled();

			// What the server's inline script does once the document is loaded
			const marker = root.querySelector('main').childNodes[1];
			await act(async () => {
				const loaded = new Promise(resolve =>
					doc.addEventListener('DOMContentLoaded', resolve)
				);
				doc.close();
				await loaded;
				marker.data = '$s!';
				marker.__w();
				await tick();
			});
			await act(async () => {
				await tick();
			});

			expect(root.innerHTML).to.equal(
				'<main><p>a</p><b>client</b><p>c</p></main>'
			);
		});
	});

	describe('a parent renders again while the boundary waits', () => {
		function Span({ tick }) {
			return (
				<span data-t={tick} title={'t' + tick}>
					t{tick}
				</span>
			);
		}

		it('should bring the nodes up to date when a pending boundary hydrates', async () => {
			const { root } = loadingDoc(
				'<main><!--$s?0--><i>fallback</i><!--/$s?0--></main>'
			);
			let bump;
			function App() {
				const [t, setT] = useState(0);
				bump = () => setT(t => t + 1);
				return (
					<main>
						<Suspense fallback={<i>fallback</i>}>
							<Span tick={t} />
						</Suspense>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, root);
			});
			const sent = root.innerHTML;

			await act(async () => {
				bump();
			});
			expect(root.innerHTML).to.equal(sent);

			let nodes;
			await act(async () => {
				nodes = deliver(root, 0, '<span data-t="0" title="t0">t0</span>');
				await tick();
			});
			expect(root.innerHTML).to.equal(
				'<main><span data-t="1" title="t1">t1</span></main>'
			);
			expect(root.querySelector('span')).to.equal(nodes[0]);
		});

		it('should leave the range as sent while a re-render waits on a lazy', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><span data-t="0" title="t0">t0</span><b>l</b><!--/$s--></main>';
			const [Lazy] = createLazy();
			let bump;
			function App() {
				const [t, setT] = useState(0);
				bump = () => setT(t => t + 1);
				return (
					<main>
						<Suspense>
							<Span tick={t} />
							<Lazy />
						</Suspense>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});
			const sent = scratch.innerHTML;

			await act(async () => {
				bump();
			});
			await act(async () => {
				bump();
			});
			expect(scratch.innerHTML).to.equal(sent);
		});

		it('should bring the nodes up to date when a boundary waiting on a lazy hydrates', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><span data-t="0" title="t0">t0</span><b>l</b><!--/$s--></main>';
			const span = scratch.querySelector('span');
			const [Lazy, resolve] = createLazy();
			let bump;
			function App() {
				const [t, setT] = useState(0);
				bump = () => setT(t => t + 1);
				return (
					<main>
						<Suspense>
							<Span tick={t} />
							<Lazy />
						</Suspense>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});

			await act(async () => {
				bump();
			});
			await act(async () => {
				bump();
			});

			await act(async () => {
				await resolve(() => <b>l</b>);
				await tick();
			});
			expect(scratch.innerHTML).to.equal(
				'<main><span data-t="2" title="t2">t2</span><b>l</b></main>'
			);
			expect(scratch.querySelector('span')).to.equal(span);
		});

		it('should bring the nodes up to date when the parent renders in the same batch as the retry', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><span data-t="0" title="t0">t0</span><b>l</b><!--/$s--></main>';
			const span = scratch.querySelector('span');
			const [Lazy, resolve] = createLazy();
			let bump;
			function App() {
				const [t, setT] = useState(0);
				bump = () => setT(t => t + 1);
				return (
					<main>
						<Suspense>
							<Span tick={t} />
							<Lazy />
						</Suspense>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});

			// The boundary's own retry is queued when the parent renders it with
			// new props, so the parent's render is the one that hydrates it.
			await act(async () => {
				await resolve(() => <b>l</b>);
				bump();
				await tick();
			});
			expect(scratch.innerHTML).to.equal(
				'<main><span data-t="1" title="t1">t1</span><b>l</b></main>'
			);
			expect(scratch.querySelector('span')).to.equal(span);
		});
	});

	describe('unmounting a boundary that waits', () => {
		it('should not remove siblings when the closing marker is not one of them', async () => {
			// A fallback whose raw HTML left a <p> open: the parser puts the
			// closing marker inside it
			const { root } = loadingDoc(
				'<main><p>a</p><!--$s?0--><p>open<!--/$s?0--><p>c</p></main>'
			);
			let hide;
			function App() {
				const [shown, setShown] = useState(true);
				hide = () => setShown(false);
				return (
					<main>
						<p>a</p>
						{shown && (
							<Suspense fallback={<p>open</p>}>
								<p>content</p>
							</Suspense>
						)}
					</main>
				);
			}
			act(() => {
				hydrate(<App />, root);
			});
			const open = comment(root, '$s?0');
			await act(async () => {
				hide();
			});
			expect(open.__w).to.equal(0);
			expect(root.lastChild.lastChild.textContent).to.equal('c');
		});

		it('should remove the whole range of a boundary waiting on a lazy', async () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s=--><i>x</i><i>y</i><!--/$s--><p>c</p></main>';
			const [Lazy, resolve] = createLazy();
			let hide;
			function App() {
				const [shown, setShown] = useState(true);
				hide = () => setShown(false);
				return (
					<main>
						<p>a</p>
						{shown && (
							<Suspense>
								<Lazy />
							</Suspense>
						)}
						<p>c</p>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});
			await act(async () => {
				hide();
			});
			expect(scratch.innerHTML).to.equal('<main><p>a</p><p>c</p></main>');

			await act(async () => {
				await resolve(() => <i>x</i>);
				await tick();
			});
			expect(scratch.innerHTML).to.equal('<main><p>a</p><p>c</p></main>');
		});

		function pendingWithInstructions() {
			const { doc, root } = loadingDoc(
				'<main><p>a</p><!--$s?0--><i>fallback</i><!--/$s?0--><p>c</p></main>'
			);
			const open = comment(root, '$s?0');
			const close = comment(root, '/$s?0');
			const start = doc.createProcessingInstruction('start', 'name="0"');
			const end = doc.createProcessingInstruction('end', '');
			open.after(start);
			close.before(end);
			return { root, open, close, start, end };
		}

		function expectShell({ root, open, close, start, end }) {
			expect(root.querySelector('i')).to.equal(null);
			const main = root.firstChild;
			expect([...main.childNodes]).to.deep.equal([
				main.firstChild,
				open,
				start,
				end,
				close,
				main.lastChild
			]);
			expect(open.data).to.equal('$s?0');
			expect(close.data).to.equal('/$s?0');
			expect(open.__w).to.equal(0);
			expect(start.data).to.equal('');
		}

		it('should leave the markers and instructions of a pending boundary', async () => {
			const shell = pendingWithInstructions();
			let hide;
			function App() {
				const [shown, setShown] = useState(true);
				hide = () => setShown(false);
				return (
					<main>
						<p>a</p>
						{shown && (
							<Suspense fallback={<i>fallback</i>}>
								<b>content</b>
							</Suspense>
						)}
						<p>c</p>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, shell.root);
			});
			await act(async () => {
				hide();
			});
			expectShell(shell);
		});

		it('should not remove the opening comment when a wrapper component unmounts with it', async () => {
			const shell = pendingWithInstructions();
			let hide;
			const Wrapper = ({ children }) => children;
			function App() {
				const [shown, setShown] = useState(true);
				hide = () => setShown(false);
				return (
					<main>
						<p>a</p>
						{shown && (
							<Wrapper>
								<Suspense fallback={<i>fallback</i>}>
									<b>content</b>
								</Suspense>
							</Wrapper>
						)}
						<p>c</p>
					</main>
				);
			}
			act(() => {
				hydrate(<App />, shell.root);
			});
			await act(async () => {
				hide();
			});
			expectShell(shell);
		});
	});

	describe('a keyed list of waiting boundaries', () => {
		// getDomSibling does not see the range of a waiting boundary, so the
		// reorder leaves the DOM in the old order.
		it('should move whole ranges of boundaries waiting on lazies and reuse the nodes', async () => {
			scratch.innerHTML =
				'<main><!--$s=--><p>a</p><!--/$s--><!--$s=--><p>b</p><!--/$s--><!--$s=--><p>c</p><!--/$s--></main>';
			const nodes = {};
			scratch.querySelectorAll('p').forEach(p => (nodes[p.textContent] = p));
			const lazies = {};
			const resolvers = {};
			for (const key of ['a', 'b', 'c']) {
				[lazies[key], resolvers[key]] = createLazy();
			}
			let setOrder;
			function App() {
				const [order, set] = useState(['a', 'b', 'c']);
				setOrder = set;
				return (
					<main>
						{order.map(key => (
							<Suspense key={key}>{createElement(lazies[key])}</Suspense>
						))}
					</main>
				);
			}
			act(() => {
				hydrate(<App />, scratch);
			});

			await act(async () => {
				setOrder(['c', 'a', 'b']);
			});
			expect(scratch.innerHTML).to.equal(
				'<main><!--$s=--><p>c</p><!--/$s--><!--$s=--><p>a</p><!--/$s--><!--$s=--><p>b</p><!--/$s--></main>'
			);

			await act(async () => {
				for (const key of ['a', 'b', 'c']) {
					await resolvers[key](() => <p>{key}</p>);
				}
				await tick();
			});
			expect(scratch.innerHTML).to.equal(
				'<main><p>c</p><p>a</p><p>b</p></main>'
			);
			const now = scratch.querySelectorAll('p');
			expect([...now]).to.deep.equal([nodes.c, nodes.a, nodes.b]);
		});

		// getDomSibling does not see the range of a waiting boundary, so the
		// reorder leaves the DOM in the old order.
		it('should move whole ranges of pending boundaries and reuse the nodes', async () => {
			const pending = id => `<!--$s?${id}--><i>fb${id}</i><!--/$s?${id}-->`;
			const { root } = loadingDoc(
				`<main>${pending(0)}${pending(1)}${pending(2)}</main>`
			);
			let setOrder;
			function App() {
				const [order, set] = useState([0, 1, 2]);
				setOrder = set;
				return (
					<main>
						{order.map(key => (
							<Suspense key={key} fallback={<i>fb{key}</i>}>
								<p>{key}</p>
							</Suspense>
						))}
					</main>
				);
			}
			act(() => {
				hydrate(<App />, root);
			});

			await act(async () => {
				setOrder([2, 0, 1]);
			});
			expect(root.innerHTML).to.equal(
				`<main>${pending(2)}${pending(0)}${pending(1)}</main>`
			);

			const nodes = {};
			await act(async () => {
				for (const id of [0, 1, 2]) {
					nodes[id] = deliver(root, id, `<p>${id}</p>`)[0];
				}
				await tick();
			});
			expect(root.innerHTML).to.equal('<main><p>2</p><p>0</p><p>1</p></main>');
			expect([...root.querySelectorAll('p')]).to.deep.equal([
				nodes[2],
				nodes[0],
				nodes[1]
			]);
		});
	});

	describe('nested boundaries', () => {
		it('should hydrate an inner pending range after the outer one waiting on a lazy', async () => {
			const { root } = loadingDoc(
				'<main><!--$s=--><p>o</p><!--$s?1--><i>fbi</i><!--/$s?1--><!--/$s--></main>'
			);
			const [Lazy, resolve] = createLazy();
			const inner = vi.fn(() => <u>inner</u>);
			const Inner = inner;
			const o = root.querySelector('p');
			act(() => {
				hydrate(
					<main>
						<Suspense>
							<Lazy />
							<Suspense fallback={<i>fbi</i>}>
								<Inner />
							</Suspense>
						</Suspense>
					</main>,
					root
				);
			});
			expect(inner).not.toHaveBeenCalled();

			await act(async () => {
				await resolve(() => <p>o</p>);
				await tick();
			});
			expect(root.innerHTML).to.equal(
				'<main><p>o</p><!--$s?1--><i>fbi</i><!--/$s?1--></main>'
			);
			expect(root.querySelector('p')).to.equal(o);
			expect(inner).not.toHaveBeenCalled();

			let nodes;
			await act(async () => {
				nodes = deliver(root, 1, '<u>inner</u>');
				await tick();
			});
			expect(root.innerHTML).to.equal('<main><p>o</p><u>inner</u></main>');
			expect(root.querySelector('u')).to.equal(nodes[0]);
		});

		it('should hydrate a pending range that the chunk of an outer pending range contains', async () => {
			const { root } = loadingDoc(
				'<main><!--$s?0--><i>fbo</i><!--/$s?0--></main>'
			);
			const inner = vi.fn(() => <u>inner</u>);
			const Inner = inner;
			act(() => {
				hydrate(
					<main>
						<Suspense fallback={<i>fbo</i>}>
							<p>o</p>
							<Suspense fallback={<i>fbi</i>}>
								<Inner />
							</Suspense>
						</Suspense>
					</main>,
					root
				);
			});

			let nodes;
			await act(async () => {
				nodes = deliver(root, 0, '<p>o</p><!--$s?1--><i>fbi</i><!--/$s?1-->');
				await tick();
			});
			expect(root.innerHTML).to.equal(
				'<main><p>o</p><!--$s?1--><i>fbi</i><!--/$s?1--></main>'
			);
			expect(root.querySelector('p')).to.equal(nodes[0]);
			expect(inner).not.toHaveBeenCalled();

			let chunk;
			await act(async () => {
				chunk = deliver(root, 1, '<u>inner</u>');
				await tick();
			});
			expect(root.innerHTML).to.equal('<main><p>o</p><u>inner</u></main>');
			expect(root.querySelector('u')).to.equal(chunk[0]);
		});

		it('should render an inner pending boundary once when the outer one suspends after hydration', async () => {
			const { root } = loadingDoc(
				'<main><!--$s=--><p>s</p><!--$s?1--><i>fbi</i><!--/$s?1--><!--/$s--></main>'
			);
			const [Suspender, suspend] = createSuspender(() => <p>s</p>);
			let renders = 0;
			function Inner() {
				renders++;
				return <u>inner</u>;
			}
			act(() => {
				hydrate(
					<main>
						<Suspense fallback={<em>loading</em>}>
							<Suspender />
							<Suspense fallback={<i>fbi</i>}>
								<Inner />
							</Suspense>
						</Suspense>
					</main>,
					root
				);
			});
			expect(renders).to.equal(0);

			let resolve;
			await act(async () => {
				[resolve] = suspend();
			});
			expect(root.querySelector('em')).to.not.equal(null);

			await act(async () => {
				await resolve(() => <p>s2</p>);
				await tick();
			});

			expect(renders).to.equal(1);
			expect(root.querySelectorAll('u').length).to.equal(1);
			expect(root.querySelector('em')).to.equal(null);
			expect(root.querySelectorAll('i').length).to.equal(0);
			// The markers stay for the chunk's script, which drops the range
			const open = comment(root, '$s?1');
			expect(open).to.not.equal(undefined);
			expect(open.__w).to.equal(0);
		});
	});

	describe('useId', () => {
		function Id({ children }) {
			return <span id={useId()}>{children}</span>;
		}

		it('should give the ids of the server HTML after a render that was thrown away', async () => {
			// The ids the server HTML has: render the same tree once on the client
			const [RefLazy, resolveRef] = createLazy();
			const detached = document.createElement('div');
			render(
				<main>
					<Suspense>
						<Id>a</Id>
						<RefLazy />
						<Id>c</Id>
					</Suspense>
				</main>,
				detached
			);
			await act(async () => {
				await resolveRef(() => <Id>b</Id>);
				await tick();
			});
			const ids = [...detached.querySelectorAll('span')].map(s => s.id);
			expect(ids.length).to.equal(3);
			render(null, detached);

			scratch.innerHTML =
				'<main><!--$s=-->' +
				['a', 'b', 'c']
					.map((t, i) => `<span id="${ids[i]}">${t}</span>`)
					.join('') +
				'<!--/$s--></main>';
			const [Lazy, resolve] = createLazy();
			act(() => {
				hydrate(
					<main>
						<Suspense>
							<Id>a</Id>
							<Lazy />
							<Id>c</Id>
						</Suspense>
					</main>,
					scratch
				);
			});

			await act(async () => {
				await resolve(() => <Id>b</Id>);
				await tick();
			});
			expect(
				[...scratch.querySelectorAll('span')].map(s => s.id)
			).to.deep.equal(ids);
			expect(commentData(scratch)).to.deep.equal([]);
		});
	});

	describe('render() into a container with ranges', () => {
		it('should render the children of a $s= range and drop its markers', () => {
			scratch.innerHTML =
				'<main><!--$s=--><p>in</p><!--/$s--><p>after</p></main>';
			render(
				<main>
					<Suspense>
						<p>in</p>
					</Suspense>
					<p>after</p>
				</main>,
				scratch
			);
			rerender();
			expect(scratch.innerHTML).to.equal('<main><p>in</p><p>after</p></main>');
			expect(commentData(scratch)).to.deep.equal([]);
		});

		it('should replace a $s! range with fresh nodes at its position', () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s!--><i>fallback</i><!--/$s--><p>c</p></main>';
			render(
				<main>
					<p>a</p>
					<Suspense fallback={<i>fallback</i>}>
						<b>b</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<main><p>a</p><b>b</b><p>c</p></main>'
			);
		});

		it('should render a $s?ID range on the client when the document is loaded', () => {
			scratch.innerHTML =
				'<main><p>a</p><!--$s?0--><i>fallback</i><!--/$s?0--><p>c</p></main>';
			render(
				<main>
					<p>a</p>
					<Suspense fallback={<i>fallback</i>}>
						<b>b</b>
					</Suspense>
					<p>c</p>
				</main>,
				scratch
			);
			rerender();
			expect(scratch.innerHTML).to.equal(
				'<main><p>a</p><b>b</b><p>c</p></main>'
			);
		});
	});
});
