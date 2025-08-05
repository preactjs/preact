// Users who only use Preact for SSR might not specify "dom" in their lib in tsconfig.json
/// <reference lib="dom" />

import {
	Component,
	ComponentType,
	FunctionComponent,
	VNode,
	SVGAttributes,
	HTMLAttributes,
	AnnotationMathMLAttributes,
	AnnotationXmlMathMLAttributes,
	MActionMathMLAttributes,
	MathMathMLAttributes,
	MEncloseMathMLAttributes,
	MErrorMathMLAttributes,
	MFencedMathMLAttributes,
	MFracMathMLAttributes,
	MiMathMLAttributes,
	MmultiScriptsMathMLAttributes,
	MNMathMLAttributes,
	MOMathMLAttributes,
	MOverMathMLAttributes,
	MPaddedMathMLAttributes,
	MPhantomMathMLAttributes,
	MPrescriptsMathMLAttributes,
	MRootMathMLAttributes,
	MRowMathMLAttributes,
	MSMathMLAttributes,
	MSpaceMathMLAttributes,
	MSqrtMathMLAttributes,
	MStyleMathMLAttributes,
	MSubMathMLAttributes,
	MSubsupMathMLAttributes,
	MSupMathMLAttributes,
	MTableMathMLAttributes,
	MTdMathMLAttributes,
	MTextMathMLAttributes,
	MTrMathMLAttributes,
	MUnderMathMLAttributes,
	SemanticsMathMLAttributes,
	AnchorHTMLAttributes,
	AreaHTMLAttributes,
	ArticleHTMLAttributes,
	AsideHTMLAttributes,
	AudioHTMLAttributes,
	BaseHTMLAttributes,
	BlockquoteHTMLAttributes,
	BrHTMLAttributes,
	ButtonHTMLAttributes,
	CanvasHTMLAttributes,
	CaptionHTMLAttributes,
	ColHTMLAttributes,
	ColgroupHTMLAttributes,
	DataHTMLAttributes,
	DataListHTMLAttributes,
	DdHTMLAttributes,
	DelHTMLAttributes,
	DetailsHTMLAttributes,
	DialogHTMLAttributes,
	DlHTMLAttributes,
	DtHTMLAttributes,
	EmbedHTMLAttributes,
	FieldsetHTMLAttributes,
	FigcaptionHTMLAttributes,
	FooterHTMLAttributes,
	FormHTMLAttributes,
	HeadingHTMLAttributes,
	HeadHTMLAttributes,
	HeaderHTMLAttributes,
	HrHTMLAttributes,
	HtmlHTMLAttributes,
	IframeHTMLAttributes,
	ImgHTMLAttributes,
	InputHTMLAttributes,
	InsHTMLAttributes,
	KeygenHTMLAttributes,
	LabelHTMLAttributes,
	LegendHTMLAttributes,
	LiHTMLAttributes,
	LinkHTMLAttributes,
	MainHTMLAttributes,
	MapHTMLAttributes,
	MarqueeHTMLAttributes,
	MenuHTMLAttributes,
	MetaHTMLAttributes,
	MeterHTMLAttributes,
	NavHTMLAttributes,
	NoScriptHTMLAttributes,
	ObjectHTMLAttributes,
	OlHTMLAttributes,
	OptgroupHTMLAttributes,
	OptionHTMLAttributes,
	OutputHTMLAttributes,
	ParamHTMLAttributes,
	PictureHTMLAttributes,
	ProgressHTMLAttributes,
	QuoteHTMLAttributes,
	ScriptHTMLAttributes,
	SearchHTMLAttributes,
	SelectHTMLAttributes,
	SlotHTMLAttributes,
	SourceHTMLAttributes,
	StyleHTMLAttributes,
	TableHTMLAttributes,
	TdHTMLAttributes,
	TemplateHTMLAttributes,
	TextareaHTMLAttributes,
	ThHTMLAttributes,
	TimeHTMLAttributes,
	TitleHTMLAttributes,
	TrackHTMLAttributes,
	UlHTMLAttributes,
	VideoHTMLAttributes,
	WbrHTMLAttributes,
} from 'preact';

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

	export interface IntrinsicMathMLElements {
		annotation: AnnotationMathMLAttributes<MathMLElement>;
		'annotation-xml': AnnotationXmlMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/maction */
		maction: MActionMathMLAttributes<MathMLElement>;
		math: MathMathMLAttributes<MathMLElement>;
		/** This feature is non-standard. See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/menclose  */
		menclose: MEncloseMathMLAttributes<MathMLElement>;
		merror: MErrorMathMLAttributes<MathMLElement>;
		/** @deprecated See https://developer.mozilla.org/en-US/docs/Web/MathML/Element/mfenced */
		mfenced: MFencedMathMLAttributes<MathMLElement>;
		mfrac: MFracMathMLAttributes<MathMLElement>;
		mi: MiMathMLAttributes<MathMLElement>;
		mmultiscripts: MmultiScriptsMathMLAttributes<MathMLElement>;
		mn: MNMathMLAttributes<MathMLElement>;
		mo: MOMathMLAttributes<MathMLElement>;
		mover: MOverMathMLAttributes<MathMLElement>;
		mpadded: MPaddedMathMLAttributes<MathMLElement>;
		mphantom: MPhantomMathMLAttributes<MathMLElement>;
		mprescripts: MPrescriptsMathMLAttributes<MathMLElement>;
		mroot: MRootMathMLAttributes<MathMLElement>;
		mrow: MRowMathMLAttributes<MathMLElement>;
		ms: MSMathMLAttributes<MathMLElement>;
		mspace: MSpaceMathMLAttributes<MathMLElement>;
		msqrt: MSqrtMathMLAttributes<MathMLElement>;
		mstyle: MStyleMathMLAttributes<MathMLElement>;
		msub: MSubMathMLAttributes<MathMLElement>;
		msubsup: MSubsupMathMLAttributes<MathMLElement>;
		msup: MSupMathMLAttributes<MathMLElement>;
		mtable: MTableMathMLAttributes<MathMLElement>;
		mtd: MTdMathMLAttributes<MathMLElement>;
		mtext: MTextMathMLAttributes<MathMLElement>;
		mtr: MTrMathMLAttributes<MathMLElement>;
		munder: MUnderMathMLAttributes<MathMLElement>;
		munderover: MUnderMathMLAttributes<MathMLElement>;
		semantics: SemanticsMathMLAttributes<MathMLElement>;
	}

	export interface IntrinsicElements
		extends IntrinsicSVGElements,
			IntrinsicMathMLElements {
		a: AnchorHTMLAttributes<HTMLAnchorElement>;
		abbr: HTMLAttributes<HTMLElement>;
		address: HTMLAttributes<HTMLElement>;
		area: AreaHTMLAttributes<HTMLAreaElement>;
		article: ArticleHTMLAttributes<HTMLElement>;
		aside: AsideHTMLAttributes<HTMLElement>;
		audio: AudioHTMLAttributes<HTMLAudioElement>;
		b: HTMLAttributes<HTMLElement>;
		base: BaseHTMLAttributes<HTMLBaseElement>;
		bdi: HTMLAttributes<HTMLElement>;
		bdo: HTMLAttributes<HTMLElement>;
		big: HTMLAttributes<HTMLElement>;
		blockquote: BlockquoteHTMLAttributes<HTMLQuoteElement>;
		body: HTMLAttributes<HTMLBodyElement>;
		br: BrHTMLAttributes<HTMLBRElement>;
		button: ButtonHTMLAttributes<HTMLButtonElement>;
		canvas: CanvasHTMLAttributes<HTMLCanvasElement>;
		caption: CaptionHTMLAttributes<HTMLTableCaptionElement>;
		cite: HTMLAttributes<HTMLElement>;
		code: HTMLAttributes<HTMLElement>;
		col: ColHTMLAttributes<HTMLTableColElement>;
		colgroup: ColgroupHTMLAttributes<HTMLTableColElement>;
		data: DataHTMLAttributes<HTMLDataElement>;
		datalist: DataListHTMLAttributes<HTMLDataListElement>;
		dd: DdHTMLAttributes<HTMLElement>;
		del: DelHTMLAttributes<HTMLModElement>;
		details: DetailsHTMLAttributes<HTMLDetailsElement>;
		dfn: HTMLAttributes<HTMLElement>;
		dialog: DialogHTMLAttributes<HTMLDialogElement>;
		div: HTMLAttributes<HTMLDivElement>;
		dl: DlHTMLAttributes<HTMLDListElement>;
		dt: DtHTMLAttributes<HTMLElement>;
		em: HTMLAttributes<HTMLElement>;
		embed: EmbedHTMLAttributes<HTMLEmbedElement>;
		fieldset: FieldsetHTMLAttributes<HTMLFieldSetElement>;
		figcaption: FigcaptionHTMLAttributes<HTMLElement>;
		figure: HTMLAttributes<HTMLElement>;
		footer: FooterHTMLAttributes<HTMLElement>;
		form: FormHTMLAttributes<HTMLFormElement>;
		h1: HeadingHTMLAttributes<HTMLHeadingElement>;
		h2: HeadingHTMLAttributes<HTMLHeadingElement>;
		h3: HeadingHTMLAttributes<HTMLHeadingElement>;
		h4: HeadingHTMLAttributes<HTMLHeadingElement>;
		h5: HeadingHTMLAttributes<HTMLHeadingElement>;
		h6: HeadingHTMLAttributes<HTMLHeadingElement>;
		head: HeadHTMLAttributes<HTMLHeadElement>;
		header: HeaderHTMLAttributes<HTMLElement>;
		hgroup: HTMLAttributes<HTMLElement>;
		hr: HrHTMLAttributes<HTMLHRElement>;
		html: HtmlHTMLAttributes<HTMLHtmlElement>;
		i: HTMLAttributes<HTMLElement>;
		iframe: IframeHTMLAttributes<HTMLIFrameElement>;
		img: ImgHTMLAttributes<HTMLImageElement>;
		input: InputHTMLAttributes<HTMLInputElement>;
		ins: InsHTMLAttributes<HTMLModElement>;
		kbd: HTMLAttributes<HTMLElement>;
		keygen: KeygenHTMLAttributes<HTMLUnknownElement>;
		label: LabelHTMLAttributes<HTMLLabelElement>;
		legend: LegendHTMLAttributes<HTMLLegendElement>;
		li: LiHTMLAttributes<HTMLLIElement>;
		link: LinkHTMLAttributes<HTMLLinkElement>;
		main: MainHTMLAttributes<HTMLElement>;
		map: MapHTMLAttributes<HTMLMapElement>;
		mark: HTMLAttributes<HTMLElement>;
		marquee: MarqueeHTMLAttributes<HTMLMarqueeElement>;
		menu: MenuHTMLAttributes<HTMLMenuElement>;
		menuitem: HTMLAttributes<HTMLUnknownElement>;
		meta: MetaHTMLAttributes<HTMLMetaElement>;
		meter: MeterHTMLAttributes<HTMLMeterElement>;
		nav: NavHTMLAttributes<HTMLElement>;
		noscript: NoScriptHTMLAttributes<HTMLElement>;
		object: ObjectHTMLAttributes<HTMLObjectElement>;
		ol: OlHTMLAttributes<HTMLOListElement>;
		optgroup: OptgroupHTMLAttributes<HTMLOptGroupElement>;
		option: OptionHTMLAttributes<HTMLOptionElement>;
		output: OutputHTMLAttributes<HTMLOutputElement>;
		p: HTMLAttributes<HTMLParagraphElement>;
		param: ParamHTMLAttributes<HTMLParamElement>;
		picture: PictureHTMLAttributes<HTMLPictureElement>;
		pre: HTMLAttributes<HTMLPreElement>;
		progress: ProgressHTMLAttributes<HTMLProgressElement>;
		q: QuoteHTMLAttributes<HTMLQuoteElement>;
		rp: HTMLAttributes<HTMLElement>;
		rt: HTMLAttributes<HTMLElement>;
		ruby: HTMLAttributes<HTMLElement>;
		s: HTMLAttributes<HTMLElement>;
		samp: HTMLAttributes<HTMLElement>;
		script: ScriptHTMLAttributes<HTMLScriptElement>;
		search: SearchHTMLAttributes<HTMLElement>;
		section: HTMLAttributes<HTMLElement>;
		select: SelectHTMLAttributes<HTMLSelectElement>;
		slot: SlotHTMLAttributes<HTMLSlotElement>;
		small: HTMLAttributes<HTMLElement>;
		source: SourceHTMLAttributes<HTMLSourceElement>;
		span: HTMLAttributes<HTMLSpanElement>;
		strong: HTMLAttributes<HTMLElement>;
		style: StyleHTMLAttributes<HTMLStyleElement>;
		sub: HTMLAttributes<HTMLElement>;
		summary: HTMLAttributes<HTMLElement>;
		sup: HTMLAttributes<HTMLElement>;
		table: TableHTMLAttributes<HTMLTableElement>;
		tbody: HTMLAttributes<HTMLTableSectionElement>;
		td: TdHTMLAttributes<HTMLTableCellElement>;
		template: TemplateHTMLAttributes<HTMLTemplateElement>;
		textarea: TextareaHTMLAttributes<HTMLTextAreaElement>;
		tfoot: HTMLAttributes<HTMLTableSectionElement>;
		th: ThHTMLAttributes<HTMLTableCellElement>;
		thead: HTMLAttributes<HTMLTableSectionElement>;
		time: TimeHTMLAttributes<HTMLTimeElement>;
		title: TitleHTMLAttributes<HTMLTitleElement>;
		tr: HTMLAttributes<HTMLTableRowElement>;
		track: TrackHTMLAttributes<HTMLTrackElement>;
		u: UlHTMLAttributes<HTMLElement>;
		ul: HTMLAttributes<HTMLUListElement>;
		var: HTMLAttributes<HTMLElement>;
		video: VideoHTMLAttributes<HTMLVideoElement>;
		wbr: WbrHTMLAttributes<HTMLElement>;
	}
}
