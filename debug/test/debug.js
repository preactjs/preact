import { createElement as h, options, render, createRef, Component, Fragment } from '../../src/index';
import { setupScratch, teardown, clearOptions } from '../../test/_util/helpers';
import { serializeVNode, initDebug } from '../../src/debug/debug';
import * as PropTypes from 'prop-types';

/** @jsx h */

describe('debug', () => {
	let scratch;
	let errors = [];

	let beforeDiffSpy;

	beforeEach(() => {
		errors = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));

		clearOptions();
		beforeDiffSpy = sinon.spy();
		options.beforeDiff = beforeDiffSpy;

		initDebug();
	});

	afterEach(() => {

		/** @type {*} */
		(console.error).restore();
		teardown(scratch);
	});

	it('should call previous options', () => {
		render(<div />, scratch);
		expect(beforeDiffSpy, 'beforeDiff').to.have.been.called;
	});

	it('should print an error on undefined component', () => {
		let fn = () => render(h(undefined), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error on invalid refs', () => {
		let fn = () => render(<div ref="a" />, scratch);
		expect(fn).to.throw(/createRef/);

		// Allow strings for compat
		let vnode = <div ref="a" />;

		/** @type {*} */
		(vnode).$$typeof = 'foo';
		render(vnode, scratch);
		expect(console.error).to.not.be.called;
	});

	it('should NOT print an error on valid refs', () => {
		let noop = () => {};
		render(<div ref={noop} />, scratch);

		let ref = createRef();
		render(<div ref={ref} />, scratch);
		expect(console.error).to.not.be.called;
	});

	describe('duplicate keys', () => {
		const List = props => <ul>{props.children}</ul>;
		const ListItem = props => <li>{props.children}</li>;

		it('should print an error on duplicate keys with DOM nodes', () => {
			render(<div><span key="a" /><span key="a" /></div>, scratch);
			expect(console.error).to.be.calledOnce;
		});

		it('should print an error on duplicate keys with Components', () => {
			function App() {
				return (
					<List>
						<ListItem key="a">a</ListItem>
						<ListItem key="b">b</ListItem>
						<ListItem key="b">d</ListItem>
						<ListItem key="d">d</ListItem>
					</List>
				);
			}

			render(<App />, scratch);
			// The error is printed twice. Once for children of <List>
			// and again for children of <ul> (since List returns props.children)
			expect(console.error).to.be.calledTwice;
		});

		it('should print an error on duplicate keys with Fragments', () => {
			function App() {
				return (
					<Fragment>
						<List key="list">
							<ListItem key="a">a</ListItem>
							<ListItem key="b">b</ListItem>
							<Fragment key="b">
								{/* Should be okay to dupliate keys since these are inside a Fragment */}
								<ListItem key="a">c</ListItem>
								<ListItem key="b">d</ListItem>
								<ListItem key="c">e</ListItem>
							</Fragment>
							<ListItem key="f">f</ListItem>
						</List>,
						<div key="list">sibling</div>
					</Fragment>
				);
			}

			render(<App />, scratch);
			// One error is printed twice. Once for children of <List>
			// and again for children of <ul> (since List returns props.children)
			expect(console.error).to.be.calledThrice;
		});
	});

	describe('serializeVNode', () => {
		it('should prefer a function component\'s displayName', () => {
			function Foo() {
				return <div />;
			}
			Foo.displayName = 'Bar';

			expect(serializeVNode(<Foo />)).to.equal('<Bar />');
		});

		it('should prefer a class component\'s displayName', () => {
			class Bar extends Component {
				render() {
					return <div />;
				}
			}
			Bar.displayName = 'Foo';

			expect(serializeVNode(<Bar />)).to.equal('<Foo />');
		});

		it('should serialize vnodes without children', () => {
			expect(serializeVNode(<br />)).to.equal('<br />');
		});

		it('should serialize vnodes with children', () => {
			expect(serializeVNode(<div>Hello World</div>)).to.equal('<div>..</div>');
		});

		it('should serialize components', () => {
			function Foo() {
				return <div />;
			}
			expect(serializeVNode(<Foo />)).to.equal('<Foo />');
		});

		it('should serialize props', () => {
			expect(serializeVNode(<div class="foo" />)).to.equal('<div class="foo" />');

			let noop = () => {};
			expect(serializeVNode(<div onClick={noop} />))
				.to.equal('<div onClick="function noop() {}" />');

			function Foo(props) {
				return props.foo;
			}

			expect(serializeVNode(<Foo foo={[1, 2, 3]} />))
				.to.equal('<Foo foo="1,2,3" />');
		});
	});

	describe('PropTypes', () => {
		it('should fail if props don\'t match prop-types', () => {
			function Foo(props) {
				return <h1>{props.text}</h1>;
			}

			Foo.propTypes = {
				text: PropTypes.string.isRequired
			};

			render(<Foo />, scratch);

			expect(console.error).to.be.calledOnce;
			expect(errors[0].includes('required')).to.equal(true);
		});

		it('should not print to console when types are correct', () => {
			function Bar(props) {
				return <h1>{props.text}</h1>;
			}

			Bar.propTypes = {
				text: PropTypes.string.isRequired
			};

			render(<Bar text="foo" />, scratch);
			expect(console.error).to.not.be.called;
		});
	});
});
