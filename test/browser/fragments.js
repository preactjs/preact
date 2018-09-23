import { createElement as h, render, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, setupRerender } from '../_util/helpers';

/** @jsx h */
/* eslint-disable react/jsx-boolean-value */

describe('Fragment', () => {

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

	describe('Fragment', () => {
		it('should not render empty Fragment', () => {
			render(<Fragment />, scratch);
			expect(scratch.innerHTML).to.equal('');
		});

		it('should just render children for fragments', () => {
			class Comp extends Component {
				render() {
					return (
						<Fragment>
							<div>Child1</div>
							<div>Child2</div>
						</Fragment>
					);
				}
			}

			render(<Comp />, scratch);
			expect(scratch.innerHTML).to.equal('<div>Child1</div><div>Child2</div>');
		});

		it('should render nested Fragments', () => {
			render((
				<Fragment>
					spam
					<Fragment>foo</Fragment>
					<Fragment />
					bar
				</Fragment>
			), scratch);
			expect(scratch.innerHTML).to.equal('spamfoobar');

			render((
				<Fragment>
					<Fragment>foo</Fragment>
					<Fragment>bar</Fragment>
				</Fragment>
			), scratch);
			expect(scratch.innerHTML).to.equal('foobar');
		});

		it('should respect keyed Fragments', () => {

			/** @type {() => void} */
			let update;

			class Comp extends Component {

				constructor() {
					super();
					this.state = { key: 'foo' };
					update = () => this.setState({ key: 'bar' });
				}

				render() {
					return <Fragment key={this.state.key}>foo</Fragment>;
				}
			}
			render(<Comp />, scratch);
			expect(scratch.innerHTML).to.equal('foo');

			update();
			rerender();

			expect(scratch.innerHTML).to.equal('foo');
		});

		it.skip('should support conditionally rendered children', () => {

			/** @type {() => void} */
			let update;

			class Comp extends Component {

				constructor() {
					super();
					this.state = { value: true };
					update = () => this.setState({ value: !this.state.value });
				}

				render() {
					return (
						<Fragment>
							{this.state.value && 'foo'}
						</Fragment>
					);
				}
			}

			render(<Comp />, scratch);
			expect(scratch.innerHTML).to.equal('foo');

			update();
			rerender();

			expect(scratch.innerHTML).to.equal('');

			update();
			rerender();
			expect(scratch.innerHTML).to.equal('foo');
		});

		it.skip('can modify the children of a Fragment', () => {

			/** @type {() => void} */
			let push;

			class List extends Component {
				constructor() {
					super();
					this.state = { values: [0, 1, 2] };
					push = () =>
						this.setState({
							values: [...this.state.values, this.state.values.length]
						});
				}

				render() {
					return (
						<Fragment>
							{this.state.values.map(value => (
								<div>{value}</div>
							))}
						</Fragment>
					);
				}
			}

			render(<List />, scratch);
			expect(scratch.textContent).to.equal('012');

			push();
			rerender();

			expect(scratch.textContent).to.equal('0123');

			push();
			rerender();

			expect(scratch.textContent).to.equal('01234');
		});

		it.skip('should render sibling array children', () => {
			const Group = ({ title, values }) => (
				<Fragment>
					<li class="divider">{title}</li>
					{values.map(value => <li>{value}</li>)}
				</Fragment>
			);

			const Todo = () => (
				<ul>
					<Group title={'A header'} values={['a', 'b']} />
					<Group title={'A divider'} values={['c', 'd']} />
					<li>A footer</li>
				</ul>
			);

			render(<Todo />, scratch);

			let ul = scratch.firstChild;
			expect(ul.childNodes.length).to.equal(7);
			expect(ul.childNodes[0].textContent).to.equal('A header');
			expect(ul.childNodes[1].textContent).to.equal('a');
			expect(ul.childNodes[2].textContent).to.equal('b');
			expect(ul.childNodes[3].textContent).to.equal('A divider');
			expect(ul.childNodes[4].textContent).to.equal('c');
			expect(ul.childNodes[5].textContent).to.equal('d');
			expect(ul.childNodes[6].textContent).to.equal('A footer');
		});

		it.skip('should reorder Fragment children', () => {
			let updateState;
			class App extends Component {
				constructor() {
					super();
					this.state = { active: false };
					updateState = () => this.setState(prev => ({ active: !prev.active }));
				}

				render() {
					return (
						<div>
							<h1>Heading</h1>
							{!this.state.active ? (
								<Fragment>
									foobar
									<Fragment>
										Hello World
										<h2>yo</h2>
									</Fragment>
									<input type="text" />
								</Fragment>
							) : (
								<Fragment>
									<Fragment>
										Hello World
										<h2>yo</h2>
									</Fragment>
									foobar
									<input type="text" />
								</Fragment>
							)}
						</div>
					);
				}
			}

			render(<App />, scratch);

			expect(scratch.innerHTML).to.equal('<div><h1>Heading</h1>foobarHello World<h2>yo</h2><input type="text"></div>');

			updateState();
			rerender();

			expect(scratch.innerHTML).to.equal('<div><h1>Heading</h1>Hello World<h2>yo</h2>foobar<input type="text"></div>');
		});
	});
});
