import { h } from 'preact';

describe('createElement production build', () => {
	it('should produce a correct structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		delete el._original;
		delete el.props.children[0]._original;
		delete el.props.children[1]._original;
		expect(() => JSON.stringify(el)).to.not.throw();
	});
});
