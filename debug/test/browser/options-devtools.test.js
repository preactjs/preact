import {
	vnodeSpy,
	beforeDiffSpy,
	afterDiffSpy,
	beforeCommitSpy,
	unmountSpy
} from '../../../test/_util/optionSpies';

import { createElement, render, Component } from 'preact';
import { useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { initDevTools } from '../../src/devtools';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('devtools options', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	/** @type {(count: number) => void} */
	let setCount;

	before(() => {
		initDevTools();
	});

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		vnodeSpy.resetHistory();
		beforeDiffSpy.resetHistory();
		afterDiffSpy.resetHistory();
		beforeCommitSpy.resetHistory();
		unmountSpy.resetHistory();
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
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
		expect(beforeCommitSpy).to.have.been.called;
	});

	it('should call old options on update', () => {
		render(<ClassApp />, scratch);

		setCount(1);
		rerender();

		expect(vnodeSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
		expect(beforeCommitSpy).to.have.been.called;
	});

	it('should call old options on unmount', () => {
		render(<ClassApp />, scratch);
		render(null, scratch);

		expect(unmountSpy).to.have.been.called;
	});

	it('should call old hook options for hook components', () => {
		function HookApp() {
			const [count, realSetCount] = useState(0);
			setCount = realSetCount;
			return <div>{count}</div>;
		}

		render(<HookApp />, scratch);

		expect(vnodeSpy).to.have.been.called;
		expect(beforeDiffSpy).to.have.been.called;
		expect(afterDiffSpy).to.have.been.called;
		expect(beforeCommitSpy).to.have.been.called;
	});
});
