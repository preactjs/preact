import {
	vnodeSpy,
	rootSpy,
	beforeDiffSpy,
	hookSpy,
	afterDiffSpy,
	catchErrorSpy
} from '../../../test/_util/optionSpies';

import { createElement, createRoot, Component } from 'preact';
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

	let render;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
		({ render } = createRoot(scratch));

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
		render(<ClassApp />);

		expect(vnodeSpy).to.have.been.called;
		expect(rootSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on update', () => {
		render(<ClassApp />);

		setCount(1);
		rerender();

		expect(vnodeSpy).to.have.been.called;
		expect(rootSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<ClassApp />);
		render(null);

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

		render(<HookApp />);

		expect(hookSpy).to.have.been.called;
	});

	it('should call old options on error', () => {
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
				throw new Error('test');
			} else {
				return <div>no error</div>;
			}
		}

		render(<ErrorApp />);
		rerender();

		expect(catchErrorSpy).to.have.been.called;
	});
});
