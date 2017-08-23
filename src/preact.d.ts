declare namespace preact {
	interface ComponentProps<C extends Component<any, any> | FunctionalComponent<any>> {
		children?:JSX.Element[];
		key?:string | number | any;
		ref?:(el: C) => void;
	}

	interface DangerouslySetInnerHTML {
	 __html: string;
	}

	interface PreactHTMLAttributes {
		dangerouslySetInnerHTML?:DangerouslySetInnerHTML;
		key?:string;
		ref?:(el?: Element) => void;
	}

	interface VNode {
		nodeName:ComponentConstructor<any, any>|string;
		attributes:{[name:string]:any};
		children:VNode[];
		key:string;
	}

	interface ComponentLifecycle<PropsType, StateType> {
		componentWillMount?():void;
		componentDidMount?():void;
		componentWillUnmount?():void;
		componentWillReceiveProps?(nextProps:PropsType,nextContext:any):void;
		shouldComponentUpdate?(nextProps:PropsType,nextState:StateType,nextContext:any):boolean;
		componentWillUpdate?(nextProps:PropsType,nextState:StateType,nextContext:any):void;
		componentDidUpdate?(previousProps:PropsType,previousState:StateType,previousContext:any):void;
	}

	interface FunctionalComponent<PropsType> {
		(props?:PropsType & ComponentProps<this>, context?:any):JSX.Element;
		displayName?:string;
		defaultProps?:any;
	}

	interface ComponentConstructor<PropsType, StateType> {
		new (props?:PropsType, context?: any):Component<PropsType, StateType>;
	}

    // Type alias for a component considered generally, whether stateless or stateful.
	type AnyComponent<PropsType, StateType> = FunctionalComponent<PropsType> | typeof Component;

	abstract class Component<PropsType, StateType> {
		constructor(props?:PropsType, context?:any);

		static displayName?:string;
		static defaultProps?:any;

		state:StateType;
		props:PropsType & ComponentProps<this>;
		context:any;
		base:HTMLElement;

		linkState:(name:string) => (event: Event) => void;

		setState<K extends keyof StateType>(state:Pick<StateType, K>, callback?:() => void):void;
		setState<K extends keyof StateType>(fn:(prevState:StateType, props:PropsType) => Pick<StateType, K>, callback?:() => void):void;

		forceUpdate(callback?:() => void): void;

		abstract render(props?:PropsType & ComponentProps<this>, state?:StateType, context?:any):JSX.Element|null;
	}
	interface Component<PropsType, StateType> extends ComponentLifecycle<PropsType, StateType> { }

	function h<PropsType>(node:ComponentConstructor<PropsType, any> | FunctionalComponent<PropsType>, params:PropsType, ...children:(JSX.Element|JSX.Element[]|string)[]):JSX.Element;
	function h(node:string, params:JSX.HTMLAttributes&JSX.SVGAttributes&{[propName: string]: any}, ...children:(JSX.Element|JSX.Element[]|string)[]):JSX.Element;
	function render(node:JSX.Element, parent:Element|Document, mergeWith?:Element):Element;
	function rerender():void;
	function cloneElement(element:JSX.Element, props:any):JSX.Element;

	var options:{
		syncComponentUpdates?:boolean;
		debounceRendering?:(render:() => void) => void;
		vnode?:(vnode:VNode) => void;
		event?:(event:Event) => Event;
	};
}

declare module "preact" {
	export = preact;
}

declare module "preact/devtools" {
	// Empty. This module initializes the React Developer Tools integration
	// when imported.
}

declare namespace JSX {
	interface Element extends preact.VNode {
	}

	interface ElementClass extends preact.Component<any, any> {
	}

	interface ElementAttributesProperty {
		props:any;
	}

