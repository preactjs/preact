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
			const id = useId()
			return <div id={id} />;
		}

		render(<Comp />, scratch);
		const id = scratch.firstChild.getAttribute('id')
		expect(scratch.firstChild.getAttribute('id')).to.equal(id)

		render(<Comp />, scratch);
		expect(scratch.firstChild.getAttribute('id')).to.equal(id)
	});

	it('ids are unique according to dom-depth', () => {
		function Child() {
			const id = useId()
			const spanId = useId()
			return (
				<div id={id}>
					<span id={spanId}>h</span>
				</div>
			)
		}

		function Comp() {
			const id = useId()
			return <div id={id}><Child /></div>;
		}

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal('<div id="001"><div id="011"><span id="012">h</span></div></div>')

		render(<Comp />, scratch);
		expect(scratch.innerHTML).to.equal('<div id="001"><div id="011"><span id="012">h</span></div></div>')
	});
});
