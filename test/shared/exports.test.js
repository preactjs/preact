import {
	createElement,
	h,
	createContext,
	Component,
	Fragment,
	render,
	hydrate,
	cloneElement,
	options,
	createRef,
	toChildArray,
	isValidElement
} from '../../';
import { expect } from 'chai';

describe('preact', () => {
	it('should be available as named exports', () => {
		expect(h).to.be.a('function');
		expect(createElement).to.be.a('function');
		expect(Component).to.be.a('function');
		expect(Fragment).to.exist;
		expect(render).to.be.a('function');
		expect(hydrate).to.be.a('function');
		expect(cloneElement).to.be.a('function');
		expect(createContext).to.be.a('function');
		expect(options).to.exist.and.be.an('object');
		expect(createRef).to.be.a('function');
		expect(isValidElement).to.be.a('function');
		expect(toChildArray).to.be.a('function');
	});
});
