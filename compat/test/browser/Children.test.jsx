import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import { div, span } from '../../../test/_util/dom';
import React, {
	createElement,
	createRef,
	Children,
	Fragment,
	render
} from 'preact/compat';
import { vi } from 'vitest';

describe('Children', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	describe('.count', () => {
		let count;
		function Foo(props) {
			count = Children.count(props.children);
			return <div>{count}</div>;
		}

		it('should return 0 for no children', () => {
			render(<Foo />, scratch);
			expect(count).to.equal(0);
		});

		it('should return number of children', () => {
			render(
				<Foo>
					<div />
					foo
				</Foo>,
				scratch
			);
			expect(count).to.equal(2);
		});
	});

	describe('.only', () => {
		let actual;
		function Foo(props) {
			actual = Children.only(props.children);
			return <div>{actual}</div>;
		}

		it('should only allow 1 child', () => {
			render(<Foo>foo</Foo>, scratch);
			expect(actual).to.equal('foo');
		});

		it('should throw if no children are passed', () => {
			// eslint-disable-next-line prefer-arrow-callback
			expect(function () {
				render(<Foo />, scratch);
			}).to.throw();
		});

		it('should throw if more children are passed', () => {
			// eslint-disable-next-line prefer-arrow-callback
			expect(function () {
				render(
					<Foo>
						foo
						<span />
					</Foo>,
					scratch
				);
			}).to.throw();
		});
	});

	describe('.map', () => {
		function Foo(props) {
			let children = Children.map(props.children, child => (
				<span>{child}</span>
			));
			return <div>{children}</div>;
		}

		it('should iterate over children', () => {
			render(
				<Foo>
					foo<div>bar</div>
				</Foo>,
				scratch
			);
			let expected = div([span('foo'), span(div('bar'))]);
			expect(serializeHtml(scratch)).to.equal(expected);
		});

		it('should work with no children', () => {
			render(<Foo />, scratch);
			expect(serializeHtml(scratch)).to.equal('<div></div>');
		});

		it('should work with children as zero number', () => {
			const testNumber = 0;

			render(<Foo>{testNumber}</Foo>, scratch);
			expect(serializeHtml(scratch)).to.equal('<div><span>0</span></div>');
		});

		it('should propagate "this" context', () => {
			const context = {};
			const spy = vi.fn(child => child); // noop
			const Foo = ({ children }) => {
				return React.Children.map(children, spy, context);
			};
			render(<Foo>foo</Foo>, scratch);

			expect(spy.mock.contexts[0]).to.equal(context);
		});

		it('should flatten result', () => {
			const ProblemChild = ({ children }) => {
				return React.Children.map(children, child => {
					return React.Children.map(child.props.children, x => x);
				}).filter(React.isValidElement);
			};

			const App = () => {
				return (
					<ProblemChild>
						<div>
							<div>1</div>
							<div>2</div>
						</div>
					</ProblemChild>
				);
			};

			render(<App />, scratch);

			expect(scratch.textContent).to.equal('12');
		});

		it('should call with indices', () => {
			const assertion = [];
			const ProblemChild = ({ children }) => {
				return React.Children.map(children, (child, i) => {
					assertion.push(i);
					return React.Children.map(child.props.children, (x, j) => {
						assertion.push(j);
						return x;
					});
				}).filter(React.isValidElement);
			};

			const App = () => {
				return (
					<ProblemChild>
						<div>
							<div>1</div>
							<div>2</div>
						</div>
						<div>
							<div>3</div>
							<div>4</div>
						</div>
					</ProblemChild>
				);
			};

			render(<App />, scratch);
			expect(scratch.textContent).to.equal('1234');
			expect(assertion.length).to.equal(6);
		});
	});

	describe('.forEach', () => {
		function Foo(props) {
			let children = [];
			Children.forEach(props.children, child =>
				children.push(<span>{child}</span>)
			);
			return <div>{children}</div>;
		}

		it('should iterate over children', () => {
			render(
				<Foo>
					foo<div>bar</div>
				</Foo>,
				scratch
			);
			let expected = div([span('foo'), span(div('bar'))]);
			expect(serializeHtml(scratch)).to.equal(expected);
		});
	});

	describe('.toArray', () => {
		const keys = arr => arr.map(child => (child == null ? child : child.key));

		it('should key unkeyed elements by their index #2888', () => {
			const res = Children.toArray([<div />, <span />, <Fragment />]);
			expect(keys(res)).to.deep.equal(['.0', '.1', '.2']);
		});

		it('should prefix explicit keys like React #3403', () => {
			const res = Children.toArray([<div key="a" />, <span key={1} />]);
			expect(keys(res)).to.deep.equal(['.$a', '.$1']);
		});

		it('should key a single child', () => {
			expect(keys(Children.toArray(<div />))).to.deep.equal(['.0']);
			expect(keys(Children.toArray(<div key="a" />))).to.deep.equal(['.$a']);
		});

		it('should scope keys to nested arrays', () => {
			const res = Children.toArray([<i />, [<b key="x" />, <u />], [[<p />]]]);
			expect(keys(res)).to.deep.equal(['.0', '.1:$x', '.1:1', '.2:0:0']);
		});

		it('should count skipped holes and keep non-elements untouched', () => {
			const res = Children.toArray(['foo', null, false, <div />, 0]);
			expect(res.length).to.equal(3);
			expect(res[0]).to.equal('foo');
			expect(res[1].key).to.equal('.3');
			expect(res[2]).to.equal(0);
		});

		it('should escape "=" and ":" in explicit keys', () => {
			const res = Children.toArray([<div key="a:b=c" />]);
			expect(res[0].key).to.equal('.$a=2b=0c');
		});

		it('should not mutate the passed children', () => {
			const a = <div />;
			const b = <div key="b" />;
			const res = Children.toArray([a, b]);
			expect(a.key).to.equal(undefined);
			expect(b.key).to.equal('b');
			expect(res[0]).not.to.equal(a);
			expect(res[0].type).to.equal('div');
		});

		it('should keep refs and render the keyed children', () => {
			const ref = createRef();
			function Foo(props) {
				return <div>{Children.toArray(props.children)}</div>;
			}

			render(
				<Foo>
					<span ref={ref}>a</span>
					{[<span key="b">b</span>, <span key="c">c</span>]}
				</Foo>,
				scratch
			);

			expect(serializeHtml(scratch)).to.equal(
				'<div><span>a</span><span>b</span><span>c</span></div>'
			);
			expect(ref.current).to.equal(scratch.firstChild.firstChild);
		});
	});
});
