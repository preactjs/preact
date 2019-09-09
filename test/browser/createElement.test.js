import { h } from 'preact';

describe('createElement', () => {
	it('should not produce a circular data structure', () => {
		const el = h('div', null, h('span', null), h('br', null));
		expect(JSON.stringify(el)).to.equal('{"type":"div","props":{"children":[{"type":"span","props":{},"_children":null,"_parent":null,"_depth":0,"_dom":null,"_lastDomChild":null,"_component":null},{"type":"br","props":{},"_children":null,"_parent":null,"_depth":0,"_dom":null,"_lastDomChild":null,"_component":null}]},"_children":null,"_parent":null,"_depth":0,"_dom":null,"_lastDomChild":null,"_component":null}');
	});
});
