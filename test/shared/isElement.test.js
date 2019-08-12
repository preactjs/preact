import { h, isElement, Component } from '../../src/index';
import { expect } from 'chai';

/** @jsx h */

describe('isElement', () => {
	it('should check if the argument is a valid vnode', () => {
		// Failure cases
		expect(isElement(123)).to.equal(false);
		expect(isElement(0)).to.equal(false);
		expect(isElement('')).to.equal(false);
		expect(isElement('abc')).to.equal(false);
		expect(isElement(null)).to.equal(false);
		expect(isElement(undefined)).to.equal(false);
		expect(isElement(true)).to.equal(false);
		expect(isElement(false)).to.equal(false);
		expect(isElement([])).to.equal(false);
		expect(isElement([123])).to.equal(false);
		expect(isElement([null])).to.equal(false);

		// Success cases
		expect(isElement(<div />)).to.equal(true);

		const Foo = () => 123;
		expect(isElement(<Foo />)).to.equal(true);
		class Bar extends Component {
			render() {
				return <div />;
			}
		}
		expect(isElement(<Bar />)).to.equal(true);
	});
});
