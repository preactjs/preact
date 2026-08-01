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
import { vi } from 'vitest';

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

		vnodeSpy.mockClear();
		rootSpy.mockClear();
		beforeDiffSpy.mockClear();
		hookSpy.mockClear();
		afterDiffSpy.mockClear();
		catchErrorSpy.mockClear();
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

		expect(vnodeSpy).toHaveBeenCalled();
		expect(rootSpy).toHaveBeenCalled();
		expect(beforeDiffSpy).toHaveBeenCalled();
		expect(afterDiffSpy).toHaveBeenCalled();
	});

	it('should call old options on update', () => {
		render(<ClassApp />, scratch);

		setCount(1);
		rerender();

		expect(vnodeSpy).toHaveBeenCalled();
		expect(rootSpy).toHaveBeenCalled();
		expect(beforeDiffSpy).toHaveBeenCalled();
		expect(afterDiffSpy).toHaveBeenCalled();
	});

	it('should call old options on unmount', () => {
		render(<ClassApp />, scratch);
		render(null, scratch);

		expect(vnodeSpy).toHaveBeenCalled();
		expect(rootSpy).toHaveBeenCalled();
		expect(beforeDiffSpy).toHaveBeenCalled();
		expect(afterDiffSpy).toHaveBeenCalled();
	});

	it('should call old hook options for hook components', () => {
		function HookApp() {
			const [count, realSetCount] = useState(0);
			setCount = realSetCount;
			return <div>{count}</div>;
		}

		render(<HookApp />, scratch);

		expect(hookSpy).toHaveBeenCalled();
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

		// even though the error was handled by an error boundary we still log it,
		// this matches what React does in development
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		let loggedErrors;
		try {
			render(<ErrorApp />, scratch);
			rerender();
		} finally {
			loggedErrors = errorSpy.mock.calls.map(args => args[0]);
			errorSpy.mockRestore();
		}

		expect(catchErrorSpy).toHaveBeenCalled();
		expect(loggedErrors).to.deep.equal([e]);
	});
});
