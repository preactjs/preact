import { render, shallowRender } from '../src';
import { h, Component } from 'preact';
import chai, { expect } from 'chai';
import { spy, match } from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);

describe('pretty', () => {
	let prettyRender = jsx => render(jsx, {}, { pretty:true });

	it('should render no whitespace by default', () => {
		let rendered = render(
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		);

		expect(rendered).to.equal(`<section><a href="/foo">foo</a>bar<p>hello</p></section>`);
	});

	it('should render whitespace when pretty=true', () => {
		let rendered = prettyRender(
			<section>
				<a href="/foo">foo</a>
				bar
				<p>hello</p>
			</section>
		);

		expect(rendered).to.equal(`<section>\n\t<a href="/foo">foo</a>\n\tbar\n\t<p>hello</p>\n</section>`);
	});

	it('should not indent for short children', () => {
		let fourty = '';
		for (let i=40; i--; ) fourty += 'x';

		expect(
			prettyRender(<a href="/foo">{fourty}</a>),
			'<=40 characters'
		).to.equal(`<a href="/foo">${fourty}</a>`);

		expect(
			prettyRender(<a href="/foo">{fourty+'a'}</a>),
			'>40 characters'
		).to.equal(`<a href="/foo">\n\t${fourty+'a'}\n</a>`);
	});

	it('should handle self-closing tags', () => {
		expect(prettyRender(
			<div>
				hi
				<img src="a.jpg" />
				<img src="b.jpg" />
				<b>hi</b>
			</div>
		)).to.equal(`<div>\n\thi\n\t<img src="a.jpg">\n\t<img src="b.jpg">\n\t<b>hi</b>\n</div>`);
	});

	it('should support empty tags', () => {
		expect(prettyRender(
			<div>
				<span />
			</div>
		)).to.equal(`<div>\n\t<span></span>\n</div>`);
	});
});
