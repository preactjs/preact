import { h } from '../../src/preact';
import { VNode } from '../../src/vnode';
import { expect } from 'chai';

/*eslint-env browser, mocha */

/** @jsx h */

const buildVNode = (nodeName, attributes, children=[]) => ({
	nodeName,
	children,
	attributes,
	key: attributes && attributes.key
});

describe('h(jsx)', () => {
	it('should return a VNode', () => {
		let r;
		expect( () => r = h('foo') ).not.to.throw();
		expect(r).to.be.an('object');
		expect(r).to.be.an.instanceof(VNode);
		expect(r).to.have.property('nodeName', 'foo');
		expect(r).to.have.property('attributes', undefined);
		expect(r).to.have.property('children').that.eql([]);
	});

	it('should preserve raw attributes', () => {
		let attrs = { foo:'bar', baz:10, func:()=>{} },
			r = h('foo', attrs);
		expect(r).to.be.an('object')
			.with.property('attributes')
			.that.deep.equals(attrs);
	});

	it('should support element children', () => {
		let r = h(
			'foo',
			null,
			h('bar'),
			h('baz')
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				buildVNode('bar'),
				buildVNode('baz')
			]);
	});

	it('should support multiple element children, given as arg list', () => {
		let r = h(
			'foo',
			null,
			h('bar'),
			h('baz', null, h('test'))
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				buildVNode('bar'),
				buildVNode('baz', undefined, [
					buildVNode('test')
				])
			]);
	});

	it('should handle multiple element children, given as an array', () => {
		let r = h(
			'foo',
			null,
			[
				h('bar'),
				h('baz', null, h('test'))
			]
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				buildVNode('bar'),
				buildVNode('baz', undefined, [
					buildVNode('test')
				])
			]);
	});

	it('should handle multiple children, flattening one layer as needed', () => {
		let r = h(
			'foo',
			null,
			h('bar'),
			[
				h('baz', null, h('test'))
			]
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				buildVNode('bar'),
				buildVNode('baz', undefined, [
					buildVNode('test')
				])
			]);
	});

	it('should support nested children', () => {
		const m = x => h(x);
		expect(
			h('foo', null, m('a'), [m('b'), m('c')], m('d'))
		).to.have.property('children').that.eql(['a', 'b', 'c', 'd'].map(m));

		expect(
			h('foo', null, [m('a'), [m('b'), m('c')], m('d')])
		).to.have.property('children').that.eql(['a', 'b', 'c', 'd'].map(m));

		expect(
			h('foo', { children: [m('a'), [m('b'), m('c')], m('d')] })
		).to.have.property('children').that.eql(['a', 'b', 'c', 'd'].map(m));

		expect(
			h('foo', { children: [[m('a'), [m('b'), m('c')], m('d')]] })
		).to.have.property('children').that.eql(['a', 'b', 'c', 'd'].map(m));

		expect(
			h('foo', { children: m('a') })
		).to.have.property('children').that.eql([m('a')]);

		expect(
			h('foo', { children: 'a' })
		).to.have.property('children').that.eql(['a']);
	});

	it('should support text children', () => {
		let r = h(
			'foo',
			null,
			'textstuff'
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.with.length(1)
			.with.property('0')
			.that.equals('textstuff');
	});

	it('should merge adjacent text children', () => {
		let r = h(
			'foo',
			null,
			'one',
			'two',
			h('bar'),
			'three',
			h('baz'),
			h('baz'),
			'four',
			null,
			'five',
			'six'
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				'onetwo',
				buildVNode('bar'),
				'three',
				buildVNode('baz'),
				buildVNode('baz'),
				'fourfivesix'
			]);
	});

	it('should merge nested adjacent text children', () => {
		let r = h(
			'foo',
			null,
			'one',
			['two', null, 'three'],
			null,
			['four', null, 'five', null],
			'six',
			null
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				'onetwothreefourfivesix'
			]);
	});
	it('should not merge children that are boolean values', () => {
		let r = h(
			'foo',
			null,
			'one',
			true,
			'two',
			false,
			'three'
		);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals(['onetwothree']);
	});

	it('should not merge children of components', () => {
		let Component = ({children}) => children;
		let r = h(Component, null, 'x', 'y');

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals(['x', 'y']);
	});
});