	interface SVGAttributes extends HTMLAttributes {
		accentHeight?:number | string;
		accumulate?:"none" | "sum";
		additive?:"replace" | "sum";
		alignmentBaseline?:"auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit";
		allowReorder?:"no" | "yes";
		alphabetic?:number | string;
		amplitude?:number | string;
		arabicForm?:"initial" | "medial" | "terminal" | "isolated";
		ascent?:number | string;
		attributeName?:string;
		attributeType?:string;
		autoReverse?:number | string;
		azimuth?:number | string;
		baseFrequency?:number | string;
		baselineShift?:number | string;
		baseProfile?:number | string;
		bbox?:number | string;
		begin?:number | string;
		bias?:number | string;
		by?:number | string;
		calcMode?:number | string;
		capHeight?:number | string;
		clip?:number | string;
		clipPath?:string;
		clipPathUnits?:number | string;
		clipRule?:number | string;
		colorInterpolation?:number | string;
		colorInterpolationFilters?:"auto" | "sRGB" | "linearRGB" | "inherit";
		colorProfile?:number | string;
		colorRendering?:number | string;
		contentScriptType?:number | string;
		contentStyleType?:number | string;
		cursor?:number | string;
		cx?:number | string;
		cy?:number | string;
		d?:string;
		decelerate?:number | string;
		descent?:number | string;
		diffuseConstant?:number | string;
		direction?:number | string;
		display?:number | string;
		divisor?:number | string;
		dominantBaseline?:number | string;
		dur?:number | string;
		dx?:number | string;
		dy?:number | string;
		edgeMode?:number | string;
		elevation?:number | string;
		enableBackground?:number | string;
		end?:number | string;
		exponent?:number | string;
		externalResourcesRequired?:number | string;
		fill?:string;
		fillOpacity?:number | string;
		fillRule?:"nonzero" | "evenodd" | "inherit";
		filter?:string;
		filterRes?:number | string;
		filterUnits?:number | string;
		floodColor?:number | string;
		floodOpacity?:number | string;
		focusable?:number | string;
		fontFamily?:string;
		fontSize?:number | string;
		fontSizeAdjust?:number | string;
		fontStretch?:number | string;
		fontStyle?:number | string;
		fontVariant?:number | string;
		fontWeight?:number | string;
		format?:number | string;
		from?:number | string;
		fx?:number | string;
		fy?:number | string;
		g1?:number | string;
		g2?:number | string;
		glyphName?:number | string;
		glyphOrientationHorizontal?:number | string;
		glyphOrientationVertical?:number | string;
		glyphRef?:number | string;
		gradientTransform?:string;
		gradientUnits?:string;
		hanging?:number | string;
		horizAdvX?:number | string;
		horizOriginX?:number | string;
		ideographic?:number | string;
		imageRendering?:number | string;
		in2?:number | string;
		in?:string;
		intercept?:number | string;
		k1?:number | string;
		k2?:number | string;
		k3?:number | string;
		k4?:number | string;
		k?:number | string;
		kernelMatrix?:number | string;
		kernelUnitLength?:number | string;
		kerning?:number | string;
		keyPoints?:number | string;
		keySplines?:number | string;
		keyTimes?:number | string;
		lengthAdjust?:number | string;
		letterSpacing?:number | string;
		lightingColor?:number | string;
		limitingConeAngle?:number | string;
		local?:number | string;
		markerEnd?:string;
		markerHeight?:number | string;
		markerMid?:string;
		markerStart?:string;
		markerUnits?:number | string;
		markerWidth?:number | string;
		mask?:string;
		maskContentUnits?:number | string;
		maskUnits?:number | string;
		mathematical?:number | string;
		mode?:number | string;
		numOctaves?:number | string;
		offset?:number | string;
		opacity?:number | string;
		operator?:number | string;
		order?:number | string;
		orient?:number | string;
		orientation?:number | string;
		origin?:number | string;
		overflow?:number | string;
		overlinePosition?:number | string;
		overlineThickness?:number | string;
		paintOrder?:number | string;
		panose1?:number | string;
		pathLength?:number | string;
		patternContentUnits?:string;
		patternTransform?:number | string;
		patternUnits?:string;
		pointerEvents?:number | string;
		points?:string;
		pointsAtX?:number | string;
		pointsAtY?:number | string;
		pointsAtZ?:number | string;
		preserveAlpha?:number | string;
		preserveAspectRatio?:string;
		primitiveUnits?:number | string;
		r?:number | string;
		radius?:number | string;
		refX?:number | string;
		refY?:number | string;
		renderingIntent?:number | string;
		repeatCount?:number | string;
		repeatDur?:number | string;
		requiredExtensions?:number | string;
		requiredFeatures?:number | string;
		restart?:number | string;
		result?:string;
		rotate?:number | string;
		rx?:number | string;
		ry?:number | string;
		scale?:number | string;
		seed?:number | string;
		shapeRendering?:number | string;
		slope?:number | string;
		spacing?:number | string;
		specularConstant?:number | string;
		specularExponent?:number | string;
		speed?:number | string;
		spreadMethod?:string;
		startOffset?:number | string;
		stdDeviation?:number | string;
		stemh?:number | string;
		stemv?:number | string;
		stitchTiles?:number | string;
		stopColor?:string;
		stopOpacity?:number | string;
		strikethroughPosition?:number | string;
		strikethroughThickness?:number | string;
		string?:number | string;
		stroke?:string;
		strokeDasharray?:string | number;
		strokeDashoffset?:string | number;
		strokeLinecap?:"butt" | "round" | "square" | "inherit";
		strokeLinejoin?:"miter" | "round" | "bevel" | "inherit";
		strokeMiterlimit?:string;
		strokeOpacity?:number | string;
		strokeWidth?:number | string;
		surfaceScale?:number | string;
		systemLanguage?:number | string;
		tableValues?:number | string;
		targetX?:number | string;
		targetY?:number | string;
		textAnchor?:string;
		textDecoration?:number | string;
		textLength?:number | string;
		textRendering?:number | string;
		to?:number | string;
		transform?:string;
		u1?:number | string;
		u2?:number | string;
		underlinePosition?:number | string;
		underlineThickness?:number | string;
		unicode?:number | string;
		unicodeBidi?:number | string;
		unicodeRange?:number | string;
		unitsPerEm?:number | string;
		vAlphabetic?:number | string;
		values?:string;
		vectorEffect?:number | string;
		version?:string;
		vertAdvY?:number | string;
		vertOriginX?:number | string;
		vertOriginY?:number | string;
		vHanging?:number | string;
		vIdeographic?:number | string;
		viewBox?:string;
		viewTarget?:number | string;
		visibility?:number | string;
		vMathematical?:number | string;
		widths?:number | string;
		wordSpacing?:number | string;
		writingMode?:number | string;
		x1?:number | string;
		x2?:number | string;
		x?:number | string;
		xChannelSelector?:string;
		xHeight?:number | string;
		xlinkActuate?:string;
		xlinkArcrole?:string;
		xlinkHref?:string;
		xlinkRole?:string;
		xlinkShow?:string;
		xlinkTitle?:string;
		xlinkType?:string;
		xmlBase?:string;
		xmlLang?:string;
		xmlns?:string;
		xmlnsXlink?:string;
		xmlSpace?:string;
		y1?:number | string;
		y2?:number | string;
		y?:number | string;
		yChannelSelector?:string;
		z?:number | string;
		zoomAndPan?:string;
	}

