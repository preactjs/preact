import { render } from '../src';
import { createElement } from 'preact/compat';
import { expect } from 'chai';

describe('compat', () => {
	it('should not duplicate class attribute when className is empty', async () => {
		let rendered = render(createElement('div', { className: '' }));
		let expected = `<div class></div>`;

		expect(rendered).to.equal(expected);
	});
});
