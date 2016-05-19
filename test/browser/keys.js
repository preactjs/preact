import { h, render } from '../../src/preact';
/** @jsx h */

describe('keys', () => {
	let scratch;

	before( () => {
		scratch = document.createElement('div');
		(document.body || document.documentElement).appendChild(scratch);
	});

	beforeEach( () => {
		scratch.innerHTML = '';
	});

	after( () => {
		scratch.parentNode.removeChild(scratch);
		scratch = null;
	});

	// See developit/preact-compat#21
	it('should remove orphaned keyed nodes', () => {
		let root = render((
			<div>
				<div>1</div>
				<li key="a">a</li>
			</div>
		), scratch);

		root = render((
			<div>
				<div>2</div>
				<li key="b">b</li>
			</div>
		), scratch, root);

		expect(scratch.innerHTML).to.equal('<div><div>2</div><li>b</li></div>');
	});

	it('should set VNode#key property', () => {
		expect(<div />).to.have.property('key').that.is.empty;
		expect(<div a="a" />).to.have.property('key').that.is.empty;
		expect(<div key="1" />).to.have.property('key', '1');
	});
});
