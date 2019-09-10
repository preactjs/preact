import { h } from '../../dist/preact';

describe('createElement production build', () => {
	it('should produce a correct structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		expect(JSON.stringify(el)).to.equal(
			'{"type":"div","props":{"children":[{"type":"span","props":{},"__k":null,"__p":null,"__b":0,"__e":null,"l":null,"__c":null},{"type":"br","props":{},"__k":null,"__p":null,"__b":0,"__e":null,"l":null,"__c":null}]},"__k":null,"__p":null,"__b":0,"__e":null,"l":null,"__c":null}'
		);
	});
});
