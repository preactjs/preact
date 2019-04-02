import { createElement as h, options, render, createRef, Component, Fragment } from 'preact';
import { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'preact/hooks';
import { setupScratch, teardown, clearOptions } from '../../../test/_util/helpers';
import { serializeVNode, initDebug } from '../../src/debug';
import * as PropTypes from 'prop-types';

/** @jsx h */

describe('debug', () => {
	let scratch;
	let errors = [];
	let warnings = [];

	let diffSpy;

	beforeEach(() => {
		errors = [];
		warnings = [];
		scratch = setupScratch();
		sinon.stub(console, 'error').callsFake(e => errors.push(e));
		sinon.stub(console, 'warn').callsFake(w => warnings.push(w));

		clearOptions();
		diffSpy = sinon.spy();
		options.diff = diffSpy;

		initDebug();
	});

	afterEach(() => {

		/** @type {*} */
		(console.error).restore();
		(console.warn).restore();
		teardown(scratch);
	});

	it('should call previous options', () => {
		render(<div />, scratch);
		expect(diffSpy, 'diff').to.have.been.called;
	});

	it('should print an error on rendering on undefined parent', () => {
		let fn = () => render(<div />, undefined);
		expect(fn).to.throw(/render/);
	});

	it('should print an error on rendering on invalid parent', () => {
		let fn = () => render(<div />, 6);
		expect(fn).to.throw(/valid HTML node/);
		expect(fn).to.throw(/<div/);
	});

	it('should print an error with (function) component name when available', () => {
		const App = () => <div />;
		let fn = () => render(<App />, 6);
		expect(fn).to.throw(/<App/);
		expect(fn).to.throw(/6/);
		fn = () => render(<App />, {});
		expect(fn).to.throw(/<App/);
		expect(fn).to.throw(/[object Object]/);
	});

	it('should print an error with (class) component name when available', () => {
		class App extends Component {
			render() {
				return <div />;
			}
		}
		let fn = () => render(<App />, 6);
		expect(fn).to.throw(/<App/);
	});

	it('should print an error on undefined component', () => {
		let fn = () => render(h(undefined), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should throw an error for argumentless useEffect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useEffect(() => 'test');
			return (
				<p>{state}</p>
			);
		};
		const fn = () => render(<App />, scratch);
		expect(fn).to.throw(/You should provide an array of arguments/);
	});

	it('should throw an error for argumentless useLayoutEffect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useLayoutEffect(() => 'test');
			return (
				<p>{state}</p>
			);
		};
		const fn = () => render(<App />, scratch);
		expect(fn).to.throw(/You should provide an array of arguments/);
	});

	it('should not throw an error for argumented effect hooks', () => {
		const App = () => {
			const [state] = useState('test');
			useLayoutEffect(() => 'test', []);
			useEffect(() => 'test', [state]);
			return (
				<p>{state}</p>
			);
		};
		const fn = () => render(<App />, scratch);
		expect(fn).to.not.throw();
	});

	it('should print an error on double jsx conversion', () => {
		let Foo = <div />;
		let fn = () => render(h(<Foo />), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should print an error when component is an array', () => {
		let fn = () => render(h([<div />]), scratch);
		expect(fn).to.throw(/createElement/);
	});

	it('should warn for useless useMemo calls', () => {
		const App = () => {
			const [people] = useState([40, 20,60, 80]);
			const retiredPeople = useMemo(() => people.filter(x => x >= 60));
			const cb = useCallback(() => () => 'test');
			return <p onClick={cb}>{retiredPeople.map(x => x)}</p>;
		};
		render(<App />, scratch);
		expect(warnings.length).to.equal(2);
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

	it('should print an error on invalid handler', () => {
		let fn = () => render(<div onclick="a" />, scratch);
		expect(fn).to.throw(/"onclick" property should be a function/);
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

		it('should allow distinct object keys', () => {
			const A = { is: 'A' };
			const B = { is: 'B' };
			render(<div><span key={A} /><span key={B} /></div>, scratch);
			expect(console.error).not.to.be.called;
		});

		it('should print an error for duplicate object keys', () => {
			const A = { is: 'A' };
			render(<div><span key={A} /><span key={A} /></div>, scratch);
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
