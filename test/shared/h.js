import { h } from '../../src/preact';
import VNode from '../../src/vnode';
import { expect } from 'chai';

/*eslint-env browser, mocha */

/** @jsx h */

let flatten = obj => JSON.parse(JSON.stringify(obj));

describe('h(jsx)', () => {
	it('should return a VNode', () => {
		let r;
		expect( () => r = h('foo') ).not.to.throw();
		expect(r).to.be.an('object');
		expect(r).to.be.an.instanceof(VNode);
		expect(r).to.have.property('nodeName', 'foo');
		expect(r).to.have.property('attributes', undefined);
		expect(r).to.have.property('children', undefined);
	});

	it('should perserve raw attributes', () => {
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
				new VNode('bar'),
				new VNode('baz')
			]);
	});

	it('should support element children', () => {
		let r = h(
			'foo',
			null,
			h('bar'),
			h('baz', null, h('test'))
		);

		r = flatten(r);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				{ nodeName:'bar' },
				{ nodeName:'baz', children:[
					{ nodeName:'test' }
				]}
			]);
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
			'five',
			'six'
		);

		r = flatten(r);

		expect(r).to.be.an('object')
			.with.property('children')
			.that.deep.equals([
				'onetwo',
				{ nodeName:'bar' },
				'three',
				{ nodeName:'baz' },
				{ nodeName:'baz' },
				'fourfivesix'
			]);
	});
});
