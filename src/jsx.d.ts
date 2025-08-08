// Users who only use Preact for SSR might not specify "dom" in their lib in tsconfig.json
/// <reference lib="dom" />

import {
	Component,
	ComponentType,
	FunctionComponent,
	VNode,
} from 'preact';

import * as dom from './dom';

type Defaultize<Props, Defaults> =
	// Distribute over unions
	Props extends any // Make any properties included in Default optional
		? Partial<Pick<Props, Extract<keyof Props, keyof Defaults>>> & // Include the remaining properties from Props
				Pick<Props, Exclude<keyof Props, keyof Defaults>>
		: never;

export namespace JSXInternal {
	export type LibraryManagedAttributes<Component, Props> = Component extends {
		defaultProps: infer Defaults;
	}
		? Defaultize<Props, Defaults>
		: Props;

	export interface IntrinsicAttributes {
		key?: any;
	}

	export type ElementType<P = any> =
		| {
				[K in keyof IntrinsicElements]: P extends IntrinsicElements[K]
					? K
					: never;
		  }[keyof IntrinsicElements]
		| ComponentType<P>;
	export interface Element extends VNode<any> {}
	export type ElementClass = Component<any, any> | FunctionComponent<any>;

	export interface ElementAttributesProperty {
		props: any;
	}

	export interface ElementChildrenAttribute {
		children: any;
	}

	export interface IntrinsicSVGElements {
		svg: dom.SVGAttributes<SVGSVGElement>;
		animate: dom.SVGAttributes<SVGAnimateElement>;
		circle: dom.SVGAttributes<SVGCircleElement>;
		animateMotion: dom.SVGAttributes<SVGAnimateMotionElement>;
		animateTransform: dom.SVGAttributes<SVGAnimateTransformElement>;
		clipPath: dom.SVGAttributes<SVGClipPathElement>;
		defs: dom.SVGAttributes<SVGDefsElement>;
		desc: dom.SVGAttributes<SVGDescElement>;
		ellipse: dom.SVGAttributes<SVGEllipseElement>;
		feBlend: dom.SVGAttributes<SVGFEBlendElement>;
		feColorMatrix: dom.SVGAttributes<SVGFEColorMatrixElement>;
		feComponentTransfer: dom.SVGAttributes<SVGFEComponentTransferElement>;
		feComposite: dom.SVGAttributes<SVGFECompositeElement>;
		feConvolveMatrix: dom.SVGAttributes<SVGFEConvolveMatrixElement>;
		feDiffuseLighting: dom.SVGAttributes<SVGFEDiffuseLightingElement>;
		feDisplacementMap: dom.SVGAttributes<SVGFEDisplacementMapElement>;
		feDistantLight: dom.SVGAttributes<SVGFEDistantLightElement>;
		feDropShadow: dom.SVGAttributes<SVGFEDropShadowElement>;
		feFlood: dom.SVGAttributes<SVGFEFloodElement>;
		feFuncA: dom.SVGAttributes<SVGFEFuncAElement>;
		feFuncB: dom.SVGAttributes<SVGFEFuncBElement>;
		feFuncG: dom.SVGAttributes<SVGFEFuncGElement>;
		feFuncR: dom.SVGAttributes<SVGFEFuncRElement>;
		feGaussianBlur: dom.SVGAttributes<SVGFEGaussianBlurElement>;
		feImage: dom.SVGAttributes<SVGFEImageElement>;
		feMerge: dom.SVGAttributes<SVGFEMergeElement>;
		feMergeNode: dom.SVGAttributes<SVGFEMergeNodeElement>;
		feMorphology: dom.SVGAttributes<SVGFEMorphologyElement>;
		feOffset: dom.SVGAttributes<SVGFEOffsetElement>;
		fePointLight: dom.SVGAttributes<SVGFEPointLightElement>;
		feSpecularLighting: dom.SVGAttributes<SVGFESpecularLightingElement>;
		feSpotLight: dom.SVGAttributes<SVGFESpotLightElement>;
		feTile: dom.SVGAttributes<SVGFETileElement>;
		feTurbulence: dom.SVGAttributes<SVGFETurbulenceElement>;
		filter: dom.SVGAttributes<SVGFilterElement>;
		foreignObject: dom.SVGAttributes<SVGForeignObjectElement>;
		g: dom.SVGAttributes<SVGGElement>;
		image: dom.SVGAttributes<SVGImageElement>;
		line: dom.SVGAttributes<SVGLineElement>;
		linearGradient: dom.SVGAttributes<SVGLinearGradientElement>;
		marker: dom.SVGAttributes<SVGMarkerElement>;
		mask: dom.SVGAttributes<SVGMaskElement>;
		metadata: dom.SVGAttributes<SVGMetadataElement>;
		mpath: dom.SVGAttributes<SVGMPathElement>;
		path: dom.SVGAttributes<SVGPathElement>;
		pattern: dom.SVGAttributes<SVGPatternElement>;
		polygon: dom.SVGAttributes<SVGPolygonElement>;
		polyline: dom.SVGAttributes<SVGPolylineElement>;
		radialGradient: dom.SVGAttributes<SVGRadialGradientElement>;
		rect: dom.SVGAttributes<SVGRectElement>;
		set: dom.SVGAttributes<SVGSetElement>;
		stop: dom.SVGAttributes<SVGStopElement>;
		switch: dom.SVGAttributes<SVGSwitchElement>;
		symbol: dom.SVGAttributes<SVGSymbolElement>;
		text: dom.SVGAttributes<SVGTextElement>;
		textPath: dom.SVGAttributes<SVGTextPathElement>;
		tspan: dom.SVGAttributes<SVGTSpanElement>;
		use: dom.SVGAttributes<SVGUseElement>;
		view: dom.SVGAttributes<SVGViewElement>;
	}

