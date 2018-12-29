// eslint-disable-next-line no-unused-vars
import React from '../../../../src/compat';
import ReactFragment from '../../../../compat/lib/ReactFragment';

describe('ReactFragment', () => {
	it('should export .create', () => {
		expect(ReactFragment).to.have.property('create').that.is.a('function');
	});

	it('should create .children from a keyed object', () => {
		let obj = {
			a: ['hello', <div />, <span />],
			b: null,
			c: [null],
			d: 'text',
			e: [<section a />]
		};

		let frag = ReactFragment.create(obj);

		expect(frag).to.deep.equal([
			'hello',
			<div key="a.1" />,
			<span key="a.2" />,
			'text',
			<section a key="e.0" />
		]);
	});
});
