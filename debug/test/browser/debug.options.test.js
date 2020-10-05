import {
	vnodeSpy,
	rootSpy,
	beforeDiffSpy,
	hookSpy,
	afterDiffSpy,
	catchErrorSpy
} from '../../../test/_util/optionSpies';

import { createElement, render, Component } from 'preact';
import { useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import 'preact/debug';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('debug options', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {(count: number) => void} */
	let setCount;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		vnodeSpy.resetHistory();
		rootSpy.resetHistory();
		beforeDiffSpy.resetHistory();
		hookSpy.resetHistory();
		afterDiffSpy.resetHistory();
		catchErrorSpy.resetHistory();
	});

	afterEach(() => {
		teardown(scratch);
	});

	class ClassApp extends Component {
		constructor() {
			super();
			this.state = { count: 0 };
			setCount = count => this.setState({ count });
		}

		render() {
			return <div>{this.state.count}</div>;
		}
	}

	it('should call old options on mount', () => {
		render(<ClassApp />, scratch);

		expect(vnodeSpy).to.have.been.called;
		expect(rootSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on update', () => {
		render(<ClassApp />, scratch);

		setCount(1);
		rerender();

		expect(vnodeSpy).to.have.been.called;
		expect(rootSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<ClassApp />, scratch);
		render(null, scratch);

		expect(vnodeSpy).to.have.been.called;
		expect(rootSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old hook options for hook components', () => {
		function HookApp() {
			const [count, realSetCount] = useState(0);
			setCount = realSetCount;
			return <div>{count}</div>;
		}

		render(<HookApp />, scratch);

		expect(hookSpy).to.have.been.called;
	});

	it('should call old options on error', () => {
		const e = new Error('test');
		class ErrorApp extends Component {
			constructor() {
				super();
				this.state = { error: true };
			}
			componentDidCatch() {
				this.setState({ error: false });
			}
			render() {
				return <Throw error={this.state.error} />;
			}
		}

		function Throw({ error }) {
			if (error) {
				throw e;
			} else {
				return <div>no error</div>;
			}
		}

		const clock = sinon.useFakeTimers();

		render(<ErrorApp />, scratch);
		rerender();

		expect(catchErrorSpy).to.have.been.called;

		// we expect to throw after setTimeout to trigger a window.onerror
		// this is to ensure react compat (i.e. with next.js' dev overlay)
		expect(() => clock.tick(0)).to.throw(e);

		clock.restore();
	});
});
