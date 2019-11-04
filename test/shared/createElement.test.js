import { createElement } from '../../';
import { expect } from 'chai';

const h = createElement;
/** @jsx createElement */
/*eslint-env browser, mocha */

// const buildVNode = (nodeName, attributes, children=[]) => ({
// 	nodeName,
// 	children,
// 	attributes,
// 	key: attributes && attributes.key
// });

describe('createElement(jsx)', () => {
	it('should return a VNode', () => {
		let r;
		expect(() => (r = h('foo'))).not.to.throw();
		expect(r).to.be.an('object');
		// expect(r).to.be.an.instanceof(VNode);
		expect(r).to.have.property('type', 'foo');
		expect(r)
			.to.have.property('props')
			.that.eql({});
		// expect(r).to.have.deep.property('props.children').that.eql(null);
	});

	it('should set VNode#type property', () => {
		expect(<div />).to.have.property('type', 'div');
		function Test() {
			return <div />;
		}
		expect(<Test />).to.have.property('type', Test);
	});

	it('should set VNode.constructor property to prevent json injection', () => {
		const vnode = <span />;
		expect(vnode.constructor).to.equal(undefined);
	});

	it('should set VNode#props property', () => {
		const props = {};
		expect(h('div', props).props).to.deep.equal(props);
	});

	it('should set VNode#key property', () => {
		expect(<div />).to.have.property('key').that.is.undefined;
		expect(<div a="a" />).to.have.property('key').that.is.undefined;
		expect(<div key="1" />).to.have.property('key', '1');
	});

	it('should not set VNode#props.key property', () => {
		expect(<div />).to.not.have.nested.property('props.key');
		expect(<div key="1" />).to.not.have.nested.property('props.key');
		expect(<div key={0} />).to.not.have.nested.property('props.key');
		expect(<div key={''} />).to.not.have.nested.property('props.key');
	});

	it('should set VNode#ref property', () => {
		expect(<div />).to.have.property('ref').that.is.undefined;
		expect(<div a="a" />).to.have.property('ref').that.is.undefined;
		const emptyFunction = () => {};
		expect(<div ref={emptyFunction} />).to.have.property('ref', emptyFunction);
	});

	it('should not set VNode#props.ref property', () => {
		expect(<div />).to.not.have.nested.property('props.ref');
		expect(<div ref={() => {}} />).to.not.have.nested.property('props.ref');
	});

	it('should have ordered VNode properties', () => {
		expect(Object.keys(<div />).filter(key => !/^_/.test(key))).to.deep.equal([
			'type',
			'props',
			'key',
			'ref',
			'constructor'
		]);
	});

	it('should preserve raw props', () => {
		let props = { foo: 'bar', baz: 10, func: () => {} },
			r = h('foo', props);
		expect(r)
			.to.be.an('object')
			.with.property('props')
			.that.deep.equals(props);
	});

	it('should support element children', () => {
		let kid1 = h('bar');
		let kid2 = h('baz');
		let r = h('foo', null, kid1, kid2);

		expect(r)
			.to.be.an('object')
			.with.nested.deep.property('props.children', [kid1, kid2]);
	});

	it('should support multiple element children, given as arg list', () => {
		let kid1 = h('bar');
		let kid3 = h('test');
		let kid2 = h('baz', null, kid3);

		let r = h('foo', null, kid1, kid2);

		expect(r)
			.to.be.an('object')
			.with.nested.deep.property('props.children', [kid1, kid2]);
	});

	it('should handle multiple element children, given as an array', () => {
		let kid1 = h('bar');
		let kid3 = h('test');
		let kid2 = h('baz', null, kid3);

		let r = h('foo', null, [kid1, kid2]);

		expect(r)
			.to.be.an('object')
			.with.nested.deep.property('props.children', [kid1, kid2]);
	});

	it('should support nested children', () => {
		const m = x => h(x);
		expect(h('foo', null, m('a'), [m('b'), m('c')], m('d')))
			.to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(h('foo', null, [m('a'), [m('b'), m('c')], m('d')]))
			.to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(h('foo', { children: [m('a'), [m('b'), m('c')], m('d')] }))
			.to.have.nested.property('props.children')
			.that.eql([m('a'), [m('b'), m('c')], m('d')]);

		expect(h('foo', { children: [[m('a'), [m('b'), m('c')], m('d')]] }))
			.to.have.nested.property('props.children')
			.that.eql([[m('a'), [m('b'), m('c')], m('d')]]);

		expect(h('foo', { children: m('a') }))
			.to.have.nested.property('props.children')
			.that.eql(m('a'));

		expect(h('foo', { children: 'a' }))
			.to.have.nested.property('props.children')
			.that.eql('a');
	});

	it('should support text children', () => {
		let r = h('foo', null, 'textstuff');

		expect(r)
			.to.be.an('object')
			.with.nested.property('props.children')
			.that.equals('textstuff');
	});

	it('should NOT merge adjacent text children', () => {
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

		expect(r)
			.to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals([
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
			]);
	});

	it('should not merge nested adjacent text children', () => {
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

		expect(r)
			.to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals([
				'one',
				['two', null, 'three'],
				null,
				['four', null, 'five', null],
				'six',
				null
			]);
	});
	it('should not merge children that are boolean values', () => {
		let r = h('foo', null, 'one', true, 'two', false, 'three');

		expect(r)
			.to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals(['one', true, 'two', false, 'three']);
	});

	it('should not merge children of components', () => {
		let Component = ({ children }) => children;
		let r = h(Component, null, 'x', 'y');

		expect(r)
			.to.be.an('object')
			.with.nested.property('props.children')
			.that.deep.equals(['x', 'y']);
	});

	it('should ignore props.children if children are manually specified', () => {
		expect(
			<div a children={['a', 'b']}>
				c
			</div>
		).to.eql(<div a>c</div>);
	});
});