	interface PathAttributes {
		d:string;
	}

	interface EventHandler<E extends Event> {
		(event:E):void;
	}

	type ClipboardEventHandler = EventHandler<ClipboardEvent>;
	type CompositionEventHandler = EventHandler<CompositionEvent>;
	type DragEventHandler = EventHandler<DragEvent>;
	type FocusEventHandler = EventHandler<FocusEvent>;
	type KeyboardEventHandler = EventHandler<KeyboardEvent>;
	type MouseEventHandler = EventHandler<MouseEvent>;
	type TouchEventHandler = EventHandler<TouchEvent>;
	type UIEventHandler = EventHandler<UIEvent>;
	type WheelEventHandler = EventHandler<WheelEvent>;
	type AnimationEventHandler = EventHandler<AnimationEvent>;
	type TransitionEventHandler = EventHandler<TransitionEvent>;
	type GenericEventHandler = EventHandler<Event>;

	interface DOMAttributes {
		// Image Events
		onLoad?:GenericEventHandler;

		// Clipboard Events
		onCopy?:ClipboardEventHandler;
		onCut?:ClipboardEventHandler;
		onPaste?:ClipboardEventHandler;

		// Composition Events
		onCompositionEnd?:CompositionEventHandler;
		onCompositionStart?:CompositionEventHandler;
		onCompositionUpdate?:CompositionEventHandler;

