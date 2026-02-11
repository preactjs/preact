import * as preact from 'preact';
import { JSXInternal } from '../../src/jsx';
import { CompatSVGAttributes } from './dom';

type Defaultize<Props, Defaults> =
	// Distribute over unions
	Props extends any // Make any properties included in Default optional
		? Partial<Pick<Props, Extract<keyof Props, keyof Defaults>>> & // Include the remaining properties from Props
				Pick<Props, Exclude<keyof Props, keyof Defaults>>
		: never;

// Compat SVGAttributes includes React-compatible camelCase properties
interface SVGAttributes<T extends EventTarget = SVGElement>
	extends preact.SVGAttributes<T>,
		CompatSVGAttributes {}

// Compat IntrinsicSVGElements uses SVGAttributes with camelCase properties
interface CompatIntrinsicSVGElements {
	svg: SVGAttributes<SVGSVGElement>;
	animate: SVGAttributes<SVGAnimateElement>;
	circle: SVGAttributes<SVGCircleElement>;
	animateMotion: SVGAttributes<SVGAnimateMotionElement>;
	animateTransform: SVGAttributes<SVGAnimateTransformElement>;
	clipPath: SVGAttributes<SVGClipPathElement>;
	defs: SVGAttributes<SVGDefsElement>;
	desc: SVGAttributes<SVGDescElement>;
	ellipse: SVGAttributes<SVGEllipseElement>;
	feBlend: SVGAttributes<SVGFEBlendElement>;
	feColorMatrix: SVGAttributes<SVGFEColorMatrixElement>;
	feComponentTransfer: SVGAttributes<SVGFEComponentTransferElement>;
	feComposite: SVGAttributes<SVGFECompositeElement>;
	feConvolveMatrix: SVGAttributes<SVGFEConvolveMatrixElement>;
	feDiffuseLighting: SVGAttributes<SVGFEDiffuseLightingElement>;
	feDisplacementMap: SVGAttributes<SVGFEDisplacementMapElement>;
	feDistantLight: SVGAttributes<SVGFEDistantLightElement>;
	feDropShadow: SVGAttributes<SVGFEDropShadowElement>;
	feFlood: SVGAttributes<SVGFEFloodElement>;
	feFuncA: SVGAttributes<SVGFEFuncAElement>;
	feFuncB: SVGAttributes<SVGFEFuncBElement>;
	feFuncG: SVGAttributes<SVGFEFuncGElement>;
	feFuncR: SVGAttributes<SVGFEFuncRElement>;
	feGaussianBlur: SVGAttributes<SVGFEGaussianBlurElement>;
	feImage: SVGAttributes<SVGFEImageElement>;
	feMerge: SVGAttributes<SVGFEMergeElement>;
	feMergeNode: SVGAttributes<SVGFEMergeNodeElement>;
	feMorphology: SVGAttributes<SVGFEMorphologyElement>;
	feOffset: SVGAttributes<SVGFEOffsetElement>;
	fePointLight: SVGAttributes<SVGFEPointLightElement>;
	feSpecularLighting: SVGAttributes<SVGFESpecularLightingElement>;
	feSpotLight: SVGAttributes<SVGFESpotLightElement>;
	feTile: SVGAttributes<SVGFETileElement>;
	feTurbulence: SVGAttributes<SVGFETurbulenceElement>;
	filter: SVGAttributes<SVGFilterElement>;
	foreignObject: SVGAttributes<SVGForeignObjectElement>;
	g: SVGAttributes<SVGGElement>;
	image: SVGAttributes<SVGImageElement>;
	line: SVGAttributes<SVGLineElement>;
	linearGradient: SVGAttributes<SVGLinearGradientElement>;
	marker: SVGAttributes<SVGMarkerElement>;
	mask: SVGAttributes<SVGMaskElement>;
	metadata: SVGAttributes<SVGMetadataElement>;
	mpath: SVGAttributes<SVGMPathElement>;
	path: SVGAttributes<SVGPathElement>;
	pattern: SVGAttributes<SVGPatternElement>;
	polygon: SVGAttributes<SVGPolygonElement>;
	polyline: SVGAttributes<SVGPolylineElement>;
	radialGradient: SVGAttributes<SVGRadialGradientElement>;
	rect: SVGAttributes<SVGRectElement>;
	set: SVGAttributes<SVGSetElement>;
	stop: SVGAttributes<SVGStopElement>;
	switch: SVGAttributes<SVGSwitchElement>;
	symbol: SVGAttributes<SVGSymbolElement>;
	text: SVGAttributes<SVGTextElement>;
	textPath: SVGAttributes<SVGTextPathElement>;
	tspan: SVGAttributes<SVGTSpanElement>;
	use: SVGAttributes<SVGUseElement>;
	view: SVGAttributes<SVGViewElement>;
}

export namespace CompatJSX {
	export type LibraryManagedAttributes<Component, Props> = Component extends {
		defaultProps: infer Defaults;
	}
		? Defaultize<Props, Defaults>
		: Props;

	export type IntrinsicAttributes = JSXInternal.IntrinsicAttributes;

	export type ElementType<P = any> = JSXInternal.ElementType<P>;

	export type Element = JSXInternal.Element;

	export type ElementClass = JSXInternal.ElementClass;

	export type ElementAttributesProperty = JSXInternal.ElementAttributesProperty;

	export type ElementChildrenAttribute = JSXInternal.ElementChildrenAttribute;

	export interface IntrinsicSVGElements extends CompatIntrinsicSVGElements {}

	export type IntrinsicMathMLElements = JSXInternal.IntrinsicMathMLElements;

	export type IntrinsicHTMLElements = JSXInternal.IntrinsicHTMLElements;

	export interface IntrinsicElements
		extends IntrinsicSVGElements,
			IntrinsicMathMLElements,
			IntrinsicHTMLElements {}
}
