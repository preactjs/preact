import { render, shallowRender } from '../src';
import { h, Component } from 'preact';
import chai, { expect } from 'chai';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

// tag to remove leading whitespace from tagged template literal
function dedent([str]) {
	return str.split( '\n'+str.match(/^\n*(\s+)/)[1] ).join('\n').replace(/(^\n+|\n+\s*$)/g, '');
}

describe('jsx', () => {
	let renderJsx = jsx => render(jsx, {}, { jsx:true, xml:true, pretty:'  ' }).replace(/ {2}/g, '\t');

	it('should render as JSX', () => {
		let rendered = renderJsx(
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		);

		expect(rendered).to.equal(dedent`
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		`);
	});

	it('should render JSX attributes inline if short enough', () => {
		expect(renderJsx(
			<a b="c">bar</a>
		)).to.equal(dedent`
			<a b="c">bar</a>
		`);

		expect(renderJsx(
			<a b>bar</a>
		)).to.equal(dedent`
			<a b={true}>bar</a>
		`);

		expect(renderJsx(
			<a b={false}>bar</a>
		)).to.equal(dedent`
			<a b={false}>bar</a>
		`);
	});

	it('should render JSX attributes as multiline if complex', () => {
		expect(renderJsx(
			<a b={['a','b','c','d']}>bar</a>
		)).to.equal(dedent`
			<a
				b={
					Array [
						"a",
						"b",
						"c",
						"d"
					]
				}
			>
				bar
			</a>
		`);
	});

	it('should render attributes containing VNodes', () => {
		expect(renderJsx(
			<a b={<c />}>bar</a>
		)).to.equal(dedent`
			<a b={<c />}>bar</a>
		`);

		expect(renderJsx(
			<a b={[
				<c />,
				<d f="g" />
			]}>bar</a>
		)).to.equal(dedent`
			<a
				b={
					Array [
						<c />,
						<d f="g" />
					]
				}
			>
				bar
			</a>
		`);
	});
});