	export interface IntrinsicMathMLElements {
		annotation: dom.AnnotationMathMLAttributes<MathMLElement>;
		'annotation-xml': dom.AnnotationXmlMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/maction */
		maction: dom.MActionMathMLAttributes<MathMLElement>;
		math: dom.MathMathMLAttributes<MathMLElement>;
		/** This feature is non-standard. See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/menclose  */
		menclose: dom.MEncloseMathMLAttributes<MathMLElement>;
		merror: dom.MErrorMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfenced */
		mfenced: dom.MFencedMathMLAttributes<MathMLElement>;
		mfrac: dom.MFracMathMLAttributes<MathMLElement>;
		mi: dom.MiMathMLAttributes<MathMLElement>;
		mmultiscripts: dom.MmultiScriptsMathMLAttributes<MathMLElement>;
		mn: dom.MNMathMLAttributes<MathMLElement>;
		mo: dom.MOMathMLAttributes<MathMLElement>;
		mover: dom.MOverMathMLAttributes<MathMLElement>;
		mpadded: dom.MPaddedMathMLAttributes<MathMLElement>;
		mphantom: dom.MPhantomMathMLAttributes<MathMLElement>;
		mprescripts: dom.MPrescriptsMathMLAttributes<MathMLElement>;
		mroot: dom.MRootMathMLAttributes<MathMLElement>;
		mrow: dom.MRowMathMLAttributes<MathMLElement>;
		ms: dom.MSMathMLAttributes<MathMLElement>;
		mspace: dom.MSpaceMathMLAttributes<MathMLElement>;
		msqrt: dom.MSqrtMathMLAttributes<MathMLElement>;
		mstyle: dom.MStyleMathMLAttributes<MathMLElement>;
		msub: dom.MSubMathMLAttributes<MathMLElement>;
		msubsup: dom.MSubsupMathMLAttributes<MathMLElement>;
		msup: dom.MSupMathMLAttributes<MathMLElement>;
		mtable: dom.MTableMathMLAttributes<MathMLElement>;
		mtd: dom.MTdMathMLAttributes<MathMLElement>;
		mtext: dom.MTextMathMLAttributes<MathMLElement>;
		mtr: dom.MTrMathMLAttributes<MathMLElement>;
		munder: dom.MUnderMathMLAttributes<MathMLElement>;
		munderover: dom.MUnderMathMLAttributes<MathMLElement>;
		semantics: dom.SemanticsMathMLAttributes<MathMLElement>;
	}

