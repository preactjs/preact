import { createElement, render } from 'preact';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { useId } from 'preact/hooks';

/** @jsx createElement */

describe('useId', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
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
			'<div id="_P10"><div id="_P20"><span id="_P21">h</span></div></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="_P10"><div id="_P20"><span id="_P21">h</span></div></div>'
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
			'<div id="_P10"><span id="_P20">h</span><span id="_P30">h</span><span id="_P40">h</span></div>'
		);

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal(
			'<div id="_P10"><span id="_P20">h</span><span id="_P30">h</span><span id="_P40">h</span></div>'
		);
	});
});
