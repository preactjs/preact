/** @jsx createElement */

export function isValidElementTests(
	expect,
	isValidElement,
	createElement,
	Component
) {
	describe('isValidElement', () => {
		it('should check if the argument is a valid vnode', () => {
			// Failure cases
			expect(isValidElement(123)).to.equal(false);
			expect(isValidElement(0)).to.equal(false);
			expect(isValidElement('')).to.equal(false);
			expect(isValidElement('abc')).to.equal(false);
			expect(isValidElement(null)).to.equal(false);
			expect(isValidElement(undefined)).to.equal(false);
			expect(isValidElement(true)).to.equal(false);
			expect(isValidElement(false)).to.equal(false);
			expect(isValidElement([])).to.equal(false);
			expect(isValidElement([123])).to.equal(false);
			expect(isValidElement([null])).to.equal(false);

			// Success cases
			expect(isValidElement(<div />)).to.equal(true);

			const Foo = () => 123;
			expect(isValidElement(<Foo />)).to.equal(true);
			class Bar extends Component {
				render() {
					return <div />;
				}
			}
			expect(isValidElement(<Bar />)).to.equal(true);
		});
	});
}
