import { createElement, render } from 'preact';
import { useId, useState } from 'preact/hooks';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../../../test/_util/helpers';

/** @jsx createElement */

describe('useId', () => {
	/** @type {HTMLDivElement} */
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('keeps the id consistent after an update', () => {
		function Comp() {
			const id = useId();
			return <div id={id} />;
		}

		render(<Comp />, scratch);
		const id = scratch.firstChild.getAttribute('id');
		expect(scratch.firstChild.getAttribute('id')).to.equal(id);

		render(<Comp />, scratch);
		expect(scratch.firstChild.getAttribute('id')).to.equal(id);
	});

	it('ids are unique according to dom-depth', () => {
		function Child() {
			const id = useId();
			const spanId = useId();
			return (
				<div id={id}>
					<span id={spanId}>h</span>
				</div>
			);
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Child />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><div id="P1-1"><span id="P1-2">h</span></div></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><div id="P1-1"><span id="P1-2">h</span></div></div>'
		);
	});

	it('ids are unique across siblings', () => {
		function Child() {
			const id = useId();
			return <span id={id}>h</span>;
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Child />
					<Child />
					<Child />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><span id="P1-1">h</span><span id="P2-1">h</span><span id="P3-1">h</span></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><span id="P1-1">h</span><span id="P2-1">h</span><span id="P3-1">h</span></div>'
		);
	});

	it('correctly handles new elements', () => {
		let set;
		function Child() {
			const id = useId();
			return <span id={id}>h</span>;
		}

		function Stateful() {
			const [state, setState] = useState(false);
			set = setState;
			return (
				<div>
					<Child />
					{state && <Child />}
				</div>
			);
		}

		function Comp() {
			const id = useId();
			return (
				<div id={id}>
					<Stateful />
				</div>
			);
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><div><span id="P11-1">h</span></div></div>'
		);

		set(true);
		rerender();
		expect(scratch.innerHTML).to.equal(
			'<div id="P-1"><div><span id="P11-1">h</span><span id="P12-1">h</span></div></div>'
		);
	});
});
