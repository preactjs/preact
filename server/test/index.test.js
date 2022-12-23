import renderToString from '../src';
import { default as renderToStringPretty, shallowRender } from '../src/jsx';
import { expect } from 'chai';
import './setup';

describe('render-to-string', () => {
	describe('exports', () => {
		it('exposes renderToString as default', () => {
			expect(renderToString).to.be.a('function');
		});
	});
});

describe('render-to-string/jsx', () => {
	it('exposes renderToStringPretty as default export', () => {
		expect(renderToStringPretty).to.be.a('function');
	});

	it('exposes shallowRender as a named export', () => {
		expect(shallowRender).to.be.a('function');
	});
});
