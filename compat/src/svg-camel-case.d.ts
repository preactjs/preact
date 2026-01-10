import { Signalish } from '../../src/dom';

/**
 * React-compatible camelCase SVG attributes.
 * These are only supported when using preact/compat, which converts
 * camelCase attribute names to their kebab-case equivalents at runtime.
 *
 * Core Preact does not support these - use the kebab-case versions instead
 * (e.g., 'stroke-width' instead of 'strokeWidth').
 */
export interface CamelCaseSVGAttributes {
	alignmentBaseline?: Signalish<
		| 'auto'
		| 'baseline'
		| 'before-edge'
		| 'text-before-edge'
		| 'middle'
		| 'central'
		| 'after-edge'
		| 'text-after-edge'
		| 'ideographic'
		| 'alphabetic'
		| 'hanging'
		| 'mathematical'
		| 'inherit'
		| undefined
	>;
	allowReorder?: Signalish<'no' | 'yes' | undefined>;
	/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/arabic-form */
	arabicForm?: Signalish<
		'initial' | 'medial' | 'terminal' | 'isolated' | undefined
	>;
	baselineShift?: Signalish<number | string | undefined>;
	capHeight?: Signalish<number | string | undefined>;
	clipPath?: Signalish<string | undefined>;
	clipRule?: Signalish<number | string | undefined>;
	colorInterpolation?: Signalish<number | string | undefined>;
	colorInterpolationFilters?: Signalish<
		'auto' | 'sRGB' | 'linearRGB' | 'inherit' | undefined
	>;
	colorProfile?: Signalish<number | string | undefined>;
	colorRendering?: Signalish<number | string | undefined>;
	contentScriptType?: Signalish<number | string | undefined>;
	contentStyleType?: Signalish<number | string | undefined>;
	dominantBaseline?: Signalish<number | string | undefined>;
	enableBackground?: Signalish<number | string | undefined>;
	fillOpacity?: Signalish<number | string | undefined>;
	fillRule?: Signalish<'nonzero' | 'evenodd' | 'inherit' | undefined>;
	floodColor?: Signalish<number | string | undefined>;
	floodOpacity?: Signalish<number | string | undefined>;
	fontFamily?: Signalish<string | undefined>;
	fontSize?: Signalish<number | string | undefined>;
	fontSizeAdjust?: Signalish<number | string | undefined>;
	fontStretch?: Signalish<number | string | undefined>;
	fontStyle?: Signalish<number | string | undefined>;
	fontVariant?: Signalish<number | string | undefined>;
	fontWeight?: Signalish<number | string | undefined>;
	glyphName?: Signalish<number | string | undefined>;
	glyphOrientationHorizontal?: Signalish<number | string | undefined>;
	glyphOrientationVertical?: Signalish<number | string | undefined>;
	horizAdvX?: Signalish<number | string | undefined>;
	horizOriginX?: Signalish<number | string | undefined>;
	hrefLang?: Signalish<string | undefined>;
	imageRendering?: Signalish<number | string | undefined>;
	letterSpacing?: Signalish<number | string | undefined>;
	lightingColor?: Signalish<number | string | undefined>;
	markerEnd?: Signalish<string | undefined>;
	markerMid?: Signalish<string | undefined>;
	markerStart?: Signalish<string | undefined>;
	overlinePosition?: Signalish<number | string | undefined>;
	overlineThickness?: Signalish<number | string | undefined>;
	paintOrder?: Signalish<number | string | undefined>;
	panose1?: Signalish<number | string | undefined>;
	pointerEvents?: Signalish<number | string | undefined>;
	renderingIntent?: Signalish<number | string | undefined>;
	repeatCount?: Signalish<number | string | undefined>;
	repeatDur?: Signalish<number | string | undefined>;
	shapeRendering?: Signalish<number | string | undefined>;
	stopColor?: Signalish<string | undefined>;
	stopOpacity?: Signalish<number | string | undefined>;
	strikethroughPosition?: Signalish<number | string | undefined>;
	strikethroughThickness?: Signalish<number | string | undefined>;
	strokeDasharray?: Signalish<string | number | undefined>;
	strokeDashoffset?: Signalish<string | number | undefined>;
	strokeLinecap?: Signalish<
		'butt' | 'round' | 'square' | 'inherit' | undefined
	>;
	strokeLinejoin?: Signalish<
		'miter' | 'round' | 'bevel' | 'inherit' | undefined
	>;
	strokeMiterlimit?: Signalish<string | number | undefined>;
	strokeOpacity?: Signalish<number | string | undefined>;
	strokeWidth?: Signalish<number | string | undefined>;
	textAnchor?: Signalish<string | undefined>;
	textDecoration?: Signalish<number | string | undefined>;
	textRendering?: Signalish<number | string | undefined>;
	transformOrigin?: Signalish<string | undefined>;
	underlinePosition?: Signalish<number | string | undefined>;
	underlineThickness?: Signalish<number | string | undefined>;
	unicodeBidi?: Signalish<number | string | undefined>;
	unicodeRange?: Signalish<number | string | undefined>;
	unitsPerEm?: Signalish<number | string | undefined>;
	vAlphabetic?: Signalish<number | string | undefined>;
	vectorEffect?: Signalish<number | string | undefined>;
	vertAdvY?: Signalish<number | string | undefined>;
	vertOriginX?: Signalish<number | string | undefined>;
	vertOriginY?: Signalish<number | string | undefined>;
	vHanging?: Signalish<number | string | undefined>;
	vIdeographic?: Signalish<number | string | undefined>;
	vMathematical?: Signalish<number | string | undefined>;
	wordSpacing?: Signalish<number | string | undefined>;
	writingMode?: Signalish<number | string | undefined>;
	xHeight?: Signalish<number | string | undefined>;
	xlinkActuate?: Signalish<string | undefined>;
	xlinkArcrole?: Signalish<string | undefined>;
	xlinkHref?: Signalish<string | undefined>;
	xlinkRole?: Signalish<string | undefined>;
	xlinkShow?: Signalish<string | undefined>;
	xlinkTitle?: Signalish<string | undefined>;
	xlinkType?: Signalish<string | undefined>;
	xmlBase?: Signalish<string | undefined>;
	xmlLang?: Signalish<string | undefined>;
	xmlSpace?: Signalish<string | undefined>;
}
