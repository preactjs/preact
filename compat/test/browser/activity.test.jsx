import { act } from 'preact/test-utils';
import {
	Activity,
	createElement,
	Fragment,
	render,
	useState
} from 'preact/compat';
import { setupScratch, teardown } from '../../../test/_util/helpers';

describe('Activity', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('preserves component and DOM state while hidden', () => {
		let setMode;
		let setCount;

		function Child() {
			const [count, updateCount] = useState(0);
			setCount = updateCount;
			return (
				<>
					<span>{count}</span>
					<input />
				</>
			);
		}

		function App() {
			const [mode, updateMode] = useState('visible');
			setMode = updateMode;
			return (
				<Activity mode={mode}>
					<Child />
				</Activity>
			);
		}

		render(<App />, scratch);

		const wrapper = scratch.firstElementChild;
		const input = scratch.querySelector('input');
		input.value = 'draft';

		act(() => setCount(1));
		expect(scratch.querySelector('span').textContent).to.equal('1');

		act(() => setMode('hidden'));
		expect(wrapper.style.display).to.equal('none');
		expect(scratch.querySelector('input')).to.equal(input);

		act(() => setMode('visible'));
		expect(wrapper.style.display).to.equal('contents');
		expect(scratch.querySelector('span').textContent).to.equal('1');
		expect(scratch.querySelector('input')).to.equal(input);
		expect(input.value).to.equal('draft');
	});

	it('defaults to visible', () => {
		render(
			<Activity>
				<span>content</span>
			</Activity>,
			scratch
		);

		expect(scratch.firstElementChild.style.display).to.equal('contents');
		expect(scratch.textContent).to.equal('content');
	});
});
