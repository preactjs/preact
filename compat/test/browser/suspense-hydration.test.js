import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	Fragment,
	Suspense,
	memo,
	useState
} from 'preact/compat';
import { logCall, getLog, clearLog } from '../../../test/_util/logCall';
import {
	createEvent,
	setupScratch,
	teardown
} from '../../../test/_util/helpers';
import { ul, li, div } from '../../../test/_util/dom';
import { createLazy, createSuspenseLoader } from './suspense-utils';

/* eslint-env browser, mocha */
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

	before(() => {
		resetAppendChild = logCall(Element.prototype, 'appendChild');
		resetInsertBefore = logCall(Element.prototype, 'insertBefore');
		resetRemoveChild = logCall(Element.prototype, 'removeChild');
		resetRemove = logCall(Element.prototype, 'remove');
	});

	after(() => {
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

		const helloListener = sinon.spy();
		const worldListener = sinon.spy();

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
		expect(worldListener, 'worldListener 1').to.have.been.calledOnce;

		return resolve(() => <div onClick={helloListener}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal('<div>Hello</div><div>World!</div>');
			expect(getLog()).to.deep.equal([]);

			scratch
				.querySelector('div:first-child')
				.dispatchEvent(createEvent('click'));
			expect(helloListener, 'helloListener').to.have.been.calledOnce;

			scratch
				.querySelector('div:last-child')
				.dispatchEvent(createEvent('click'));
			expect(worldListener, 'worldListener 2').to.have.been.calledTwice;

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

		const listeners = [
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy()
		];

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
		expect(listeners[4]).not.to.have.been.called;

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[4]).to.have.been.calledOnce;

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
			expect(listeners[2]).to.have.been.calledOnce;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[4]).to.have.been.calledTwice;
		});
	});

	it('should properly hydrate suspense with Component & Fragment siblings', () => {
		const originalHtml = ul([li(0), li(1), li(2), li(3), li(4)]);

		const listeners = [
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy()
		];

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
		expect(listeners[4]).not.to.have.been.called;

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[4]).to.have.been.calledOnce;

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
			expect(listeners[2]).to.have.been.calledOnce;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[4]).to.have.been.calledTwice;
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

		const lazySpy = sinon.spy();
		return resolve(() => <div onClick={lazySpy}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			const lazyDiv = scratch.firstChild.firstChild.nextSibling;
			expect(lazyDiv.textContent).to.equal('Hello');
			expect(lazySpy).not.to.have.been.called;

			lazyDiv.dispatchEvent(createEvent('click'));
			rerender();

			expect(lazySpy).to.have.been.calledOnce;
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

		const lazySpy = sinon.spy();
		return resolve(() => <div onClick={lazySpy}>Hello</div>).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(html);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			const lazyDiv = scratch.firstChild.nextSibling;
			expect(lazyDiv.textContent).to.equal('Hello');
			expect(lazySpy).not.to.have.been.called;

			lazyDiv.dispatchEvent(createEvent('click'));
			rerender();

			expect(lazySpy).to.have.been.calledOnce;
		});
	});

	it('should allow component to re-suspend using normal suspension mechanics after initial suspended hydration resumes', () => {
		const originalHtml = [div('a'), div('b1'), div('c')].join('');
		scratch.innerHTML = originalHtml;
		clearLog();

		const bOnClickSpy = sinon.spy();
		const cOnClickSpy = sinon.spy();

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
		expect(cOnClickSpy).to.have.been.calledOnce;

		return resolve(() => <div onClick={bOnClickSpy}>b1</div>)
			.then(() => {
				rerender();
				expect(scratch.innerHTML, 'hydration resumes').to.equal(originalHtml);
				expect(getLog()).to.deep.equal([]);
				clearLog();

				scratch.firstChild.nextSibling.dispatchEvent(createEvent('click'));
				rerender();
				expect(bOnClickSpy).to.have.been.calledOnce;

				// suspend again and validate normal suspension works (fallback renders
				// and result)
				const [Lazy2, resolve2] = createLazy();
				setChild(<Lazy2 />);
				rerender();

				expect(scratch.innerHTML, 'second suspend').to.equal(div('fallback'));

				return resolve2(() => <div onClick={bOnClickSpy}>b2</div>);
			})
			.then(() => {
				rerender();
				expect(scratch.innerHTML, 'second suspend resumes').to.equal(
					[div('a'), div('b2'), div('c')].join('')
				);

				scratch.lastChild.dispatchEvent(createEvent('click'));
				expect(cOnClickSpy).to.have.been.calledTwice;

				scratch.firstChild.nextSibling.dispatchEvent(createEvent('click'));
				expect(bOnClickSpy).to.have.been.calledTwice;
			});
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

		const listeners = [
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy(),
			sinon.spy()
		];

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
		expect(listeners[5]).not.to.have.been.called;

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[5]).to.have.been.calledOnce;

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
			expect(listeners[3]).to.have.been.calledOnce;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[5]).to.have.been.calledTwice;
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

		const listeners = [sinon.spy(), sinon.spy(), sinon.spy(), sinon.spy()];

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
		expect(listeners[3]).not.to.have.been.called;

		clearLog();
		scratch.querySelector('li:last-child').dispatchEvent(createEvent('click'));
		expect(listeners[3]).to.have.been.calledOnce;

		return resolve(() => null).then(() => {
			rerender();
			expect(scratch.innerHTML).to.equal(originalHtml);
			expect(getLog()).to.deep.equal([]);
			clearLog();

			scratch
				.querySelector('li:nth-child(2)')
				.dispatchEvent(createEvent('click'));
			expect(listeners[1]).to.have.been.calledOnce;

			scratch
				.querySelector('li:last-child')
				.dispatchEvent(createEvent('click'));
			expect(listeners[3]).to.have.been.calledTwice;
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
});
