import { shallowRender } from '../src';
import { h, Fragment } from 'preact';
import { expect } from 'chai';
import { spy } from 'sinon';

describe('shallowRender()', () => {
	it('should not render nested components', () => {
		let Test = spy(({ foo, children }) => (
			<div bar={foo}>
				<b>test child</b>
				{children}
			</div>
		));
		Test.displayName = 'Test';

		let rendered = shallowRender(
			<section>
				<Test foo={1}>
					<span>asdf</span>
				</Test>
			</section>
		);

		expect(rendered).to.equal(
			`<section><Test foo="1"><span>asdf</span></Test></section>`
		);
		expect(Test).not.to.have.been.called;
	});

	it('should always render root component', () => {
		let Test = spy(({ foo, children }) => (
			<div bar={foo}>
				<b>test child</b>
				{children}
			</div>
		));
		Test.displayName = 'Test';

		let rendered = shallowRender(
			<Test foo={1}>
				<span>asdf</span>
			</Test>
		);

		expect(rendered).to.equal(
			`<div bar="1"><b>test child</b><span>asdf</span></div>`
		);
		expect(Test).to.have.been.calledOnce;
	});

	it('should ignore Fragments', () => {
		let rendered = shallowRender(
			<Fragment>
				<div>foo</div>
			</Fragment>
		);
		expect(rendered).to.equal(`<div>foo</div>`);
	});
});
