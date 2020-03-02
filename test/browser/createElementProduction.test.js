import { h } from 'preact';

describe('createElement production build', () => {
	it('should produce a correct structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		delete el._original;
		delete el.props.children[0]._original;
		delete el.props.children[1]._original;
		delete el.__v;
		delete el.props.children[0].__v;
		delete el.props.children[1].__v;
		expect(() => JSON.stringify(el)).to.not.throw();
	});
});
