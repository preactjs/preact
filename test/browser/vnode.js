import { createElement as h } from '../../src/index';
import { setupScratch, teardown } from '../_util/helpers';

/** @jsx h */

describe('VNode', () => {
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should set VNode#tag property', () => {
		expect(<div />).to.have.property('tag', 'div');
		function Test() {
			return <div />;
		}
		expect(<Test />).to.have.property('tag', Test);
	});

	it('should set VNode#props property', () => {
		const props = {};
		expect(h('div', props)).to.have.property('props', props);
	});

	it('should set VNode#text property', () => {
		expect(<div />).to.have.property('text', null);
	});

	it('should set VNode#key property', () => {
		expect(<div />).to.have.property('key').that.is.undefined;
		expect(<div a="a" />).to.have.property('key').that.is.undefined;
		expect(<div key="1" />).to.have.property('key', '1');
	});

	it('should set VNode#ref property', () => {
		expect(<div />).to.have.property('ref').that.is.undefined;
		expect(<div a="a" />).to.have.property('ref').that.is.undefined;
		const emptyFunction = () => {};
		expect(<div ref={emptyFunction} />).to.have.property('ref', emptyFunction);
	});

	it('should have ordered VNode properties', () => {
		expect(Object.keys(<div />).filter(key => !/^_/.test(key))).to.deep.equal(['tag', 'props', 'text', 'key', 'ref']);
	});
});
