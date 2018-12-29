import ReactMount from '../../../../compat/lib/ReactMount';

describe('ReactMount', () => {
	it('should export .unmountComponentAtNode', () => {
		expect(ReactMount).to.have.property('unmountComponentAtNode').that.is.a('function');
	});
});
