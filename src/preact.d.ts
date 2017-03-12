declare namespace preact {
	interface ComponentProps<C extends Component<any, any>> {
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
		componentDidUnmount?():void;
		componentWillReceiveProps?(nextProps:PropsType,nextContext:any):void;
		shouldComponentUpdate?(nextProps:PropsType,nextState:StateType,nextContext:any):boolean;
		componentWillUpdate?(nextProps:PropsType,nextState:StateType,nextContext:any):void;
		componentDidUpdate?(previousProps:PropsType,previousState:StateType,previousContext:any):void;
	}

	interface ComponentConstructor<PropsType, StateType> {
		new (props?:PropsType):Component<PropsType, StateType>;
	}

	abstract class Component<PropsType, StateType> implements ComponentLifecycle<PropsType, StateType> {
		constructor(props?:PropsType);

		static displayName?:string;
		static defaultProps?:any;

		state:StateType;
		props:PropsType & ComponentProps<this>;
		base:HTMLElement;

		linkState:(name:string) => (event: Event) => void;

		setState<K extends keyof StateType>(state:Pick<StateType, K>, callback?:() => void):void;
		setState<K extends keyof StateType>(fn:(prevState:StateType, props:PropsType) => Pick<StateType, K>, callback?:() => void):void;

		forceUpdate(): void;

		abstract render(props:PropsType & ComponentProps<this>, state:any):JSX.Element;
	}

	function h<PropsType>(node:ComponentConstructor<PropsType, any>, params:PropsType, ...children:(JSX.Element|JSX.Element[]|string)[]):JSX.Element;
	function h(node:string, params:JSX.HTMLAttributes&JSX.SVGAttributes&{[propName: string]: any}, ...children:(JSX.Element|JSX.Element[]|string)[]):JSX.Element;
	function render(node:JSX.Element, parent:Element, mergeWith?:Element):Element;
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
		clipPath?:string;
		cx?:number | string;
		cy?:number | string;
		d?:string;
		dx?:number | string;
		dy?:number | string;
		fill?:string;
		fillOpacity?:number | string;
		fontFamily?:string;
		fontSize?:number | string;
		fx?:number | string;
		fy?:number | string;
		gradientTransform?:string;
		gradientUnits?:string;
		markerEnd?:string;
		markerMid?:string;
		markerStart?:string;
		offset?:number | string;
		opacity?:number | string;
		patternContentUnits?:string;
		patternUnits?:string;
		points?:string;
		preserveAspectRatio?:string;
		r?:number | string;
		rx?:number | string;
		ry?:number | string;
		spreadMethod?:string;
		stopColor?:string;
		stopOpacity?:number | string;
		stroke?:string;
		strokeDasharray?:string;
		strokeLinecap?:string;
		strokeMiterlimit?:string;
		strokeOpacity?:number | string;
		strokeWidth?:number | string;
		textAnchor?:string;
		transform?:string;
		version?:string;
		viewBox?:string;
		x1?:number | string;
		x2?:number | string;
		x?:number | string;
		xlinkActuate?:string;
		xlinkArcrole?:string;
		xlinkHref?:string;
		xlinkRole?:string;
		xlinkShow?:string;
		xlinkTitle?:string;
		xlinkType?:string;
		xmlBase?:string;
		xmlLang?:string;
		xmlSpace?:string;
		y1?:number | string;
		y2?:number | string;
		y?:number | string;
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
		onDoubleClick?:MouseEventHandler;
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
