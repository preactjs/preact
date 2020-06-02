import renderToString, { render, shallowRender, renderToStaticMarkup, renderToString as _renderToString } from '../src';
import { expect } from 'chai';

describe('render-to-string', () => {
	describe('exports', () => {
		it('exposes renderToString as default', () => {
			expect(renderToString).to.be.a('function');
		});

		it('exposes render as a named export', () => {
			expect(render).to.be.a('function');
			expect(render).to.equal(renderToString);
		});

		it('exposes renderToString as a named export', () => {
			expect(_renderToString).to.be.a('function');
			expect(_renderToString).to.equal(renderToString);
		});

		it('exposes renderToStaticMarkup as a named export', () => {
			expect(renderToStaticMarkup).to.be.a('function');
			expect(renderToStaticMarkup).to.equal(renderToStaticMarkup);
		});

		it('exposes shallowRender as a named export', () => {
			expect(shallowRender).to.be.a('function');
		});
	});
});
