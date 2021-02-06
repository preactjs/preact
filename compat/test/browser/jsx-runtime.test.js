import React, { createElement } from 'preact/compat';
import { jsx } from 'preact/jsx-runtime';

describe('jsx-runtime (compat)', () => {
	it('should apply defaultProps', () => {
		class Foo extends React.Component {
			render() {
				return <div />;
			}
		}

		Foo.defaultProps = {
			foo: 'bar'
		};

		const vnode = jsx(Foo, {}, null);
		expect(vnode.props).to.deep.equal({
			foo: 'bar'
		});
	});
});
