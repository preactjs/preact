import { createElement as h, createContext } from '../../src/index';
// import { VNode } from '../../src/vnode';
import { expect } from 'chai';

/*eslint-env browser, mocha */

/** @jsx h */

describe('createContext', () => {
	it('should return a Provider and a Consumer', () => {
		const context = createContext();
		expect(context).to.have.property('Provider');
		expect(context).to.have.property('Consumer');
	});

	it('should return a valid Provider Component', () => {
		const { Provider } = createContext();
		const contextValue = { value: 'test' };
		const children = [<div>child1</div>, <div>child2</div>];

		const providerComponent = <Provider {...contextValue}>{children}</Provider>;
		//expect(providerComponent).to.have.property('tag', 'Provider');
		expect(providerComponent.props.value).to.equal(contextValue.value);
		expect(providerComponent.props.children).to.equal(children);
	});
});
