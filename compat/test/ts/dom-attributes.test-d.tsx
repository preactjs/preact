/* eslint-disable no-unused-vars */
import React from '../../src';

// SVG camelCase attributes should be available in preact/compat
// These are React-compatible and converted to kebab-case at runtime
const svgCasingTest = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
		<circle fill="blue" strokeWidth="2" cx="24" cy="24" r="20" />
	</svg>
);

// Standard kebab-case SVG attributes should also work
const svgKebabCaseTest = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
		<circle fill="blue" stroke-width="2" cx="24" cy="24" r="20" />
	</svg>
);

// More camelCase SVG attributes that should work in compat
const fillOpacityTest = <rect fillOpacity="0.5" />;
const stopColorTest = <stop stopColor="red" />;
const fontFamilyTest = <text fontFamily="Arial" />;
const strokeDasharrayTest = <path strokeDasharray="5,5" />;
const textAnchorTest = <text textAnchor="middle" />;
