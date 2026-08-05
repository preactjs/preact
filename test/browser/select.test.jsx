import { createElement, render, Component } from 'preact';
import { setupRerender } from 'preact/test-utils';
import { setupScratch, teardown } from '../_util/helpers';

describe('Select', () => {
	let scratch, rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should set <select> value', () => {
		function App() {
			return (
				<select value="B">
					<option value="A">A</option>
					<option value="B">B</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should set value with selected', () => {
		function App() {
			return (
				<select>
					<option value="A">A</option>
					<option selected value="B">
						B
					</option>
					<option value="C">C</option>
				</select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');
	});

	it('should work with multiple selected', () => {
		function App() {
			return (
				<select multiple>
					<option value="A">A</option>
					<option selected value="B">
						B
					</option>
					<option selected value="C">
						C
					</option>
				</select>
			);
		}

		render(<App />, scratch);
		Array.prototype.slice.call(scratch.firstChild.childNodes).forEach(node => {
			if (node.value === 'B' || node.value === 'C') {
				expect(node.selected).to.equal(true);
			}
		});
		expect(scratch.firstChild.value).to.equal('B');
	});

	// #4737: the `<select>` and its `<option>`s live in different components
	// which both subscribe to the same external store. The `<option>` producer
	// has to render in the same pass, otherwise the new value is applied to the
	// `<select>` before the matching `<option>` exists.
	it('should select an option added by a separate component in the same update', () => {
		/** @type {Array<() => void>} */
		let subscribers = [];
		let store = { items: ['A', 'B'], selected: 'B' };

		class Subscriber extends Component {
			componentDidMount() {
				subscribers.push(() => this.forceUpdate());
			}
		}

		class Options extends Subscriber {
			render() {
				return store.items.map(item => (
					<option key={item} value={item}>
						{item}
					</option>
				));
			}
		}

		class Select extends Subscriber {
			render(props) {
				return <select value={store.selected}>{props.children}</select>;
			}
		}

		function App() {
			return (
				<Select>
					<Options />
				</Select>
			);
		}

		render(<App />, scratch);
		expect(scratch.firstChild.value).to.equal('B');

		store = { items: ['A', 'B', 'C'], selected: 'C' };
		subscribers.forEach(update => update());
		rerender();

		expect(scratch.firstChild.value).to.equal('C');
	});
});
