import { Component, createElement, createRef, options } from 'preact';
import {
	jsx,
	jsxs,
	jsxDEV,
	Fragment,
	jsxAttr,
	jsxTemplate,
	jsxEscape
} from 'preact/jsx-runtime';
import { setupScratch, teardown } from '../../../test/_util/helpers';
import { encodeEntities } from 'preact/jsx-runtime/src/utils';

describe('Babel jsx/jsxDEV', () => {
	let scratch;
	let prevVNodeOption;

	beforeEach(() => {
		scratch = setupScratch();
		prevVNodeOption = options.vnode;
	});

	afterEach(() => {
		options.vnode = prevVNodeOption;
		teardown(scratch);
	});

	it('should have needed exports', () => {
		expect(typeof jsx).to.equal('function');
		expect(typeof jsxs).to.equal('function');
		expect(typeof jsxDEV).to.equal('function');
		expect(typeof Fragment).to.equal('function');
	});

	it('should keep ref in props', () => {
		const ref = () => null;
		const props = { ref };
		const vnode = jsx('div', props);
		expect(vnode.ref).to.equal(ref);
		expect(vnode.props).to.not.equal(props);
	});

	it('should not copy props wen there is no ref in props', () => {
		const props = { x: 'y' };
		const vnode = jsx('div', props);
		expect(vnode.props).to.equal(props);
	});

	it('should add keys', () => {
		const vnode = jsx('div', null, 'foo');
		expect(vnode.key).to.equal('foo');
	});

	it('should set __source and __self', () => {
		const vnode = jsx('div', { class: 'foo' }, 'key', false, 'source', 'self');
		expect(vnode.__source).to.equal('source');
		expect(vnode.__self).to.equal('self');
	});

	it('should return a vnode like createElement', () => {
		const elementVNode = createElement('div', {
			class: 'foo',
			key: 'key'
		});
		const jsxVNode = jsx('div', { class: 'foo' }, 'key');
		delete jsxVNode.__self;
		delete jsxVNode.__source;
		delete jsxVNode._original;
		delete elementVNode._original;
		expect(jsxVNode).to.deep.equal(elementVNode);
	});

	// #2839
	it('should remove ref from props', () => {
		const ref = createRef();
		const vnode = jsx('div', { ref }, null);
		expect(vnode.props).to.deep.equal({});
		expect(vnode.ref).to.equal(ref);
	});

	it('should call options.vnode with the vnode', () => {
		options.vnode = sinon.spy();
		const vnode = jsx('div', { class: 'foo' }, 'key');
		expect(options.vnode).to.have.been.calledWith(vnode);
	});
});

describe('encodeEntities', () => {
	it('should encode', () => {
		expect(encodeEntities("&<'")).to.equal("&amp;&lt;'");
	});
});

describe('precompiled JSX', () => {
	describe('jsxAttr', () => {
		beforeEach(() => {
			options.attr = undefined;
		});

		afterEach(() => {
			options.attr = undefined;
		});

		it('should render simple values', () => {
			expect(jsxAttr('foo', 'bar')).to.equal('foo="bar"');
		});

		it('should render boolean values', () => {
			expect(jsxAttr('foo', true)).to.equal('foo');
			expect(jsxAttr('foo', false)).to.equal('');
		});

		it('should ignore invalid values', () => {
			expect(jsxAttr('foo', false)).to.equal('');
			expect(jsxAttr('foo', null)).to.equal('');
			expect(jsxAttr('foo', undefined)).to.equal('');
			expect(jsxAttr('foo', () => null)).to.equal('');
			expect(jsxAttr('foo', [])).to.equal('');
			expect(jsxAttr('key', 'foo')).to.equal('');
			expect(jsxAttr('ref', 'foo')).to.equal('');
		});

		it('should escape values', () => {
			expect(jsxAttr('foo', "&<'")).to.equal('foo="&amp;&lt;\'"');
		});

		it('should call options.attr()', () => {
			options.attr = (name, value) => {
				return `data-${name}="foo${value}"`;
			};

			expect(jsxAttr('foo', 'bar')).to.equal('data-foo="foobar"');
		});

		it('should serialize style object', () => {
			expect(jsxAttr('style', { padding: 3 })).to.equal('style="padding:3px;"');
		});
	});

	describe('jsxTemplate', () => {
		it('should construct basic template vnode', () => {
			const tpl = [`<div>foo</div>`];
			const vnode = jsxTemplate(tpl);
			expect(vnode.props.tpl).to.equal(tpl);
			expect(vnode.type).to.equal(Fragment);
			expect(vnode.key).not.to.equal(null);
		});

		it('should constructe template vnode with expressions', () => {
			const tpl = [`<div>foo`, '</div>'];
			const vnode = jsxTemplate(tpl, 'bar');
			expect(vnode.props.tpl).to.equal(tpl);
			expect(vnode.props.exprs).to.deep.equal(['bar']);
			expect(vnode.type).to.equal(Fragment);
			expect(vnode.key).not.to.equal(null);
		});
	});

	describe('jsxEscape', () => {
		it('should escape string children', () => {
			expect(jsxEscape('foo')).to.equal('foo');
			expect(jsxEscape(2)).to.equal('2');
			expect(jsxEscape('&"<')).to.equal('&amp;&quot;&lt;');
			expect(jsxEscape(null)).to.equal(null);
			expect(jsxEscape(undefined)).to.equal(null);
			expect(jsxEscape(true)).to.equal(null);
			expect(jsxEscape(false)).to.equal(null);
		});

		it("should leave VNode's as is", () => {
			const vnode = jsx('div', null);
			expect(jsxEscape(vnode)).to.equal(vnode);
		});

		it('should escape arrays', () => {
			const vnode = jsx('div', null);
			expect(
				jsxEscape([vnode, 'foo&"<', null, undefined, true, false, 2, 'foo'])
			).to.deep.equal([
				vnode,
				'foo&amp;&quot;&lt;',
				null,
				null,
				null,
				null,
				'2',
				'foo'
			]);
		});
	});
});