		// Focus Events
		onFocus?:FocusEventHandler;
		onBlur?:FocusEventHandler;

		// Form Events
		onChange?:GenericEventHandler;
		onInput?:GenericEventHandler;
		onSearch?:GenericEventHandler;
		onSubmit?:GenericEventHandler;

		// Keyboard Events
		onKeyDown?:KeyboardEventHandler;
		onKeyPress?:KeyboardEventHandler;
		onKeyUp?:KeyboardEventHandler;

		// Media Events
		onAbort?:GenericEventHandler;
		onCanPlay?:GenericEventHandler;
		onCanPlayThrough?:GenericEventHandler;
		onDurationChange?:GenericEventHandler;
		onEmptied?:GenericEventHandler;
		onEncrypted?:GenericEventHandler;
		onEnded?:GenericEventHandler;
		onLoadedData?:GenericEventHandler;
		onLoadedMetadata?:GenericEventHandler;
		onLoadStart?:GenericEventHandler;
		onPause?:GenericEventHandler;
		onPlay?:GenericEventHandler;
		onPlaying?:GenericEventHandler;
		onProgress?:GenericEventHandler;
		onRateChange?:GenericEventHandler;
		onSeeked?:GenericEventHandler;
		onSeeking?:GenericEventHandler;
		onStalled?:GenericEventHandler;
		onSuspend?:GenericEventHandler;
		onTimeUpdate?:GenericEventHandler;
		onVolumeChange?:GenericEventHandler;
		onWaiting?:GenericEventHandler;

		// MouseEvents
		onClick?:MouseEventHandler;
		onContextMenu?:MouseEventHandler;
		onDblClick?: MouseEventHandler;
		onDrag?:DragEventHandler;
		onDragEnd?:DragEventHandler;
		onDragEnter?:DragEventHandler;
		onDragExit?:DragEventHandler;
		onDragLeave?:DragEventHandler;
		onDragOver?:DragEventHandler;
		onDragStart?:DragEventHandler;
		onDrop?:DragEventHandler;
		onMouseDown?:MouseEventHandler;
		onMouseEnter?:MouseEventHandler;
		onMouseLeave?:MouseEventHandler;
		onMouseMove?:MouseEventHandler;
		onMouseOut?:MouseEventHandler;
		onMouseOver?:MouseEventHandler;
		onMouseUp?:MouseEventHandler;

		// Selection Events
		onSelect?:GenericEventHandler;

		// Touch Events
		onTouchCancel?:TouchEventHandler;
		onTouchEnd?:TouchEventHandler;
		onTouchMove?:TouchEventHandler;
		onTouchStart?:TouchEventHandler;

		// UI Events
		onScroll?:UIEventHandler;

		// Wheel Events
		onWheel?:WheelEventHandler;

		// Animation Events
		onAnimationStart?:AnimationEventHandler;
		onAnimationEnd?:AnimationEventHandler;
		onAnimationIteration?:AnimationEventHandler;

		// Transition Events
		onTransitionEnd?:TransitionEventHandler;
	}

