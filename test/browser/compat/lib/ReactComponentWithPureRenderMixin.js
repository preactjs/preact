import PureRenderMixin from '../../../../compat/lib/ReactComponentWithPureRenderMixin';

describe('ReactComponentWithPureRenderMixin', () => {
	it('should export an object with a shouldComponentUpdate method', () => {
		expect(PureRenderMixin).to.have.property('shouldComponentUpdate').that.is.a('function');
	});
});
