import {
	afterDiffSpy,
	beforeRenderSpy,
	unmountSpy
} from "../../../test/_util/optionSpies";

import { setupRerender } from "preact/test-utils";
import { createElement, render } from "preact";
import { setupScratch, teardown } from "../../../test/_util/helpers";
import { useState } from "../../src";

/** @jsx createElement */

describe("hook options", () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();

		afterDiffSpy.resetHistory();
		unmountSpy.resetHistory();
		beforeRenderSpy.resetHistory();
	});

	afterEach(() => {
		teardown(scratch);
	});

	function App() {
		const [count] = useState(0);
		return <div>{count}</div>;
	}

	it("should call old options._render", () => {
		render(<App />, scratch);

		expect(beforeRenderSpy).to.have.been.called;
	});

	it("should call old options.diffed", () => {
		render(<App />, scratch);

		expect(afterDiffSpy).to.have.been.called;
	});

	it("should call old options.unmount", () => {
		render(<App />, scratch);
		render(null, scratch);

		expect(unmountSpy).to.have.been.called;
	});
});
