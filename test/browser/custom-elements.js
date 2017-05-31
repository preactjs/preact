/** @jsx h */

import { h, render } from '../../src/preact';

window.customElements && describe('Custom elements', () => {
	class CustomElement1 extends HTMLElement {}
	class CustomElement2 extends HTMLElement {}
	customElements.define('custom-element-1', CustomElement1);
	customElements.define('custom-element-2', CustomElement2);

	let refs, refsIndex, root, scratch;
	const ref = () => e => e && (refs[refsIndex++] = e);
	const tmp = jsx => (root = render(jsx, scratch, root));

	beforeEach(() => {
		refs = [];
		refsIndex = 0;
		scratch = document.createElement('div');
		document.body.appendChild(scratch);
	});

	afterEach(() => {
		scratch.parentNode.removeChild(scratch);
	});

	it('should not be replaced if they are the same', () => {
		tmp(<CustomElement1 ref={ref()} />);
		tmp(<CustomElement1 ref={ref()} />);
		expect(refs[0]).to.equal(refs[1]);
	});

	it('should be replaced if they are different', () => {
		tmp(<CustomElement1 ref={ref()} />);
		tmp(<CustomElement2 ref={ref()} />);
		expect(refs[0]).not.to.equal(refs[1]);
	});

	it('should replace keyed, different children', () => {
		tmp(
			<div>
				<CustomElement1 key="0" ref={ref()} />
				<CustomElement1 key="1" ref={ref()} />
				<CustomElement1 key="2" ref={ref()} />
			</div>
		);
		tmp(
			<div>
				<CustomElement2 key="0" ref={ref()} />
				<CustomElement2 key="1" ref={ref()} />
				<CustomElement2 key="2" ref={ref()} />
			</div>
		);
		expect(refs[0]).to.not.equal(refs[3]);
		expect(refs[1]).to.not.equal(refs[4]);
		expect(refs[2]).to.not.equal(refs[5]);
	});

	it('should not replace keyed, same children', () => {
		tmp(
			<div>
				<CustomElement1 key="0" ref={ref()} />
				<CustomElement1 key="1" ref={ref()} />
				<CustomElement1 key="2" ref={ref()} />
			</div>
		);
		tmp(
			<div>
				<CustomElement1 key="0" ref={ref()} />
				<CustomElement1 key="1" ref={ref()} />
				<CustomElement1 key="2" ref={ref()} />
			</div>
		);
		expect(refs[0]).to.equal(refs[3]);
		expect(refs[1]).to.equal(refs[4]);
		expect(refs[2]).to.equal(refs[5]);
	});

	it('should replace un-keyed (plucked), different children', () => {
		tmp(
			<div>
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
			</div>
		);
		tmp(
			<div>
				<CustomElement2 ref={ref()} />
				<CustomElement2 ref={ref()} />
				<CustomElement2 ref={ref()} />
			</div>
		);
		expect(refs[0]).to.not.equal(refs[3]);
		expect(refs[1]).to.not.equal(refs[4]);
		expect(refs[2]).to.not.equal(refs[5]);
	});

	it('should not replace un-keyed (pluked), same children', () => {
		tmp(
			<div>
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
			</div>
		);
		tmp(
			<div>
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
				<CustomElement1 ref={ref()} />
			</div>
		);
		expect(refs[0]).to.equal(refs[3]);
		expect(refs[1]).to.equal(refs[4]);
		expect(refs[2]).to.equal(refs[5]);
	});
});