	interface HTMLAttributes extends preact.PreactHTMLAttributes, DOMAttributes {
		// Standard HTML Attributes
		accept?:string;
		acceptCharset?:string;
		accessKey?:string;
		action?:string;
		allowFullScreen?:boolean;
		allowTransparency?:boolean;
		alt?:string;
		async?:boolean;
		autocomplete?:string;
		autofocus?:boolean;
		autoPlay?:boolean;
		capture?:boolean;
		cellPadding?:number | string;
		cellSpacing?:number | string;
		charSet?:string;
		challenge?:string;
		checked?:boolean;
		class?:string | { [key:string]: boolean };
		className?:string | { [key:string]: boolean };
		cols?:number;
		colSpan?:number;
		content?:string;
		contentEditable?:boolean;
		contextMenu?:string;
		controls?:boolean;
		coords?:string;
		crossOrigin?:string;
		data?:string;
		dateTime?:string;
		default?:boolean;
		defer?:boolean;
		dir?:string;
		disabled?:boolean;
		download?:any;
		draggable?:boolean;
		encType?:string;
		form?:string;
		formAction?:string;
		formEncType?:string;
		formMethod?:string;
		formNoValidate?:boolean;
		formTarget?:string;
		frameBorder?:number | string;
		headers?:string;
		height?:number | string;
		hidden?:boolean;
		high?:number;
		href?:string;
		hrefLang?:string;
		for?:string;
		httpEquiv?:string;
		icon?:string;
		id?:string;
		inputMode?:string;
		integrity?:string;
		is?:string;
		keyParams?:string;
		keyType?:string;
		kind?:string;
		label?:string;
		lang?:string;
		list?:string;
		loop?:boolean;
		low?:number;
		manifest?:string;
		marginHeight?:number;
		marginWidth?:number;
		max?:number | string;
		maxLength?:number;
		media?:string;
		mediaGroup?:string;
		method?:string;
		min?:number | string;
		minLength?:number;
		multiple?:boolean;
		muted?:boolean;
		name?:string;
		noValidate?:boolean;
		open?:boolean;
		optimum?:number;
		pattern?:string;
		placeholder?:string;
		poster?:string;
		preload?:string;
		radioGroup?:string;
		readOnly?:boolean;
		rel?:string;
		required?:boolean;
		role?:string;
		rows?:number;
		rowSpan?:number;
		sandbox?:string;
		scope?:string;
		scoped?:boolean;
		scrolling?:string;
		seamless?:boolean;
		selected?:boolean;
		shape?:string;
		size?:number;
		sizes?:string;
		slot?:string;
		span?:number;
		spellCheck?:boolean;
		src?:string;
		srcset?:string;
		srcDoc?:string;
		srcLang?:string;
		srcSet?:string;
		start?:number;
		step?:number | string;
		style?:any;
		summary?:string;
		tabIndex?:number;
		target?:string;
		title?:string;
		type?:string;
		useMap?:string;
		value?:string | string[];
		width?:number | string;
		wmode?:string;
		wrap?:string;

		// RDFa Attributes
		about?:string;
		datatype?:string;
		inlist?:any;
		prefix?:string;
		property?:string;
		resource?:string;
		typeof?:string;
		vocab?:string;
	}

