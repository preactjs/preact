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
import { li, ol } from '../../../test/_util/dom';

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
		let spy = sinon.spy();

		function Foo() {
			spy();
			return <h1>Hello World</h1>;
		}

		let Memoized = memo(Foo);

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

		expect(spy).to.be.calledOnce;

		update();
		rerender();

		expect(spy).to.be.calledOnce;
	});

	it('should support adding refs', () => {
		let spy = sinon.spy();

		let ref = null;

		function Foo() {
			spy();
			return <h1>Hello World</h1>;
		}

		let Memoized = memo(Foo);

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

		expect(spy).to.be.calledOnce;

		ref = {};

		update();
		rerender();

		expect(ref.current).not.to.be.undefined;

		// TODO: not sure whether this is in-line with react...
		expect(spy).to.be.calledTwice;
	});

	it('should support custom comparer functions', () => {
		function Foo() {
			return <h1>Hello World</h1>;
		}

		let spy = sinon.spy(() => true);
		let Memoized = memo(Foo, spy);

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

		expect(spy).to.be.calledOnce;
		expect(spy).to.be.calledWith({}, {});
	});

	it('should rerender when custom comparer returns false', () => {
		const spy = sinon.spy();
		function Foo() {
			spy();
			return <h1>Hello World</h1>;
		}

		const App = memo(Foo, () => false);
		render(<App />, scratch);
		expect(spy).to.be.calledOnce;

		render(<App foo="bar" />, scratch);
		expect(spy).to.be.calledTwice;
	});

	it('should pass props and nextProps to comparer fn', () => {
		const spy = sinon.spy(() => false);
		function Foo() {
			return <div>foo</div>;
		}

		const props = { foo: true };
		const nextProps = { foo: false };
		const App = memo(Foo, spy);
		render(h(App, props), scratch);
		render(h(App, nextProps), scratch);

		expect(spy).to.be.calledWith(props, nextProps);
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
		class Foo extends Component {
			render() {
				return <h1>Hello World</h1>;
			}
		}

		const App = memo(memo(Foo));

		const ref = {};

		render(<App ref={ref} />, scratch);

		expect(ref.current).not.to.be.undefined;
		expect(ref.current).to.be.instanceOf(Foo);
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
