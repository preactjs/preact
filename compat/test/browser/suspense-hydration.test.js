import { setupRerender } from 'preact/test-utils';
import React, {
	createElement,
	hydrate,
	Component,
	Fragment,
	Suspense
} from 'preact/compat';
import { logCall, getLog, clearLog } from '../../../test/_util/logCall';
import {
	createEvent,
	setupScratch,
	teardown
} from '../../../test/_util/helpers';
import { ul, li } from '../../../test/_util/dom';
import { createLazy } from './suspense-utils';

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

	/** @type {() => void} */
	let increment;
	class Counter extends Component {
		constructor(props) {
			super(props);

			this.state = { count: 0 };
			increment = () => this.setState({ count: ++this.state.count });
		}

		render(props, { count }) {
			return <div>Count: {count}</div>;
		}
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
		const originalHtml = ul([li(0), li(1), li(2), li(3), li(4)].join(''));

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
		const originalHtml = ul([li(0), li(1), li(2), li(3), li(4)].join(''));

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

	it.skip('should properly hydrate suspense when resolves to a Fragment', () => {
		const originalHtml = ul(
			[li(0), li(1), li(2), li(3), li(4), li(5)].join('')
		);

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
		expect(scratch.innerHTML).to.equal(originalHtml);
		expect(getLog()).to.deep.equal([]);
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

	// TODO:
	// 1. What if props change between when hydrate suspended and suspense
	//    resolves?
	// 2. If using real Suspense, test re-suspending after hydrate suspense
	// 3. Put some DOM and components with state and event listeners between
	//    suspender and Suspense boundary
	// 4. Put some sibling DOM and components with state and event listeners
	//    sibling to suspender and under Suspense boundary
});
