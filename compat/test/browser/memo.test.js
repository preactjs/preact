import { setupRerender } from 'preact/test-utils';
import {
	createEvent,
	setupScratch,
	teardown
} from '../../../test/_util/helpers';
import React, {
	createElement,
	Component,
	render,
	memo,
	useState
} from 'preact/compat';
import { vi } from 'vitest';

const h = React.createElement;

describe('memo()', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	/** @type {() => void} */
	let rerender;

	beforeEach(() => {
		scratch = setupScratch();
		rerender = setupRerender();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should have isReactComponent flag', () => {
		// eslint-disable-next-line react/display-name
		let App = memo(() => <div>foo</div>);
		expect(App.prototype.isReactComponent).to.equal(true);
	});

	it('should work with function components', () => {
		let spy = vi.fn();

		function Foo() {
			spy();
			return <h1>Hello World</h1>;
		}

		let Memoized = memo(Foo);

		/** @type {() => void} */
		let update;
		class App extends Component {
			constructor() {
				super();
				update = () => this.setState({});
			}
			render() {
				return <Memoized />;
			}
		}
		render(<App />, scratch);

		expect(spy).toHaveBeenCalledOnce();

		update();
		rerender();

		expect(spy).toHaveBeenCalledOnce();
	});

	it('should support adding refs', () => {
		let spy = vi.fn();

		let ref = null;

		function Foo(props) {
			spy();
			return <h1 ref={props.ref}>Hello World</h1>;
		}

		let Memoized = memo(Foo);

		/** @type {(v) => void} */
		let update;
		class App extends Component {
			constructor() {
				super();
				update = () => this.setState({});
			}
			render() {
				return <Memoized ref={ref} />;
			}
		}
		render(<App />, scratch);

		expect(spy).toHaveBeenCalledOnce();

		ref = {};

		update();
		rerender();

		expect(ref.current).to.equal(scratch.firstChild);
		// TODO: not sure whether this is in-line with react...
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('should support custom comparer functions', () => {
		function Foo() {
			return <h1>Hello World</h1>;
		}

		let spy = vi.fn(() => true);
		let Memoized = memo(Foo, spy);

		/** @type {(v) => void} */
		let update;
		class App extends Component {
			constructor() {
				super();
				update = () => this.setState({});
			}
			render() {
				return <Memoized />;
			}
		}
		render(<App />, scratch);

		update();
		rerender();

		expect(spy).toHaveBeenCalledOnce();
		expect(spy).toHaveBeenCalledWith({}, {});
	});

	it('should rerender when custom comparer returns false', () => {
		const spy = vi.fn();
		function Foo() {
			spy();
			return <h1>Hello World</h1>;
		}

		const App = memo(Foo, () => false);
		render(<App />, scratch);
		expect(spy).toHaveBeenCalledOnce();

		render(<App foo="bar" />, scratch);
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('should pass props and nextProps to comparer fn', () => {
		const spy = vi.fn(() => false);
		function Foo() {
			return <div>foo</div>;
		}

		const props = { foo: true };
		const nextProps = { foo: false };
		const App = memo(Foo, spy);
		render(h(App, props), scratch);
		render(h(App, nextProps), scratch);

		expect(spy).toHaveBeenCalledWith(props, nextProps);
	});

	it('should nest without errors', () => {
		const Foo = () => <div>foo</div>;
		const App = memo(memo(Foo));

		// eslint-disable-next-line prefer-arrow-callback
		expect(function () {
			render(<App />, scratch);
		}).to.not.throw();
	});

	it('should pass ref through nested memos', () => {
		const Foo = props => <h1 ref={props.ref}>Hello World</h1>;

		const App = memo(memo(Foo));

		const ref = {};

		render(<App ref={ref} />, scratch);

		expect(ref.current).not.to.be.undefined;
		expect(ref.current).to.equal(scratch.firstChild);
	});

	it('should not unnecessarily reorder children #2895', () => {
		const array = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];

		const List = () => {
			const [selected, setSelected] = useState('');
			return (
				<ol>
					{array.map(item => (
						<ListItem
							{...{
								isSelected: item.name === selected,
								setSelected,
								...item
							}}
							key={item.name}
						/>
					))}
				</ol>
			);
		};

		const ListItem = memo(({ name, isSelected, setSelected }) => {
			const handleClick = () => setSelected(name);
			return (
				<li class={isSelected ? 'selected' : null} onClick={handleClick}>
					{name}
				</li>
			);
		});

		render(<List />, scratch);
		expect(scratch.innerHTML).to.equal(
			`<ol><li>A</li><li>B</li><li>C</li><li>D</li></ol>`
		);

		let listItem = scratch.querySelector('li:nth-child(3)');
		listItem.dispatchEvent(createEvent('click'));
		rerender();

		expect(scratch.innerHTML).to.equal(
			`<ol><li>A</li><li>B</li><li class="selected">C</li><li>D</li></ol>`
		);
	});
});