	export interface IntrinsicElements
		extends IntrinsicSVGElements,
			IntrinsicMathMLElements {
		a: dom.AnchorHTMLAttributes<HTMLAnchorElement>;
		abbr: dom.HTMLAttributes<HTMLElement>;
		address: dom.HTMLAttributes<HTMLElement>;
		area: dom.AreaHTMLAttributes<HTMLAreaElement>;
		article: dom.ArticleHTMLAttributes<HTMLElement>;
		aside: dom.AsideHTMLAttributes<HTMLElement>;
		audio: dom.AudioHTMLAttributes<HTMLAudioElement>;
		b: dom.HTMLAttributes<HTMLElement>;
		base: dom.BaseHTMLAttributes<HTMLBaseElement>;
		bdi: dom.HTMLAttributes<HTMLElement>;
		bdo: dom.HTMLAttributes<HTMLElement>;
		big: dom.HTMLAttributes<HTMLElement>;
		blockquote: dom.BlockquoteHTMLAttributes<HTMLQuoteElement>;
		body: dom.HTMLAttributes<HTMLBodyElement>;
		br: dom.BrHTMLAttributes<HTMLBRElement>;
		button: dom.ButtonHTMLAttributes<HTMLButtonElement>;
		canvas: dom.CanvasHTMLAttributes<HTMLCanvasElement>;
		caption: dom.CaptionHTMLAttributes<HTMLTableCaptionElement>;
		cite: dom.HTMLAttributes<HTMLElement>;
		code: dom.HTMLAttributes<HTMLElement>;
		col: dom.ColHTMLAttributes<HTMLTableColElement>;
		colgroup: dom.ColgroupHTMLAttributes<HTMLTableColElement>;
		data: dom.DataHTMLAttributes<HTMLDataElement>;
		datalist: dom.DataListHTMLAttributes<HTMLDataListElement>;
		dd: dom.DdHTMLAttributes<HTMLElement>;
		del: dom.DelHTMLAttributes<HTMLModElement>;
		details: dom.DetailsHTMLAttributes<HTMLDetailsElement>;
		dfn: dom.HTMLAttributes<HTMLElement>;
		dialog: dom.DialogHTMLAttributes<HTMLDialogElement>;
		div: dom.HTMLAttributes<HTMLDivElement>;
		dl: dom.DlHTMLAttributes<HTMLDListElement>;
		dt: dom.DtHTMLAttributes<HTMLElement>;
		em: dom.HTMLAttributes<HTMLElement>;
		embed: dom.EmbedHTMLAttributes<HTMLEmbedElement>;
		fieldset: dom.FieldsetHTMLAttributes<HTMLFieldSetElement>;
		figcaption: dom.FigcaptionHTMLAttributes<HTMLElement>;
		figure: dom.HTMLAttributes<HTMLElement>;
		footer: dom.FooterHTMLAttributes<HTMLElement>;
		form: dom.FormHTMLAttributes<HTMLFormElement>;
		h1: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		h2: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		h3: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		h4: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		h5: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		h6: dom.HeadingHTMLAttributes<HTMLHeadingElement>;
		head: dom.HeadHTMLAttributes<HTMLHeadElement>;
		header: dom.HeaderHTMLAttributes<HTMLElement>;
		hgroup: dom.HTMLAttributes<HTMLElement>;
		hr: dom.HrHTMLAttributes<HTMLHRElement>;
		html: dom.HtmlHTMLAttributes<HTMLHtmlElement>;
		i: dom.HTMLAttributes<HTMLElement>;
		iframe: dom.IframeHTMLAttributes<HTMLIFrameElement>;
		img: dom.ImgHTMLAttributes<HTMLImageElement>;
		input: dom.InputHTMLAttributes<HTMLInputElement>;
		ins: dom.InsHTMLAttributes<HTMLModElement>;
		kbd: dom.HTMLAttributes<HTMLElement>;
		keygen: dom.KeygenHTMLAttributes<HTMLUnknownElement>;
		label: dom.LabelHTMLAttributes<HTMLLabelElement>;
		legend: dom.LegendHTMLAttributes<HTMLLegendElement>;
		li: dom.LiHTMLAttributes<HTMLLIElement>;
		link: dom.LinkHTMLAttributes<HTMLLinkElement>;
		main: dom.MainHTMLAttributes<HTMLElement>;
		map: dom.MapHTMLAttributes<HTMLMapElement>;
		mark: dom.HTMLAttributes<HTMLElement>;
		marquee: dom.MarqueeHTMLAttributes<HTMLMarqueeElement>;
		menu: dom.MenuHTMLAttributes<HTMLMenuElement>;
		menuitem: dom.HTMLAttributes<HTMLUnknownElement>;
		meta: dom.MetaHTMLAttributes<HTMLMetaElement>;
		meter: dom.MeterHTMLAttributes<HTMLMeterElement>;
		nav: dom.NavHTMLAttributes<HTMLElement>;
		noscript: dom.NoScriptHTMLAttributes<HTMLElement>;
		object: dom.ObjectHTMLAttributes<HTMLObjectElement>;
		ol: dom.OlHTMLAttributes<HTMLOListElement>;
		optgroup: dom.OptgroupHTMLAttributes<HTMLOptGroupElement>;
		option: dom.OptionHTMLAttributes<HTMLOptionElement>;
		output: dom.OutputHTMLAttributes<HTMLOutputElement>;
		p: dom.HTMLAttributes<HTMLParagraphElement>;
		param: dom.ParamHTMLAttributes<HTMLParamElement>;
		picture: dom.PictureHTMLAttributes<HTMLPictureElement>;
		pre: dom.HTMLAttributes<HTMLPreElement>;
		progress: dom.ProgressHTMLAttributes<HTMLProgressElement>;
		q: dom.QuoteHTMLAttributes<HTMLQuoteElement>;
		rp: dom.HTMLAttributes<HTMLElement>;
		rt: dom.HTMLAttributes<HTMLElement>;
		ruby: dom.HTMLAttributes<HTMLElement>;
		s: dom.HTMLAttributes<HTMLElement>;
		samp: dom.HTMLAttributes<HTMLElement>;
		script: dom.ScriptHTMLAttributes<HTMLScriptElement>;
		search: dom.SearchHTMLAttributes<HTMLElement>;
		section: dom.HTMLAttributes<HTMLElement>;
		select: dom.SelectHTMLAttributes<HTMLSelectElement>;
		slot: dom.SlotHTMLAttributes<HTMLSlotElement>;
		small: dom.HTMLAttributes<HTMLElement>;
		source: dom.SourceHTMLAttributes<HTMLSourceElement>;
		span: dom.HTMLAttributes<HTMLSpanElement>;
		strong: dom.HTMLAttributes<HTMLElement>;
		style: dom.StyleHTMLAttributes<HTMLStyleElement>;
		sub: dom.HTMLAttributes<HTMLElement>;
		summary: dom.HTMLAttributes<HTMLElement>;
		sup: dom.HTMLAttributes<HTMLElement>;
		table: dom.TableHTMLAttributes<HTMLTableElement>;
		tbody: dom.HTMLAttributes<HTMLTableSectionElement>;
		td: dom.TdHTMLAttributes<HTMLTableCellElement>;
		template: dom.TemplateHTMLAttributes<HTMLTemplateElement>;
		textarea: dom.TextareaHTMLAttributes<HTMLTextAreaElement>;
		tfoot: dom.HTMLAttributes<HTMLTableSectionElement>;
		th: dom.ThHTMLAttributes<HTMLTableCellElement>;
		thead: dom.HTMLAttributes<HTMLTableSectionElement>;
		time: dom.TimeHTMLAttributes<HTMLTimeElement>;
		title: dom.TitleHTMLAttributes<HTMLTitleElement>;
		tr: dom.HTMLAttributes<HTMLTableRowElement>;
		track: dom.TrackHTMLAttributes<HTMLTrackElement>;
		u: dom.UlHTMLAttributes<HTMLElement>;
		ul: dom.HTMLAttributes<HTMLUListElement>;
		var: dom.HTMLAttributes<HTMLElement>;
		video: dom.VideoHTMLAttributes<HTMLVideoElement>;
		wbr: dom.WbrHTMLAttributes<HTMLElement>;
	}
}
