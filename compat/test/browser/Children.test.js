import {
	setupScratch,
	teardown,
	serializeHtml
} from '../../../test/_util/helpers';
import { div, span } from '../../../test/_util/dom';
import React, { createElement, Children, render } from 'preact/compat';

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
			expect(function() {
				render(<Foo />, scratch);
			}).to.throw();
		});

		it('should throw if more children are passed', () => {
			// eslint-disable-next-line prefer-arrow-callback
			expect(function() {
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
});
