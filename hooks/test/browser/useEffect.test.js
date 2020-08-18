import { act } from 'preact/test-utils';
import { createElement, render, Fragment, Component } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useEffect, useState } from 'preact/hooks';
import { useEffectAssertions } from './useEffectAssertions.test';
import { scheduleEffectAssert } from '../_util/useEffectUtil';

/** @jsx createElement */

describe('useEffect', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	useEffectAssertions(useEffect, scheduleEffectAssert);

	it('calls the effect immediately if another render is about to start', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.not.called;
		expect(callback).to.be.calledOnce;

		render(<Comp />, scratch);

		expect(cleanupFunction).to.be.calledOnce;
		expect(callback).to.be.calledTwice;
	});

	it('cancels the effect when the component get unmounted before it had the chance to run it', () => {
		const cleanupFunction = sinon.spy();
		const callback = sinon.spy(() => cleanupFunction);

		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(null, scratch);

		return scheduleEffectAssert(() => {
			expect(cleanupFunction).to.not.be.called;
			expect(callback).to.not.be.called;
		});
	});

	it('should execute multiple effects in same component in the right order', () => {
		let executionOrder = [];
		const App = ({ i }) => {
			executionOrder = [];
			useEffect(() => {
				executionOrder.push('action1');
				return () => executionOrder.push('cleanup1');
			}, [i]);
			useEffect(() => {
				executionOrder.push('action2');
				return () => executionOrder.push('cleanup2');
			}, [i]);
			return <p>Test</p>;
		};
		act(() => render(<App i={0} />, scratch));
		act(() => render(<App i={2} />, scratch));
		expect(executionOrder).to.deep.equal([
			'cleanup1',
			'cleanup2',
			'action1',
			'action2'
		]);
	});

	it('should throw an error upwards', () => {
		const spy = sinon.spy();
		let errored = false;

		const Page1 = () => {
			const [state, setState] = useState('loading');
			useEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useEffect(() => {
				throw new Error('err');
			}, []);
			return <p>invisible</p>;
		};

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Fragment>{props.page === 1 ? <Page1 /> : <Page2 />}</Fragment>;
			}
		}

		act(() => render(<App page={1} />, scratch));
		expect(spy).to.not.be.called;
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');

		act(() => render(<App page={2} />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
		errored = false;

		act(() => render(<App page={1} />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>loaded</p>');
	});

	it('should throw an error upwards from return', () => {
		const spy = sinon.spy();
		let errored = false;

		const Page1 = () => {
			const [state, setState] = useState('loading');
			useEffect(() => {
				setState('loaded');
			}, []);
			return <p>{state}</p>;
		};

		const Page2 = () => {
			useEffect(() => {
				return () => {
					throw new Error('err');
				};
			}, []);
			return <p>Load</p>;
		};

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Fragment>{props.page === 1 ? <Page1 /> : <Page2 />}</Fragment>;
			}
		}

		act(() => render(<App page={2} />, scratch));
		expect(scratch.innerHTML).to.equal('<p>Load</p>');

		act(() => render(<App page={1} />, scratch));
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('catches errors when error is invoked during render', () => {
		const spy = sinon.spy();
		let errored;

		function Comp() {
			useEffect(() => {
				throw new Error('hi');
			});
			return null;
		}

		class App extends Component {
			componentDidCatch(err) {
				spy();
				errored = err;
			}

			render(props, state) {
				if (errored) {
					return <p>Error</p>;
				}

				return <Comp />;
			}
		}

		render(<App />, scratch);
		act(() => {
			render(<App />, scratch);
		});
		expect(spy).to.be.calledOnce;
		expect(scratch.innerHTML).to.equal('<p>Error</p>');
	});

	it('should allow creating a new root', () => {
		const root = document.createElement('div');
		const global = document.createElement('div');
		scratch.appendChild(root);
		scratch.appendChild(global);

		const Modal = props => {
			let [, setCanProceed] = useState(true);
			let ChildProp = props.content;

			return (
				<div>
					<ChildProp setCanProceed={setCanProceed} />
				</div>
			);
		};

		const Inner = () => {
			useEffect(() => {
				render(<div>global</div>, global);
			}, []);

			return <div>Inner</div>;
		};

		act(() => {
			render(
				<Modal
					content={props => {
						props.setCanProceed(false);
						return <Inner />;
					}}
				/>,
				root
			);
		});

		expect(scratch.innerHTML).to.equal(
			'<div><div><div>Inner</div></div></div><div><div>global</div></div>'
		);
	});

	it('should not crash when effect returns truthy non-function value', () => {
		const callback = sinon.spy(() => 'truthy');
		function Comp() {
			useEffect(callback);
			return null;
		}

		render(<Comp />, scratch);
		render(<Comp />, scratch);

		expect(callback).to.have.been.calledOnce;

		render(<div>Replacement</div>, scratch);
	});
});
