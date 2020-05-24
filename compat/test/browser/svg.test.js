import React, { createElement } from 'preact/compat';
import {
	setupScratch,
	teardown,
	serializeHtml,
	sortAttributes
} from '../../../test/_util/helpers';

describe('svg', () => {
	/** @type {HTMLDivElement} */
	let scratch;

	beforeEach(() => {
		scratch = setupScratch();
	});

	afterEach(() => {
		teardown(scratch);
	});

	it('should render SVG to string', () => {
		let svg = (
			<svg viewBox="0 0 360 360">
				<path
					stroke="white"
					fill="black"
					d="M347.1 357.9L183.3 256.5 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 118.3 72.8V47.2H58.5z"
				/>
			</svg>
		);
		// string -> parse
		expect(svg).to.eql(svg);
	});

	it('should render SVG to DOM #1', () => {
		const Demo = () => (
			<svg viewBox="0 0 360 360">
				<path
					stroke="white"
					fill="black"
					d="M347.1 357.9L183.3 256.5 L 13 357.9V1.7h334.1v356.2zM58.5 47.2v231.4l124.8-74.1 l 118.3 72.8V47.2H58.5z"
				/>
			</svg>
		);
		React.render(<Demo />, scratch);

		expect(serializeHtml(scratch)).to.equal(
			sortAttributes(
				'<svg viewBox="0 0 360 360"><path stroke="white" fill="black" d="M 347.1 357.9 L 183.3 256.5 L 13 357.9 V 1.7 h 334.1 v 356.2 Z M 58.5 47.2 v 231.4 l 124.8 -74.1 l 118.3 72.8 V 47.2 H 58.5 Z"></path></svg>'
			)
		);
	});

	it('should render SVG to DOM #2', () => {
		React.render(
			<svg viewBox="0 0 100 100">
				<text textAnchor="mid">foo</text>
				<path vectorEffect="non-scaling-stroke" d="M0 0 L100 100" />
			</svg>,
			scratch
		);

		expect(serializeHtml(scratch)).to.equal(
			sortAttributes(
				'<svg viewBox="0 0 100 100"><text text-anchor="mid">foo</text><path vector-effect="non-scaling-stroke" d="M 0 0 L 100 100"></path></svg>'
			)
		);
	});

	it('should render correct SVG attribute names to the DOM', () => {
		React.render(
			<svg
				clipPath="value"
				clipRule="value"
				clipPathUnits="value"
				glyphOrientationHorizontal="value"
				glyphRef="value"
				markerStart="value"
				markerHeight="value"
				markerUnits="value"
				markerWidth="value"
				x1="value"
				xChannelSelector="value"
			/>,
			scratch
		);

		expect(serializeHtml(scratch)).to.eql(
			sortAttributes(
				'<svg clip-path="value" clip-rule="value" clipPathUnits="value" glyph-orientationhorizontal="value" glyphRef="value" marker-start="value" markerHeight="value" markerUnits="value" markerWidth="value" x1="value" xChannelSelector="value"></svg>'
			)
		);
	});
});
