import { createElement, render } from 'preact';
import { setupScratch, teardown, sortCss } from '../_util/helpers';

/** @jsx createElement */

describe('style attribute', () => {
	/** @type {HTMLElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should apply style as String', () => {
		render(<div style="top: 5px; position: relative;" />, scratch);
		expect(scratch.childNodes[0].style.cssText).to.equal(
			'top: 5px; position: relative;'
		);
	});

	it('should not call CSSStyleDeclaration.setProperty for style strings', () => {
		render(<div style="top: 5px; position: relative;" />, scratch);
		sinon.stub(scratch.firstChild.style, 'setProperty');
		render(<div style="top: 10px; position: absolute;" />, scratch);
		expect(scratch.firstChild.style.setProperty).to.not.be.called;
	});

	it('should properly switch from string styles to object styles and back', () => {
		render(<div style="display: inline;">test</div>, scratch);

		let style = scratch.firstChild.style;
		expect(style.cssText).to.equal('display: inline;');

		render(<div style={{ color: 'red' }} />, scratch);
		expect(style.cssText).to.equal('color: red;');

		render(<div style="color: blue" />, scratch);
		expect(style.cssText).to.equal('color: blue;');

		render(<div style={{ color: 'yellow' }} />, scratch);
		expect(style.cssText).to.equal('color: yellow;');

		render(<div style="display: block" />, scratch);
		expect(style.cssText).to.equal('display: block;');
	});

	it('should serialize style objects', () => {
		const styleObj = {
			color: 'rgb(255, 255, 255)',
			background: 'rgb(255, 100, 0)',
			backgroundPosition: '10px 10px',
			'background-size': 'cover',
			gridRowStart: 1,
			padding: 5,
			top: 100,
			left: '100%'
		};

		render(<div style={styleObj}>test</div>, scratch);

		let style = scratch.firstChild.style;
		expect(style.color).to.equal('rgb(255, 255, 255)');
		expect(style.background).to.contain('rgb(255, 100, 0)');
		expect(style.backgroundPosition).to.equal('10px 10px');
		expect(style.backgroundSize).to.equal('cover');
		expect(style.padding).to.equal('5px');
		expect(style.top).to.equal('100px');
		expect(style.left).to.equal('100%');

		// Only check for this in browsers that support css grids
		if (typeof scratch.style.grid == 'string') {
			expect(style.gridRowStart).to.equal('1');
		}
	});

	it('should support opacity 0', () => {
		render(<div style={{ opacity: 1 }}>Test</div>, scratch);
		let style = scratch.firstChild.style;
		expect(style)
			.to.have.property('opacity')
			.that.equals('1');

		render(<div style={{ opacity: 0 }}>Test</div>, scratch);
		style = scratch.firstChild.style;
		expect(style)
			.to.have.property('opacity')
			.that.equals('0');
	});

	it('should support animation-iteration-count as number', () => {
		render(<div style={{ animationIterationCount: 1 }}>Test</div>, scratch);
		let style = scratch.firstChild.style;
		expect(style)
			.to.have.property('animationIterationCount')
			.that.equals('1');

		render(<div style={{ animationIterationCount: 2.5 }}>Test</div>, scratch);
		style = scratch.firstChild.style;
		expect(style)
			.to.have.property('animationIterationCount')
			.that.equals('2.5');
	});

	it('should replace previous style objects', () => {
		render(<div style={{ display: 'inline' }}>test</div>, scratch);

		let style = scratch.firstChild.style;
		expect(style.cssText).to.equal('display: inline;');
		expect(style)
			.to.have.property('display')
			.that.equals('inline');
		expect(style)
			.to.have.property('color')
			.that.equals('');
		expect(style.zIndex.toString()).to.equal('');

		render(
			<div style={{ color: 'rgb(0, 255, 255)', zIndex: '3' }}>test</div>,
			scratch
		);

		style = scratch.firstChild.style;
		expect(style.cssText).to.equal('color: rgb(0, 255, 255); z-index: 3;');
		expect(style)
			.to.have.property('display')
			.that.equals('');
		expect(style)
			.to.have.property('color')
			.that.equals('rgb(0, 255, 255)');

		// IE stores numeric z-index values as a number
		expect(style.zIndex.toString()).to.equal('3');

		render(
			<div style={{ color: 'rgb(0, 255, 255)', display: 'inline' }}>test</div>,
			scratch
		);

		style = scratch.firstChild.style;
		expect(style.cssText).to.equal('color: rgb(0, 255, 255); display: inline;');
		expect(style)
			.to.have.property('display')
			.that.equals('inline');
		expect(style)
			.to.have.property('color')
			.that.equals('rgb(0, 255, 255)');
		expect(style.zIndex.toString()).to.equal('');
	});

	it('should remove old styles', () => {
		render(<div style={{ color: 'red' }} />, scratch);
		render(<div style={{ backgroundColor: 'blue' }} />, scratch);
		expect(scratch.firstChild.style.color).to.equal('');
		expect(scratch.firstChild.style.backgroundColor).to.equal('blue');
	});

	// Issue #1850
	it('should remove empty styles', () => {
		render(<div style={{ visibility: 'hidden' }} />, scratch);
		expect(scratch.firstChild.style.visibility).to.equal('hidden');
		render(<div style={{ visibility: undefined }} />, scratch);
		expect(scratch.firstChild.style.visibility).to.equal('');
	});

	// Skip test if the currently running browser doesn't support CSS Custom Properties
	if (window.CSS && CSS.supports('color', 'var(--fake-var)')) {
		it('should support css custom properties', () => {
			render(
				<div style={{ '--foo': 'red', color: 'var(--foo)' }}>test</div>,
				scratch
			);
			expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
				'--foo: red; color: var(--foo);'
			);
			expect(window.getComputedStyle(scratch.firstChild).color).to.equal(
				'rgb(255, 0, 0)'
			);
		});

		it('should not add "px" suffix for custom properties', () => {
			render(
				<div style={{ '--foo': '100px', width: 'var(--foo)' }}>test</div>,
				scratch
			);
			expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
				'--foo: 100px; width: var(--foo);'
			);
		});

		it('css vars should not be transformed into dash-separated', () => {
			render(
				<div
					style={{
						'--fooBar': 1,
						'--foo-baz': 2,
						opacity: 'var(--fooBar)',
						zIndex: 'var(--foo-baz)'
					}}
				>
					test
				</div>,
				scratch
			);
			expect(sortCss(scratch.firstChild.style.cssText)).to.equal(
				'--foo-baz: 2; --fooBar: 1; opacity: var(--fooBar); z-index: var(--foo-baz);'
			);
		});

		it('should call CSSStyleDeclaration.setProperty for css vars', () => {
			render(<div style={{ padding: '10px' }} />, scratch);
			sinon.stub(scratch.firstChild.style, 'setProperty');
			render(
				<div style={{ '--foo': '10px', padding: 'var(--foo)' }} />,
				scratch
			);
			expect(scratch.firstChild.style.setProperty).to.be.calledWith(
				'--foo',
				'10px'
			);
		});

		it('should clear css properties when passed an empty string, null, or undefined', () => {
			const red = 'rgb(255, 0, 0)';
			const blue = 'rgb(0, 0, 255)';
			const green = 'rgb(0, 128, 0)';
			const yellow = 'rgb(255, 255, 0)';
			const violet = 'rgb(238, 130, 238)';

			function App({ color }) {
				return (
					<div style={{ '--color': color }}>
						<span style={{ color: 'var(--color, red)' }}>Hello World!</span>
					</div>
				);
			}

			const getDiv = () => /** @type {HTMLDivElement} */ (scratch.firstChild);
			const getSpan = () =>
				/** @type {HTMLSpanElement} */ (scratch.firstChild.firstChild);
			const getCSSVariableValue = () =>
				getDiv().style.getPropertyValue('--color');
			const getTextColor = () => window.getComputedStyle(getSpan()).color;

			render(<App color="blue" />, scratch);
			expect(getCSSVariableValue()).to.equal('blue');
			expect(getTextColor()).to.equal(blue);

			render(<App color="" />, scratch);
			expect(getCSSVariableValue(), 'empty string').to.equal('');
			expect(getTextColor(), 'empty string').to.equal(red);

			render(<App color="green" />, scratch);
			expect(getCSSVariableValue()).to.equal('green');
			expect(getTextColor()).to.equal(green);

			render(<App color={undefined} />, scratch);
			expect(getCSSVariableValue(), 'undefined').to.equal('');
			expect(getTextColor(), 'undefined').to.equal(red);

			render(<App color="yellow" />, scratch);
			expect(getCSSVariableValue()).to.equal('yellow');
			expect(getTextColor()).to.equal(yellow);

			render(<App color={null} />, scratch);
			expect(getCSSVariableValue(), 'null').to.equal('');
			expect(getTextColor(), 'null').to.equal(red);

			render(<App color="violet" />, scratch);
			expect(getCSSVariableValue()).to.equal('violet');
			expect(getTextColor()).to.equal(violet);
		});
	}
});
