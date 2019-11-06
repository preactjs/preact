import { h } from 'preact';

describe('createElement production build', () => {
	it('should produce a correct structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		expect(() => JSON.stringify(el)).to.not.throw();
	});
});
