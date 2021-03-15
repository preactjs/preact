import render from '../src/jsx';
import { h, createContext, Component } from 'preact';
import { expect } from 'chai';
import { dedent } from './utils';

describe('context', () => {
	let renderJsx = (jsx, opts) => render(jsx, null, opts).replace(/ {2}/g, '\t');

	it('should support class component as consumer', () => {
		const Ctx = createContext();

		class ClassConsumer extends Component {
			render() {
				const value = this.context;
				return <section>value is: {value}</section>;
			}
		}
		ClassConsumer.contextType = Ctx;

		let rendered = renderJsx(
			<Ctx.Provider value="correct">
				<ClassConsumer />
			</Ctx.Provider>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: correct</section>
		`);
	});

	it('should support createContext', () => {
		const { Provider, Consumer } = createContext();
		let rendered = renderJsx(
			<Provider value="correct">
				<Consumer>{(value) => <section>value is: {value}</section>}</Consumer>
			</Provider>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: correct</section>
		`);
	});

	it('should support nested Providers', () => {
		const { Provider, Consumer } = createContext();
		let rendered = renderJsx(
			<Provider value="wrong">
				<Provider value="correct">
					<Consumer>{(value) => <section>value is: {value}</section>}</Consumer>
				</Provider>
			</Provider>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: correct</section>
		`);
	});

	it('should support falsy context value', () => {
		const { Provider, Consumer } = createContext();
		let rendered = renderJsx(
			<Provider value={null}>
				<Consumer>{(value) => <section>value is: {value}</section>}</Consumer>
			</Provider>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: </section>
		`);
	});

	it('should support default context value with absent provider', () => {
		const { Consumer } = createContext('correct');
		let rendered = renderJsx(
			<Consumer>{(value) => <section>value is: {value}</section>}</Consumer>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: correct</section>
		`);
	});
});
