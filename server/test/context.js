import render from '../src/jsx';
import { h, createContext } from 'preact';
import chai, { expect } from 'chai';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

// tag to remove leading whitespace from tagged template literal
function dedent([str]) {
	return str.split( '\n'+str.match(/^\n*(\s+)/)[1] ).join('\n').replace(/(^\n+|\n+\s*$)/g, '');
}

describe('context', () => {
	let renderJsx = (jsx, opts) => render(jsx, null, opts).replace(/ {2}/g, '\t');

	it('should support createContext', () => {
		const { Provider, Consumer } = createContext();
		let rendered = renderJsx(
			<Provider value="correct">
				<Consumer>
					{(value) => (
						<section>
							value is: {value}
						</section>
					)}
				</Consumer>
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
				<Consumer>
					{(value) => (
						<section>
							value is: {value}
						</section>
					)}
				</Consumer>
			</Provider>
		);

		expect(rendered).to.equal(dedent`
			<section>value is: </section>
		`);
	});
});
