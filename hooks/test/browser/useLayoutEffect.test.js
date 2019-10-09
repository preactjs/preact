import { act } from 'preact/test-utils';
import { createElement as h, render, Fragment } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffectAssertions } from './useEffectAssertions.test';
import { useLayoutEffect, useRef } from '../../src';

/** @jsx h */

describe('useLayoutEffect', () => {

	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	// Layout effects fire synchronously
	const scheduleEffectAssert = assertFn => new Promise(resolve => {
		assertFn();
		resolve();
	});

	useEffectAssertions(useLayoutEffect, scheduleEffectAssert);


	it('calls the effect immediately after render', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useLayoutEffect(callback);
			return null;
		}

		act(() => render(<Comp />, scratch));
		act(() => render(<Comp />, scratch));

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;

		act(() => render(<Comp />, scratch));

		expect(cleanupFunction).to.be.calledTwice;
		expect(callback).to.be.calledThrice;
	});

	it('works on a nested component', () => {
		const callback = sinon.spy();

		function Parent() {
			return (
				<div>
					<Child />
				</div>
			);
		}

		function Child() {
			useLayoutEffect(callback);
			return null;
		}

		act(() => render(<Parent />, scratch));

		expect(callback).to.be.calledOnce;
	});

	it('Should execute layout effects in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useLayoutEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useLayoutEffect(() => {
				executionOrder.push('action2');
				return () => executionOrder.push('cleanup2');
			}, [i]);
			return <p>Test</p>;
		};
		act(() => render(<App i={0} />, scratch));
		act(() => render(<App i={2} />, scratch));
		expect(executionOrder).to.deep.equal(['cleanup1', 'cleanup2', 'action1', 'action2']);
	});

	it('should correctly display DOM', () => {
		function AutoResizeTextareaLayoutEffect(props) {
			const ref = useRef(null);
			useLayoutEffect(() => {
				expect(scratch.innerHTML).to.equal(`<div class="${props.value}"><p>${props.value}</p><textarea></textarea></div>`);
				expect(ref.current.isConnected).to.equal(true);
			});
			return (
				<Fragment>
					<p>{props.value}</p>
					<textarea ref={ref} value={props.value} onChange={props.onChange} />
				</Fragment>
			);
		}

		function App(props) {
			return (
				<div class={props.value}>
					<AutoResizeTextareaLayoutEffect {...props} />
				</div>
			);
		}

		act(() => render(<App value="hi" />, scratch));
		act(() => render(<App value="hii" />, scratch));
	});

	it('should invoke layout effects after subtree is fully connected', () => {
		let ref;
		let layoutEffect = sinon.spy(() => {
			expect(ref.current.parentNode).to.not.be.undefined;
			expect(ref.current.parentNode.isConnected).to.equal(true);
		});

		function Inner() {
			ref = useRef(null);
			useLayoutEffect(layoutEffect);
			return (
				<Fragment>
					<textarea ref={ref} />
					<span>hello</span>;
				</Fragment>
			);
		}

		function Outer() {
			return <div><Inner /></div>;
		}

		act(() => render(<Outer />, scratch));
		expect(layoutEffect).to.have.been.calledOnce;
	});
});
