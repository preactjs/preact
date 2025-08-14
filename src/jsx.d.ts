// Users who only use Preact for SSR might not specify "dom" in their lib in tsconfig.json
/// <reference lib="dom" />

import * as preact from 'preact';

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
		| preact.ComponentType<P>;
	export interface Element extends preact.VNode<any> {}
	export type ElementClass =
		| preact.Component<any, any>
		| preact.FunctionComponent<any>;

	export interface ElementAttributesProperty {
		props: any;
	}

	export interface ElementChildrenAttribute {
		children: any;
	}

	export interface IntrinsicSVGElements {
		svg: preact.SVGAttributes<SVGSVGElement>;
		animate: preact.SVGAttributes<SVGAnimateElement>;
		circle: preact.SVGAttributes<SVGCircleElement>;
		animateMotion: preact.SVGAttributes<SVGAnimateMotionElement>;
		animateTransform: preact.SVGAttributes<SVGAnimateTransformElement>;
		clipPath: preact.SVGAttributes<SVGClipPathElement>;
		defs: preact.SVGAttributes<SVGDefsElement>;
		desc: preact.SVGAttributes<SVGDescElement>;
		ellipse: preact.SVGAttributes<SVGEllipseElement>;
		feBlend: preact.SVGAttributes<SVGFEBlendElement>;
		feColorMatrix: preact.SVGAttributes<SVGFEColorMatrixElement>;
		feComponentTransfer: preact.SVGAttributes<SVGFEComponentTransferElement>;
		feComposite: preact.SVGAttributes<SVGFECompositeElement>;
		feConvolveMatrix: preact.SVGAttributes<SVGFEConvolveMatrixElement>;
		feDiffuseLighting: preact.SVGAttributes<SVGFEDiffuseLightingElement>;
		feDisplacementMap: preact.SVGAttributes<SVGFEDisplacementMapElement>;
		feDistantLight: preact.SVGAttributes<SVGFEDistantLightElement>;
		feDropShadow: preact.SVGAttributes<SVGFEDropShadowElement>;
		feFlood: preact.SVGAttributes<SVGFEFloodElement>;
		feFuncA: preact.SVGAttributes<SVGFEFuncAElement>;
		feFuncB: preact.SVGAttributes<SVGFEFuncBElement>;
		feFuncG: preact.SVGAttributes<SVGFEFuncGElement>;
		feFuncR: preact.SVGAttributes<SVGFEFuncRElement>;
		feGaussianBlur: preact.SVGAttributes<SVGFEGaussianBlurElement>;
		feImage: preact.SVGAttributes<SVGFEImageElement>;
		feMerge: preact.SVGAttributes<SVGFEMergeElement>;
		feMergeNode: preact.SVGAttributes<SVGFEMergeNodeElement>;
		feMorphology: preact.SVGAttributes<SVGFEMorphologyElement>;
		feOffset: preact.SVGAttributes<SVGFEOffsetElement>;
		fePointLight: preact.SVGAttributes<SVGFEPointLightElement>;
		feSpecularLighting: preact.SVGAttributes<SVGFESpecularLightingElement>;
		feSpotLight: preact.SVGAttributes<SVGFESpotLightElement>;
		feTile: preact.SVGAttributes<SVGFETileElement>;
		feTurbulence: preact.SVGAttributes<SVGFETurbulenceElement>;
		filter: preact.SVGAttributes<SVGFilterElement>;
		foreignObject: preact.SVGAttributes<SVGForeignObjectElement>;
		g: preact.SVGAttributes<SVGGElement>;
		image: preact.SVGAttributes<SVGImageElement>;
		line: preact.SVGAttributes<SVGLineElement>;
		linearGradient: preact.SVGAttributes<SVGLinearGradientElement>;
		marker: preact.SVGAttributes<SVGMarkerElement>;
		mask: preact.SVGAttributes<SVGMaskElement>;
		metadata: preact.SVGAttributes<SVGMetadataElement>;
		mpath: preact.SVGAttributes<SVGMPathElement>;
		path: preact.SVGAttributes<SVGPathElement>;
		pattern: preact.SVGAttributes<SVGPatternElement>;
		polygon: preact.SVGAttributes<SVGPolygonElement>;
		polyline: preact.SVGAttributes<SVGPolylineElement>;
		radialGradient: preact.SVGAttributes<SVGRadialGradientElement>;
		rect: preact.SVGAttributes<SVGRectElement>;
		set: preact.SVGAttributes<SVGSetElement>;
		stop: preact.SVGAttributes<SVGStopElement>;
		switch: preact.SVGAttributes<SVGSwitchElement>;
		symbol: preact.SVGAttributes<SVGSymbolElement>;
		text: preact.SVGAttributes<SVGTextElement>;
		textPath: preact.SVGAttributes<SVGTextPathElement>;
		tspan: preact.SVGAttributes<SVGTSpanElement>;
		use: preact.SVGAttributes<SVGUseElement>;
		view: preact.SVGAttributes<SVGViewElement>;
	}

	export interface IntrinsicMathMLElements {
		annotation: preact.AnnotationMathMLAttributes<MathMLElement>;
		'annotation-xml': preact.AnnotationXmlMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/maction */
		maction: preact.MActionMathMLAttributes<MathMLElement>;
		math: preact.MathMathMLAttributes<MathMLElement>;
		/** This feature is non-standard. See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/menclose  */
		menclose: preact.MEncloseMathMLAttributes<MathMLElement>;
		merror: preact.MErrorMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfenced */
		mfenced: preact.MFencedMathMLAttributes<MathMLElement>;
		mfrac: preact.MFracMathMLAttributes<MathMLElement>;
		mi: preact.MiMathMLAttributes<MathMLElement>;
		mmultiscripts: preact.MmultiScriptsMathMLAttributes<MathMLElement>;
		mn: preact.MNMathMLAttributes<MathMLElement>;
		mo: preact.MOMathMLAttributes<MathMLElement>;
		mover: preact.MOverMathMLAttributes<MathMLElement>;
		mpadded: preact.MPaddedMathMLAttributes<MathMLElement>;
		mphantom: preact.MPhantomMathMLAttributes<MathMLElement>;
		mprescripts: preact.MPrescriptsMathMLAttributes<MathMLElement>;
		mroot: preact.MRootMathMLAttributes<MathMLElement>;
		mrow: preact.MRowMathMLAttributes<MathMLElement>;
		ms: preact.MSMathMLAttributes<MathMLElement>;
		mspace: preact.MSpaceMathMLAttributes<MathMLElement>;
		msqrt: preact.MSqrtMathMLAttributes<MathMLElement>;
		mstyle: preact.MStyleMathMLAttributes<MathMLElement>;
		msub: preact.MSubMathMLAttributes<MathMLElement>;
		msubsup: preact.MSubsupMathMLAttributes<MathMLElement>;
		msup: preact.MSupMathMLAttributes<MathMLElement>;
		mtable: preact.MTableMathMLAttributes<MathMLElement>;
		mtd: preact.MTdMathMLAttributes<MathMLElement>;
		mtext: preact.MTextMathMLAttributes<MathMLElement>;
		mtr: preact.MTrMathMLAttributes<MathMLElement>;
		munder: preact.MUnderMathMLAttributes<MathMLElement>;
		munderover: preact.MUnderMathMLAttributes<MathMLElement>;
		semantics: preact.SemanticsMathMLAttributes<MathMLElement>;
	}

	export interface IntrinsicHTMLElements {
		a: preact.AccessibleAnchorHTMLAttributes<HTMLAnchorElement>;
		abbr: preact.HTMLAttributes<HTMLElement>;
		address: preact.HTMLAttributes<HTMLElement>;
		area: preact.AccessibleAreaHTMLAttributes<HTMLAreaElement>;
		article: preact.ArticleHTMLAttributes<HTMLElement>;
		aside: preact.AsideHTMLAttributes<HTMLElement>;
		audio: preact.AudioHTMLAttributes<HTMLAudioElement>;
		b: preact.HTMLAttributes<HTMLElement>;
		base: preact.BaseHTMLAttributes<HTMLBaseElement>;
		bdi: preact.HTMLAttributes<HTMLElement>;
		bdo: preact.HTMLAttributes<HTMLElement>;
		big: preact.HTMLAttributes<HTMLElement>;
		blockquote: preact.BlockquoteHTMLAttributes<HTMLQuoteElement>;
		body: preact.HTMLAttributes<HTMLBodyElement>;
		br: preact.BrHTMLAttributes<HTMLBRElement>;
		button: preact.ButtonHTMLAttributes<HTMLButtonElement>;
		canvas: preact.CanvasHTMLAttributes<HTMLCanvasElement>;
		caption: preact.CaptionHTMLAttributes<HTMLTableCaptionElement>;
		cite: preact.HTMLAttributes<HTMLElement>;
		code: preact.HTMLAttributes<HTMLElement>;
		col: preact.ColHTMLAttributes<HTMLTableColElement>;
		colgroup: preact.ColgroupHTMLAttributes<HTMLTableColElement>;
		data: preact.DataHTMLAttributes<HTMLDataElement>;
		datalist: preact.DataListHTMLAttributes<HTMLDataListElement>;
		dd: preact.DdHTMLAttributes<HTMLElement>;
		del: preact.DelHTMLAttributes<HTMLModElement>;
		details: preact.DetailsHTMLAttributes<HTMLDetailsElement>;
		dfn: preact.HTMLAttributes<HTMLElement>;
		dialog: preact.DialogHTMLAttributes<HTMLDialogElement>;
		div: preact.HTMLAttributes<HTMLDivElement>;
		dl: preact.DlHTMLAttributes<HTMLDListElement>;
		dt: preact.DtHTMLAttributes<HTMLElement>;
		em: preact.HTMLAttributes<HTMLElement>;
		embed: preact.EmbedHTMLAttributes<HTMLEmbedElement>;
		fieldset: preact.FieldsetHTMLAttributes<HTMLFieldSetElement>;
		figcaption: preact.FigcaptionHTMLAttributes<HTMLElement>;
		figure: preact.HTMLAttributes<HTMLElement>;
		footer: preact.FooterHTMLAttributes<HTMLElement>;
		form: preact.FormHTMLAttributes<HTMLFormElement>;
		h1: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		h2: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		h3: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		h4: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		h5: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		h6: preact.HeadingHTMLAttributes<HTMLHeadingElement>;
		head: preact.HeadHTMLAttributes<HTMLHeadElement>;
		header: preact.HeaderHTMLAttributes<HTMLElement>;
		hgroup: preact.HTMLAttributes<HTMLElement>;
		hr: preact.HrHTMLAttributes<HTMLHRElement>;
		html: preact.HtmlHTMLAttributes<HTMLHtmlElement>;
		i: preact.HTMLAttributes<HTMLElement>;
		iframe: preact.IframeHTMLAttributes<HTMLIFrameElement>;
		img: preact.AccessibleImgHTMLAttributes<HTMLImageElement>;
		input: preact.AccessibleInputHTMLAttributes<HTMLInputElement>;
		ins: preact.InsHTMLAttributes<HTMLModElement>;
		kbd: preact.HTMLAttributes<HTMLElement>;
		keygen: preact.KeygenHTMLAttributes<HTMLUnknownElement>;
		label: preact.LabelHTMLAttributes<HTMLLabelElement>;
		legend: preact.LegendHTMLAttributes<HTMLLegendElement>;
		li: preact.LiHTMLAttributes<HTMLLIElement>;
		link: preact.LinkHTMLAttributes<HTMLLinkElement>;
		main: preact.MainHTMLAttributes<HTMLElement>;
		map: preact.MapHTMLAttributes<HTMLMapElement>;
		mark: preact.HTMLAttributes<HTMLElement>;
		marquee: preact.MarqueeHTMLAttributes<HTMLMarqueeElement>;
		menu: preact.MenuHTMLAttributes<HTMLMenuElement>;
		menuitem: preact.HTMLAttributes<HTMLUnknownElement>;
		meta: preact.MetaHTMLAttributes<HTMLMetaElement>;
		meter: preact.MeterHTMLAttributes<HTMLMeterElement>;
		nav: preact.NavHTMLAttributes<HTMLElement>;
		noscript: preact.NoScriptHTMLAttributes<HTMLElement>;
		object: preact.ObjectHTMLAttributes<HTMLObjectElement>;
		ol: preact.OlHTMLAttributes<HTMLOListElement>;
		optgroup: preact.OptgroupHTMLAttributes<HTMLOptGroupElement>;
		option: preact.OptionHTMLAttributes<HTMLOptionElement>;
		output: preact.OutputHTMLAttributes<HTMLOutputElement>;
		p: preact.HTMLAttributes<HTMLParagraphElement>;
		param: preact.ParamHTMLAttributes<HTMLParamElement>;
		picture: preact.PictureHTMLAttributes<HTMLPictureElement>;
		pre: preact.HTMLAttributes<HTMLPreElement>;
		progress: preact.ProgressHTMLAttributes<HTMLProgressElement>;
		q: preact.QuoteHTMLAttributes<HTMLQuoteElement>;
		rp: preact.HTMLAttributes<HTMLElement>;
		rt: preact.HTMLAttributes<HTMLElement>;
		ruby: preact.HTMLAttributes<HTMLElement>;
		s: preact.HTMLAttributes<HTMLElement>;
		samp: preact.HTMLAttributes<HTMLElement>;
		script: preact.ScriptHTMLAttributes<HTMLScriptElement>;
		search: preact.SearchHTMLAttributes<HTMLElement>;
		section: preact.HTMLAttributes<HTMLElement>;
		select: preact.AccessibleSelectHTMLAttributes<HTMLSelectElement>;
		slot: preact.SlotHTMLAttributes<HTMLSlotElement>;
		small: preact.HTMLAttributes<HTMLElement>;
		source: preact.SourceHTMLAttributes<HTMLSourceElement>;
		span: preact.HTMLAttributes<HTMLSpanElement>;
		strong: preact.HTMLAttributes<HTMLElement>;
		style: preact.StyleHTMLAttributes<HTMLStyleElement>;
		sub: preact.HTMLAttributes<HTMLElement>;
		summary: preact.HTMLAttributes<HTMLElement>;
		sup: preact.HTMLAttributes<HTMLElement>;
		table: preact.TableHTMLAttributes<HTMLTableElement>;
		tbody: preact.HTMLAttributes<HTMLTableSectionElement>;
		td: preact.TdHTMLAttributes<HTMLTableCellElement>;
		template: preact.TemplateHTMLAttributes<HTMLTemplateElement>;
		textarea: preact.TextareaHTMLAttributes<HTMLTextAreaElement>;
		tfoot: preact.HTMLAttributes<HTMLTableSectionElement>;
		th: preact.ThHTMLAttributes<HTMLTableCellElement>;
		thead: preact.HTMLAttributes<HTMLTableSectionElement>;
		time: preact.TimeHTMLAttributes<HTMLTimeElement>;
		title: preact.TitleHTMLAttributes<HTMLTitleElement>;
		tr: preact.HTMLAttributes<HTMLTableRowElement>;
		track: preact.TrackHTMLAttributes<HTMLTrackElement>;
		u: preact.UlHTMLAttributes<HTMLElement>;
		ul: preact.HTMLAttributes<HTMLUListElement>;
		var: preact.HTMLAttributes<HTMLElement>;
		video: preact.VideoHTMLAttributes<HTMLVideoElement>;
		wbr: preact.WbrHTMLAttributes<HTMLElement>;
	}

	export interface IntrinsicElements
		extends IntrinsicSVGElements,
			IntrinsicMathMLElements,
			IntrinsicHTMLElements {}
}
