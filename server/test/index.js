import renderToString, { render, shallowRender } from '../src';
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

		it('exposes shallowRender as a named export', () => {
			expect(shallowRender).to.be.a('function');
		});
	});
});
