import { createElement, createContext } from '../../';
import { expect } from 'chai';

/** @jsx createElement */
/* eslint-env browser, mocha */

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