	interface IntrinsicElements {
		// HTML
		a:HTMLAttributes;
		abbr:HTMLAttributes;
		address:HTMLAttributes;
		area:HTMLAttributes;
		article:HTMLAttributes;
		aside:HTMLAttributes;
		audio:HTMLAttributes;
		b:HTMLAttributes;
		base:HTMLAttributes;
		bdi:HTMLAttributes;
		bdo:HTMLAttributes;
		big:HTMLAttributes;
		blockquote:HTMLAttributes;
		body:HTMLAttributes;
		br:HTMLAttributes;
		button:HTMLAttributes;
		canvas:HTMLAttributes;
		caption:HTMLAttributes;
		cite:HTMLAttributes;
		code:HTMLAttributes;
		col:HTMLAttributes;
		colgroup:HTMLAttributes;
		data:HTMLAttributes;
		datalist:HTMLAttributes;
		dd:HTMLAttributes;
		del:HTMLAttributes;
		details:HTMLAttributes;
		dfn:HTMLAttributes;
		dialog:HTMLAttributes;
		div:HTMLAttributes;
		dl:HTMLAttributes;
		dt:HTMLAttributes;
		em:HTMLAttributes;
		embed:HTMLAttributes;
		fieldset:HTMLAttributes;
		figcaption:HTMLAttributes;
		figure:HTMLAttributes;
		footer:HTMLAttributes;
		form:HTMLAttributes;
		h1:HTMLAttributes;
		h2:HTMLAttributes;
		h3:HTMLAttributes;
		h4:HTMLAttributes;
		h5:HTMLAttributes;
		h6:HTMLAttributes;
		head:HTMLAttributes;
		header:HTMLAttributes;
		hr:HTMLAttributes;
		html:HTMLAttributes;
		i:HTMLAttributes;
		iframe:HTMLAttributes;
		img:HTMLAttributes;
		input:HTMLAttributes;
		ins:HTMLAttributes;
		kbd:HTMLAttributes;
		keygen:HTMLAttributes;
		label:HTMLAttributes;
		legend:HTMLAttributes;
		li:HTMLAttributes;
		link:HTMLAttributes;
		main:HTMLAttributes;
		map:HTMLAttributes;
		mark:HTMLAttributes;
		menu:HTMLAttributes;
		menuitem:HTMLAttributes;
		meta:HTMLAttributes;
		meter:HTMLAttributes;
		nav:HTMLAttributes;
		noscript:HTMLAttributes;
		object:HTMLAttributes;
		ol:HTMLAttributes;
		optgroup:HTMLAttributes;
		option:HTMLAttributes;
		output:HTMLAttributes;
		p:HTMLAttributes;
		param:HTMLAttributes;
		picture:HTMLAttributes;
		pre:HTMLAttributes;
		progress:HTMLAttributes;
		q:HTMLAttributes;
		rp:HTMLAttributes;
		rt:HTMLAttributes;
		ruby:HTMLAttributes;
		s:HTMLAttributes;
		samp:HTMLAttributes;
		script:HTMLAttributes;
		section:HTMLAttributes;
		select:HTMLAttributes;
		slot:HTMLAttributes;
		small:HTMLAttributes;
		source:HTMLAttributes;
		span:HTMLAttributes;
		strong:HTMLAttributes;
		style:HTMLAttributes;
		sub:HTMLAttributes;
		summary:HTMLAttributes;
		sup:HTMLAttributes;
		table:HTMLAttributes;
		tbody:HTMLAttributes;
		td:HTMLAttributes;
		textarea:HTMLAttributes;
		tfoot:HTMLAttributes;
		th:HTMLAttributes;
		thead:HTMLAttributes;
		time:HTMLAttributes;
		title:HTMLAttributes;
		tr:HTMLAttributes;
		track:HTMLAttributes;
		u:HTMLAttributes;
		ul:HTMLAttributes;
		"var":HTMLAttributes;
		video:HTMLAttributes;
		wbr:HTMLAttributes;

		//SVG
		svg:SVGAttributes;
		animate:SVGAttributes;
		circle:SVGAttributes;
		clipPath:SVGAttributes;
		defs:SVGAttributes;
		ellipse:SVGAttributes;
		feBlend:SVGAttributes;
		feColorMatrix:SVGAttributes;
		feComponentTransfer:SVGAttributes;
		feComposite:SVGAttributes;
		feConvolveMatrix:SVGAttributes;
		feDiffuseLighting:SVGAttributes;
		feDisplacementMap:SVGAttributes;
		feFlood:SVGAttributes;
		feGaussianBlur:SVGAttributes;
		feImage:SVGAttributes;
		feMerge:SVGAttributes;
		feMergeNode:SVGAttributes;
		feMorphology:SVGAttributes;
		feOffset:SVGAttributes;
		feSpecularLighting:SVGAttributes;
		feTile:SVGAttributes;
		feTurbulence:SVGAttributes;
		filter:SVGAttributes;
		foreignObject:SVGAttributes;
		g:SVGAttributes;
		image:SVGAttributes;
		line:SVGAttributes;
		linearGradient:SVGAttributes;
		marker:SVGAttributes;
		mask:SVGAttributes;
		path:SVGAttributes;
		pattern:SVGAttributes;
		polygon:SVGAttributes;
		polyline:SVGAttributes;
		radialGradient:SVGAttributes;
		rect:SVGAttributes;
		stop:SVGAttributes;
		symbol:SVGAttributes;
		text:SVGAttributes;
		tspan:SVGAttributes;
		use:SVGAttributes;
	}
}
