import { h } from '../../dist/preact';

describe('createElement production build', () => {
	it('should not produce a circular data structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		expect(JSON.stringify(el)).to.equal('{"type":"div","props":{"children":[{"type":"span","props":{},"text":null,"__k":null,"__e":null,"l":null,"__c":null},{"type":"br","props":{},"text":null,"__k":null,"__e":null,"l":null,"__c":null}]},"text":null,"__k":null,"__e":null,"l":null,"__c":null}');
	});
});
