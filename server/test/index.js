import render from '../src';
import { h, Component } from 'preact';
import { expect, use } from 'chai';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
use(sinonChai);

describe('render-to-string', () => {
	describe('Basic JSX', () => {
		it('should render JSX', () => {
			let rendered = render(<div class="foo">bar</div>),
				expected = `<div class="foo">bar</div>`;

			expect(rendered).to.equal(expected);
		});

		it('should omit null and undefined attributes', () => {
			let rendered = render(<div a={null} b={undefined} />),
				expected = `<div></div>`;

			expect(rendered).to.equal(expected);
		});
	});

	describe('Functional Components', () => {
		it('should render functional components', () => {
			let Test = spy( ({ foo, children }) => <div foo={foo}>{ children }</div> );

			let rendered = render(<Test foo="test">content</Test>);

			expect(rendered)
				.to.equal(`<div foo="test">content</div>`);

			expect(Test)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 'test',
						children: ['content']
					})
				);
		});

		it('should render functional components within JSX', () => {
			let Test = spy( ({ foo, children }) => <div foo={foo}>{ children }</div> );

			let rendered = render(
				<section>
					<Test foo={1}><span>asdf</span></Test>
				</section>
			);

			expect(rendered)
				.to.equal(`<section><div foo="1"><span>asdf</span></div></section>`);

			expect(Test)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 1,
						children: [
							match({ nodeName:'span', children:['asdf'] })
						]
					})
				);
		});
	});

	describe('Classical Components', () => {
		it('should render classical components', () => {
			class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			}

			Test = spy(Test);
			spy(Test.prototype, 'render');

			let rendered = render(<Test foo="test">content</Test>);

			expect(rendered)
				.to.equal(`<div foo="test">content</div>`);

			expect(Test).to.have.been.calledOnce;

			expect(Test.prototype.render)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 'test',
						children: ['content']
					}),
					match({})	// empty state
				);
		});

		it('should render classical components within JSX', () => {
			class Test extends Component {
				render({ foo, children }, state) {
					return <div foo={foo}>{ children }</div>;
				}
			}

			Test = spy(Test);
			spy(Test.prototype, 'render');

			let rendered = render(
				<section>
					<Test foo={1}><span>asdf</span></Test>
				</section>
			);

			expect(rendered)
				.to.equal(`<section><div foo="1"><span>asdf</span></div></section>`);

			expect(Test).to.have.been.calledOnce;

			expect(Test.prototype.render)
				.to.have.been.calledOnce
				.and.calledWithExactly(
					match({
						foo: 1,
						children: [
							match({ nodeName:'span', children:['asdf'] })
						]
					}),
					match({})	// empty state
				);
		});
	});

	describe('className / class massaging', () => {
		it('should render class using className', () => {
			let rendered = render(<div className="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
		});

		it('should render class using class', () => {
			let rendered = render(<div class="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
		});

		it('should prefer className over class', () => {
			let rendered = render(<div class="foo" className="foo bar" />);
			expect(rendered).to.equal('<div class="foo bar"></div>');
		});
	});
});
