// Users who only use Preact for SSR might not specify "dom" in their lib in tsconfig.json
/// <reference lib="dom" />

import {
	ClassAttributes,
	Component,
	ComponentChild,
	ComponentType,
	FunctionComponent,
	PreactDOMAttributes,
	VNode
} from './index';

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

	export type DOMCSSProperties = {
		[key in keyof Omit<
			CSSStyleDeclaration,
			| 'item'
			| 'setProperty'
			| 'removeProperty'
			| 'getPropertyValue'
			| 'getPropertyPriority'
		>]?: string | number | null | undefined;
	};
	export type AllCSSProperties = {
		[key: string]: string | number | null | undefined;
	};
	export interface CSSProperties extends AllCSSProperties, DOMCSSProperties {
		cssText?: string | null;
	}

	export interface SignalLike<T> {
		value: T;
		peek(): T;
		subscribe(fn: (value: T) => void): () => void;
	}

	export interface SVGAttributes<Target extends EventTarget = SVGElement>
		extends HTMLAttributes<Target> {
		accentHeight?: number | string | SignalLike<number | string>;
		accumulate?: 'none' | 'sum' | SignalLike<'none' | 'sum'>;
		additive?: 'replace' | 'sum' | SignalLike<'replace' | 'sum'>;
		alignmentBaseline?:
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
			| SignalLike<
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
			  >;
		allowReorder?: 'no' | 'yes' | SignalLike<'no' | 'yes'>;
		alphabetic?: number | string | SignalLike<number | string>;
		amplitude?: number | string | SignalLike<number | string>;
		arabicForm?:
			| 'initial'
			| 'medial'
			| 'terminal'
			| 'isolated'
			| SignalLike<'initial' | 'medial' | 'terminal' | 'isolated'>;
		ascent?: number | string | SignalLike<number | string>;
		attributeName?: string | SignalLike<string>;
		attributeType?: string | SignalLike<string>;
		autoReverse?: number | string | SignalLike<number | string>;
		azimuth?: number | string | SignalLike<number | string>;
		baseFrequency?: number | string | SignalLike<number | string>;
		baselineShift?: number | string | SignalLike<number | string>;
		baseProfile?: number | string | SignalLike<number | string>;
		bbox?: number | string | SignalLike<number | string>;
		begin?: number | string | SignalLike<number | string>;
		bias?: number | string | SignalLike<number | string>;
		by?: number | string | SignalLike<number | string>;
		calcMode?: number | string | SignalLike<number | string>;
		capHeight?: number | string | SignalLike<number | string>;
		clip?: number | string | SignalLike<number | string>;
		clipPath?: string | SignalLike<string>;
		clipPathUnits?: number | string | SignalLike<number | string>;
		clipRule?: number | string | SignalLike<number | string>;
		colorInterpolation?: number | string | SignalLike<number | string>;
		colorInterpolationFilters?:
			| 'auto'
			| 'sRGB'
			| 'linearRGB'
			| 'inherit'
			| SignalLike<'auto' | 'sRGB' | 'linearRGB' | 'inherit'>;
		colorProfile?: number | string | SignalLike<number | string>;
		colorRendering?: number | string | SignalLike<number | string>;
		contentScriptType?: number | string | SignalLike<number | string>;
		contentStyleType?: number | string | SignalLike<number | string>;
		cursor?: number | string | SignalLike<number | string>;
		cx?: number | string | SignalLike<number | string>;
		cy?: number | string | SignalLike<number | string>;
		d?: string | SignalLike<string>;
		decelerate?: number | string | SignalLike<number | string>;
		descent?: number | string | SignalLike<number | string>;
		diffuseConstant?: number | string | SignalLike<number | string>;
		direction?: number | string | SignalLike<number | string>;
		display?: number | string | SignalLike<number | string>;
		divisor?: number | string | SignalLike<number | string>;
		dominantBaseline?: number | string | SignalLike<number | string>;
		dur?: number | string | SignalLike<number | string>;
		dx?: number | string | SignalLike<number | string>;
		dy?: number | string | SignalLike<number | string>;
		edgeMode?: number | string | SignalLike<number | string>;
		elevation?: number | string | SignalLike<number | string>;
		enableBackground?: number | string | SignalLike<number | string>;
		end?: number | string | SignalLike<number | string>;
		exponent?: number | string | SignalLike<number | string>;
		externalResourcesRequired?: number | string | SignalLike<number | string>;
		fill?: string | SignalLike<string>;
		fillOpacity?: number | string | SignalLike<number | string>;
		fillRule?:
			| 'nonzero'
			| 'evenodd'
			| 'inherit'
			| SignalLike<'nonzero' | 'evenodd' | 'inherit'>;
		filter?: string | SignalLike<string>;
		filterRes?: number | string | SignalLike<number | string>;
		filterUnits?: number | string | SignalLike<number | string>;
		floodColor?: number | string | SignalLike<number | string>;
		floodOpacity?: number | string | SignalLike<number | string>;
		focusable?: number | string | SignalLike<number | string>;
		fontFamily?: string | SignalLike<string>;
		fontSize?: number | string | SignalLike<number | string>;
		fontSizeAdjust?: number | string | SignalLike<number | string>;
		fontStretch?: number | string | SignalLike<number | string>;
		fontStyle?: number | string | SignalLike<number | string>;
		fontVariant?: number | string | SignalLike<number | string>;
		fontWeight?: number | string | SignalLike<number | string>;
		format?: number | string | SignalLike<number | string>;
		from?: number | string | SignalLike<number | string>;
		fx?: number | string | SignalLike<number | string>;
		fy?: number | string | SignalLike<number | string>;
		g1?: number | string | SignalLike<number | string>;
		g2?: number | string | SignalLike<number | string>;
		glyphName?: number | string | SignalLike<number | string>;
		glyphOrientationHorizontal?: number | string | SignalLike<number | string>;
		glyphOrientationVertical?: number | string | SignalLike<number | string>;
		glyphRef?: number | string | SignalLike<number | string>;
		gradientTransform?: string | SignalLike<string>;
		gradientUnits?: string | SignalLike<string>;
		hanging?: number | string | SignalLike<number | string>;
		horizAdvX?: number | string | SignalLike<number | string>;
		horizOriginX?: number | string | SignalLike<number | string>;
		ideographic?: number | string | SignalLike<number | string>;
		imageRendering?: number | string | SignalLike<number | string>;
		in2?: number | string | SignalLike<number | string>;
		in?: string | SignalLike<string>;
		intercept?: number | string | SignalLike<number | string>;
		k1?: number | string | SignalLike<number | string>;
		k2?: number | string | SignalLike<number | string>;
		k3?: number | string | SignalLike<number | string>;
		k4?: number | string | SignalLike<number | string>;
		k?: number | string | SignalLike<number | string>;
		kernelMatrix?: number | string | SignalLike<number | string>;
		kernelUnitLength?: number | string | SignalLike<number | string>;
		kerning?: number | string | SignalLike<number | string>;
		keyPoints?: number | string | SignalLike<number | string>;
		keySplines?: number | string | SignalLike<number | string>;
		keyTimes?: number | string | SignalLike<number | string>;
		lengthAdjust?: number | string | SignalLike<number | string>;
		letterSpacing?: number | string | SignalLike<number | string>;
		lightingColor?: number | string | SignalLike<number | string>;
		limitingConeAngle?: number | string | SignalLike<number | string>;
		local?: number | string | SignalLike<number | string>;
		markerEnd?: string | SignalLike<string>;
		markerHeight?: number | string | SignalLike<number | string>;
		markerMid?: string | SignalLike<string>;
		markerStart?: string | SignalLike<string>;
		markerUnits?: number | string | SignalLike<number | string>;
		markerWidth?: number | string | SignalLike<number | string>;
		mask?: string | SignalLike<string>;
		maskContentUnits?: number | string | SignalLike<number | string>;
		maskUnits?: number | string | SignalLike<number | string>;
		mathematical?: number | string | SignalLike<number | string>;
		mode?: number | string | SignalLike<number | string>;
		numOctaves?: number | string | SignalLike<number | string>;
		offset?: number | string | SignalLike<number | string>;
		opacity?: number | string | SignalLike<number | string>;
		operator?: number | string | SignalLike<number | string>;
		order?: number | string | SignalLike<number | string>;
		orient?: number | string | SignalLike<number | string>;
		orientation?: number | string | SignalLike<number | string>;
		origin?: number | string | SignalLike<number | string>;
		overflow?: number | string | SignalLike<number | string>;
		overlinePosition?: number | string | SignalLike<number | string>;
		overlineThickness?: number | string | SignalLike<number | string>;
		paintOrder?: number | string | SignalLike<number | string>;
		panose1?: number | string | SignalLike<number | string>;
		pathLength?: number | string | SignalLike<number | string>;
		patternContentUnits?: string | SignalLike<string>;
		patternTransform?: number | string | SignalLike<number | string>;
		patternUnits?: string | SignalLike<string>;
		pointerEvents?: number | string | SignalLike<number | string>;
		points?: string | SignalLike<string>;
		pointsAtX?: number | string | SignalLike<number | string>;
		pointsAtY?: number | string | SignalLike<number | string>;
		pointsAtZ?: number | string | SignalLike<number | string>;
		preserveAlpha?: number | string | SignalLike<number | string>;
		preserveAspectRatio?: string | SignalLike<string>;
		primitiveUnits?: number | string | SignalLike<number | string>;
		r?: number | string | SignalLike<number | string>;
		radius?: number | string | SignalLike<number | string>;
		refX?: number | string | SignalLike<number | string>;
		refY?: number | string | SignalLike<number | string>;
		renderingIntent?: number | string | SignalLike<number | string>;
		repeatCount?: number | string | SignalLike<number | string>;
		repeatDur?: number | string | SignalLike<number | string>;
		requiredExtensions?: number | string | SignalLike<number | string>;
		requiredFeatures?: number | string | SignalLike<number | string>;
		restart?: number | string | SignalLike<number | string>;
		result?: string | SignalLike<string>;
		rotate?: number | string | SignalLike<number | string>;
		rx?: number | string | SignalLike<number | string>;
		ry?: number | string | SignalLike<number | string>;
		scale?: number | string | SignalLike<number | string>;
		seed?: number | string | SignalLike<number | string>;
		shapeRendering?: number | string | SignalLike<number | string>;
		slope?: number | string | SignalLike<number | string>;
		spacing?: number | string | SignalLike<number | string>;
		specularConstant?: number | string | SignalLike<number | string>;
		specularExponent?: number | string | SignalLike<number | string>;
		speed?: number | string | SignalLike<number | string>;
		spreadMethod?: string | SignalLike<string>;
		startOffset?: number | string | SignalLike<number | string>;
		stdDeviation?: number | string | SignalLike<number | string>;
		stemh?: number | string | SignalLike<number | string>;
		stemv?: number | string | SignalLike<number | string>;
		stitchTiles?: number | string | SignalLike<number | string>;
		stopColor?: string | SignalLike<string>;
		stopOpacity?: number | string | SignalLike<number | string>;
		strikethroughPosition?: number | string | SignalLike<number | string>;
		strikethroughThickness?: number | string | SignalLike<number | string>;
		string?: number | string | SignalLike<number | string>;
		stroke?: string | SignalLike<string>;
		strokeDasharray?: string | number | SignalLike<number | string>;
		strokeDashoffset?: string | number | SignalLike<number | string>;
		strokeLinecap?:
			| 'butt'
			| 'round'
			| 'square'
			| 'inherit'
			| SignalLike<'butt' | 'round' | 'square' | 'inherit'>;
		strokeLinejoin?:
			| 'miter'
			| 'round'
			| 'bevel'
			| 'inherit'
			| SignalLike<'miter' | 'round' | 'bevel' | 'inherit'>;
		strokeMiterlimit?: string | number | SignalLike<number | string>;
		strokeOpacity?: number | string | SignalLike<number | string>;
		strokeWidth?: number | string | SignalLike<number | string>;
		surfaceScale?: number | string | SignalLike<number | string>;
		systemLanguage?: number | string | SignalLike<number | string>;
		tableValues?: number | string | SignalLike<number | string>;
		targetX?: number | string | SignalLike<number | string>;
		targetY?: number | string | SignalLike<number | string>;
		textAnchor?: string | SignalLike<string>;
		textDecoration?: number | string | SignalLike<number | string>;
		textLength?: number | string | SignalLike<number | string>;
		textRendering?: number | string | SignalLike<number | string>;
		to?: number | string | SignalLike<number | string>;
		transform?: string | SignalLike<string>;
		u1?: number | string | SignalLike<number | string>;
		u2?: number | string | SignalLike<number | string>;
		underlinePosition?: number | string | SignalLike<number | string>;
		underlineThickness?: number | string | SignalLike<number | string>;
		unicode?: number | string | SignalLike<number | string>;
		unicodeBidi?: number | string | SignalLike<number | string>;
		unicodeRange?: number | string | SignalLike<number | string>;
		unitsPerEm?: number | string | SignalLike<number | string>;
		vAlphabetic?: number | string | SignalLike<number | string>;
		values?: string | SignalLike<string>;
		vectorEffect?: number | string | SignalLike<number | string>;
		version?: string | SignalLike<string>;
		vertAdvY?: number | string | SignalLike<number | string>;
		vertOriginX?: number | string | SignalLike<number | string>;
		vertOriginY?: number | string | SignalLike<number | string>;
		vHanging?: number | string | SignalLike<number | string>;
		vIdeographic?: number | string | SignalLike<number | string>;
		viewBox?: string | SignalLike<string>;
		viewTarget?: number | string | SignalLike<number | string>;
		visibility?: number | string | SignalLike<number | string>;
		vMathematical?: number | string | SignalLike<number | string>;
		widths?: number | string | SignalLike<number | string>;
		wordSpacing?: number | string | SignalLike<number | string>;
		writingMode?: number | string | SignalLike<number | string>;
		x1?: number | string | SignalLike<number | string>;
		x2?: number | string | SignalLike<number | string>;
		x?: number | string | SignalLike<number | string>;
		xChannelSelector?: string | SignalLike<string>;
		xHeight?: number | string | SignalLike<number | string>;
		xlinkActuate?: string | SignalLike<string>;
		xlinkArcrole?: string | SignalLike<string>;
		xlinkHref?: string | SignalLike<string>;
		xlinkRole?: string | SignalLike<string>;
		xlinkShow?: string | SignalLike<string>;
		xlinkTitle?: string | SignalLike<string>;
		xlinkType?: string | SignalLike<string>;
		xmlBase?: string | SignalLike<string>;
		xmlLang?: string | SignalLike<string>;
		xmlns?: string | SignalLike<string>;
		xmlnsXlink?: string | SignalLike<string>;
		xmlSpace?: string | SignalLike<string>;
		y1?: number | string | SignalLike<number | string>;
		y2?: number | string | SignalLike<number | string>;
		y?: number | string | SignalLike<number | string>;
		yChannelSelector?: string | SignalLike<string>;
		z?: number | string | SignalLike<number | string>;
		zoomAndPan?: string | SignalLike<string>;
	}

	export interface PathAttributes {
		d: string;
	}

	export type TargetedEvent<
		Target extends EventTarget = EventTarget,
		TypedEvent extends Event = Event
	> = Omit<TypedEvent, 'currentTarget'> & {
		readonly currentTarget: Target;
	};

	export type TargetedAnimationEvent<Target extends EventTarget> =
		TargetedEvent<Target, AnimationEvent>;
	export type TargetedClipboardEvent<Target extends EventTarget> =
		TargetedEvent<Target, ClipboardEvent>;
	export type TargetedCompositionEvent<Target extends EventTarget> =
		TargetedEvent<Target, CompositionEvent>;
	export type TargetedDragEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		DragEvent
	>;
	export type TargetedFocusEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		FocusEvent
	>;
	export type TargetedKeyboardEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		KeyboardEvent
	>;
	export type TargetedMouseEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		MouseEvent
	>;
	export type TargetedPointerEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		PointerEvent
	>;
	export type TargetedTouchEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		TouchEvent
	>;
	export type TargetedTransitionEvent<Target extends EventTarget> =
		TargetedEvent<Target, TransitionEvent>;
	export type TargetedUIEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		UIEvent
	>;
	export type TargetedWheelEvent<Target extends EventTarget> = TargetedEvent<
		Target,
		WheelEvent
	>;

	export interface EventHandler<E extends TargetedEvent> {
		/**
		 * The `this` keyword always points to the DOM element the event handler
		 * was invoked on. See: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers#Event_handlers_parameters_this_binding_and_the_return_value
		 */
		(this: never, event: E): void;
	}

	export type AnimationEventHandler<Target extends EventTarget> = EventHandler<
		TargetedAnimationEvent<Target>
	>;
	export type ClipboardEventHandler<Target extends EventTarget> = EventHandler<
		TargetedClipboardEvent<Target>
	>;
	export type CompositionEventHandler<Target extends EventTarget> =
		EventHandler<TargetedCompositionEvent<Target>>;
	export type DragEventHandler<Target extends EventTarget> = EventHandler<
		TargetedDragEvent<Target>
	>;
	export type FocusEventHandler<Target extends EventTarget> = EventHandler<
		TargetedFocusEvent<Target>
	>;
	export type GenericEventHandler<Target extends EventTarget> = EventHandler<
		TargetedEvent<Target>
	>;
	export type KeyboardEventHandler<Target extends EventTarget> = EventHandler<
		TargetedKeyboardEvent<Target>
	>;
	export type MouseEventHandler<Target extends EventTarget> = EventHandler<
		TargetedMouseEvent<Target>
	>;
	export type PointerEventHandler<Target extends EventTarget> = EventHandler<
		TargetedPointerEvent<Target>
	>;
	export type TouchEventHandler<Target extends EventTarget> = EventHandler<
		TargetedTouchEvent<Target>
	>;
	export type TransitionEventHandler<Target extends EventTarget> = EventHandler<
		TargetedTransitionEvent<Target>
	>;
	export type UIEventHandler<Target extends EventTarget> = EventHandler<
		TargetedUIEvent<Target>
	>;
	export type WheelEventHandler<Target extends EventTarget> = EventHandler<
		TargetedWheelEvent<Target>
	>;

	export interface DOMAttributes<Target extends EventTarget>
		extends PreactDOMAttributes {
		// Image Events
		onLoad?: GenericEventHandler<Target>;
		onLoadCapture?: GenericEventHandler<Target>;
		onError?: GenericEventHandler<Target>;
		onErrorCapture?: GenericEventHandler<Target>;

		// Clipboard Events
		onCopy?: ClipboardEventHandler<Target>;
		onCopyCapture?: ClipboardEventHandler<Target>;
		onCut?: ClipboardEventHandler<Target>;
		onCutCapture?: ClipboardEventHandler<Target>;
		onPaste?: ClipboardEventHandler<Target>;
		onPasteCapture?: ClipboardEventHandler<Target>;

		// Composition Events
		onCompositionEnd?: CompositionEventHandler<Target>;
		onCompositionEndCapture?: CompositionEventHandler<Target>;
		onCompositionStart?: CompositionEventHandler<Target>;
		onCompositionStartCapture?: CompositionEventHandler<Target>;
		onCompositionUpdate?: CompositionEventHandler<Target>;
		onCompositionUpdateCapture?: CompositionEventHandler<Target>;

		// Details Events
		onToggle?: GenericEventHandler<Target>;

		// Focus Events
		onFocus?: FocusEventHandler<Target>;
		onFocusCapture?: FocusEventHandler<Target>;
		onfocusin?: FocusEventHandler<Target>;
		onfocusinCapture?: FocusEventHandler<Target>;
		onfocusout?: FocusEventHandler<Target>;
		onfocusoutCapture?: FocusEventHandler<Target>;
		onBlur?: FocusEventHandler<Target>;
		onBlurCapture?: FocusEventHandler<Target>;

		// Form Events
		onChange?: GenericEventHandler<Target>;
		onChangeCapture?: GenericEventHandler<Target>;
		onInput?: GenericEventHandler<Target>;
		onInputCapture?: GenericEventHandler<Target>;
		onBeforeInput?: GenericEventHandler<Target>;
		onBeforeInputCapture?: GenericEventHandler<Target>;
		onSearch?: GenericEventHandler<Target>;
		onSearchCapture?: GenericEventHandler<Target>;
		onSubmit?: GenericEventHandler<Target>;
		onSubmitCapture?: GenericEventHandler<Target>;
		onInvalid?: GenericEventHandler<Target>;
		onInvalidCapture?: GenericEventHandler<Target>;
		onReset?: GenericEventHandler<Target>;
		onResetCapture?: GenericEventHandler<Target>;
		onFormData?: GenericEventHandler<Target>;
		onFormDataCapture?: GenericEventHandler<Target>;

		// Keyboard Events
		onKeyDown?: KeyboardEventHandler<Target>;
		onKeyDownCapture?: KeyboardEventHandler<Target>;
		onKeyPress?: KeyboardEventHandler<Target>;
		onKeyPressCapture?: KeyboardEventHandler<Target>;
		onKeyUp?: KeyboardEventHandler<Target>;
		onKeyUpCapture?: KeyboardEventHandler<Target>;

		// Media Events
		onAbort?: GenericEventHandler<Target>;
		onAbortCapture?: GenericEventHandler<Target>;
		onCanPlay?: GenericEventHandler<Target>;
		onCanPlayCapture?: GenericEventHandler<Target>;
		onCanPlayThrough?: GenericEventHandler<Target>;
		onCanPlayThroughCapture?: GenericEventHandler<Target>;
		onDurationChange?: GenericEventHandler<Target>;
		onDurationChangeCapture?: GenericEventHandler<Target>;
		onEmptied?: GenericEventHandler<Target>;
		onEmptiedCapture?: GenericEventHandler<Target>;
		onEncrypted?: GenericEventHandler<Target>;
		onEncryptedCapture?: GenericEventHandler<Target>;
		onEnded?: GenericEventHandler<Target>;
		onEndedCapture?: GenericEventHandler<Target>;
		onLoadedData?: GenericEventHandler<Target>;
		onLoadedDataCapture?: GenericEventHandler<Target>;
		onLoadedMetadata?: GenericEventHandler<Target>;
		onLoadedMetadataCapture?: GenericEventHandler<Target>;
		onLoadStart?: GenericEventHandler<Target>;
		onLoadStartCapture?: GenericEventHandler<Target>;
		onPause?: GenericEventHandler<Target>;
		onPauseCapture?: GenericEventHandler<Target>;
		onPlay?: GenericEventHandler<Target>;
		onPlayCapture?: GenericEventHandler<Target>;
		onPlaying?: GenericEventHandler<Target>;
		onPlayingCapture?: GenericEventHandler<Target>;
		onProgress?: GenericEventHandler<Target>;
		onProgressCapture?: GenericEventHandler<Target>;
		onRateChange?: GenericEventHandler<Target>;
		onRateChangeCapture?: GenericEventHandler<Target>;
		onSeeked?: GenericEventHandler<Target>;
		onSeekedCapture?: GenericEventHandler<Target>;
		onSeeking?: GenericEventHandler<Target>;
		onSeekingCapture?: GenericEventHandler<Target>;
		onStalled?: GenericEventHandler<Target>;
		onStalledCapture?: GenericEventHandler<Target>;
		onSuspend?: GenericEventHandler<Target>;
		onSuspendCapture?: GenericEventHandler<Target>;
		onTimeUpdate?: GenericEventHandler<Target>;
		onTimeUpdateCapture?: GenericEventHandler<Target>;
		onVolumeChange?: GenericEventHandler<Target>;
		onVolumeChangeCapture?: GenericEventHandler<Target>;
		onWaiting?: GenericEventHandler<Target>;
		onWaitingCapture?: GenericEventHandler<Target>;

		// MouseEvents
		onClick?: MouseEventHandler<Target>;
		onClickCapture?: MouseEventHandler<Target>;
		onContextMenu?: MouseEventHandler<Target>;
		onContextMenuCapture?: MouseEventHandler<Target>;
		onDblClick?: MouseEventHandler<Target>;
		onDblClickCapture?: MouseEventHandler<Target>;
		onDrag?: DragEventHandler<Target>;
		onDragCapture?: DragEventHandler<Target>;
		onDragEnd?: DragEventHandler<Target>;
		onDragEndCapture?: DragEventHandler<Target>;
		onDragEnter?: DragEventHandler<Target>;
		onDragEnterCapture?: DragEventHandler<Target>;
		onDragExit?: DragEventHandler<Target>;
		onDragExitCapture?: DragEventHandler<Target>;
		onDragLeave?: DragEventHandler<Target>;
		onDragLeaveCapture?: DragEventHandler<Target>;
		onDragOver?: DragEventHandler<Target>;
		onDragOverCapture?: DragEventHandler<Target>;
		onDragStart?: DragEventHandler<Target>;
		onDragStartCapture?: DragEventHandler<Target>;
		onDrop?: DragEventHandler<Target>;
		onDropCapture?: DragEventHandler<Target>;
		onMouseDown?: MouseEventHandler<Target>;
		onMouseDownCapture?: MouseEventHandler<Target>;
		onMouseEnter?: MouseEventHandler<Target>;
		onMouseEnterCapture?: MouseEventHandler<Target>;
		onMouseLeave?: MouseEventHandler<Target>;
		onMouseLeaveCapture?: MouseEventHandler<Target>;
		onMouseMove?: MouseEventHandler<Target>;
		onMouseMoveCapture?: MouseEventHandler<Target>;
		onMouseOut?: MouseEventHandler<Target>;
		onMouseOutCapture?: MouseEventHandler<Target>;
		onMouseOver?: MouseEventHandler<Target>;
		onMouseOverCapture?: MouseEventHandler<Target>;
		onMouseUp?: MouseEventHandler<Target>;
		onMouseUpCapture?: MouseEventHandler<Target>;

		// Selection Events
		onSelect?: GenericEventHandler<Target>;
		onSelectCapture?: GenericEventHandler<Target>;

		// Touch Events
		onTouchCancel?: TouchEventHandler<Target>;
		onTouchCancelCapture?: TouchEventHandler<Target>;
		onTouchEnd?: TouchEventHandler<Target>;
		onTouchEndCapture?: TouchEventHandler<Target>;
		onTouchMove?: TouchEventHandler<Target>;
		onTouchMoveCapture?: TouchEventHandler<Target>;
		onTouchStart?: TouchEventHandler<Target>;
		onTouchStartCapture?: TouchEventHandler<Target>;

		// Pointer Events
		onPointerOver?: PointerEventHandler<Target>;
		onPointerOverCapture?: PointerEventHandler<Target>;
		onPointerEnter?: PointerEventHandler<Target>;
		onPointerEnterCapture?: PointerEventHandler<Target>;
		onPointerDown?: PointerEventHandler<Target>;
		onPointerDownCapture?: PointerEventHandler<Target>;
		onPointerMove?: PointerEventHandler<Target>;
		onPointerMoveCapture?: PointerEventHandler<Target>;
		onPointerUp?: PointerEventHandler<Target>;
		onPointerUpCapture?: PointerEventHandler<Target>;
		onPointerCancel?: PointerEventHandler<Target>;
		onPointerCancelCapture?: PointerEventHandler<Target>;
		onPointerOut?: PointerEventHandler<Target>;
		onPointerOutCapture?: PointerEventHandler<Target>;
		onPointerLeave?: PointerEventHandler<Target>;
		onPointerLeaveCapture?: PointerEventHandler<Target>;
		onGotPointerCapture?: PointerEventHandler<Target>;
		onGotPointerCaptureCapture?: PointerEventHandler<Target>;
		onLostPointerCapture?: PointerEventHandler<Target>;
		onLostPointerCaptureCapture?: PointerEventHandler<Target>;

		// UI Events
		onScroll?: UIEventHandler<Target>;
		onScrollCapture?: UIEventHandler<Target>;

		// Wheel Events
		onWheel?: WheelEventHandler<Target>;
		onWheelCapture?: WheelEventHandler<Target>;

		// Animation Events
		onAnimationStart?: AnimationEventHandler<Target>;
		onAnimationStartCapture?: AnimationEventHandler<Target>;
		onAnimationEnd?: AnimationEventHandler<Target>;
		onAnimationEndCapture?: AnimationEventHandler<Target>;
		onAnimationIteration?: AnimationEventHandler<Target>;
		onAnimationIterationCapture?: AnimationEventHandler<Target>;

		// Transition Events
		onTransitionEnd?: TransitionEventHandler<Target>;
		onTransitionEndCapture?: TransitionEventHandler<Target>;
	}

	export interface HTMLAttributes<RefType extends EventTarget = EventTarget>
		extends ClassAttributes<RefType>,
			DOMAttributes<RefType> {
		// Standard HTML Attributes
		accept?: string | SignalLike<string>;
		acceptCharset?: string | SignalLike<string>;
		accessKey?: string | SignalLike<string>;
		action?: string | SignalLike<string>;
		allow?: string | SignalLike<string>;
		allowFullScreen?: boolean | SignalLike<boolean>;
		allowTransparency?: boolean | SignalLike<boolean>;
		alt?: string | SignalLike<string>;
		as?: string | SignalLike<string>;
		async?: boolean | SignalLike<boolean>;
		autocomplete?: string | SignalLike<string>;
		autoComplete?: string | SignalLike<string>;
		autocorrect?: string | SignalLike<string>;
		autoCorrect?: string | SignalLike<string>;
		autofocus?: boolean | SignalLike<boolean>;
		autoFocus?: boolean | SignalLike<boolean>;
		autoPlay?: boolean | SignalLike<boolean>;
		capture?: boolean | string | SignalLike<string>;
		cellPadding?: number | string | SignalLike<string>;
		cellSpacing?: number | string | SignalLike<string>;
		charSet?: string | SignalLike<string>;
		challenge?: string | SignalLike<string>;
		checked?: boolean | SignalLike<boolean>;
		cite?: string | SignalLike<string>;
		class?: string | undefined | SignalLike<string | undefined>;
		className?: string | undefined | SignalLike<string | undefined>;
		cols?: number | SignalLike<number>;
		colSpan?: number | SignalLike<number>;
		content?: string | SignalLike<string>;
		contentEditable?: boolean | SignalLike<boolean>;
		contextMenu?: string | SignalLike<string>;
		controls?: boolean | SignalLike<boolean>;
		controlsList?: string | SignalLike<string>;
		coords?: string | SignalLike<string>;
		crossOrigin?: string | SignalLike<string>;
		data?: string | SignalLike<string>;
		dateTime?: string | SignalLike<string>;
		default?: boolean | SignalLike<boolean>;
		defaultChecked?: boolean | SignalLike<boolean>;
		defaultValue?: string | SignalLike<string>;
		defer?: boolean | SignalLike<boolean>;
		dir?: 'auto' | 'rtl' | 'ltr' | SignalLike<'auto' | 'rtl' | 'ltr'>;
		disabled?: boolean | SignalLike<boolean>;
		disableRemotePlayback?: boolean | SignalLike<boolean>;
		download?: any;
		decoding?:
			| 'sync'
			| 'async'
			| 'auto'
			| SignalLike<'sync' | 'async' | 'auto'>;
		draggable?: boolean | SignalLike<boolean>;
		encType?: string | SignalLike<string>;
		enterkeyhint?:
			| 'enter'
			| 'done'
			| 'go'
			| 'next'
			| 'previous'
			| 'search'
			| 'send'
			| SignalLike<
					'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
			  >;
		form?: string | SignalLike<string>;
		formAction?: string | SignalLike<string>;
		formEncType?: string | SignalLike<string>;
		formMethod?: string | SignalLike<string>;
		formNoValidate?: boolean | SignalLike<boolean>;
		formTarget?: string | SignalLike<string>;
		frameBorder?: number | string | SignalLike<number | string>;
		headers?: string | SignalLike<string>;
		height?: number | string | SignalLike<number | string>;
		hidden?: boolean | SignalLike<boolean>;
		high?: number | SignalLike<number>;
		href?: string | SignalLike<string>;
		hrefLang?: string | SignalLike<string>;
		for?: string | SignalLike<string>;
		htmlFor?: string | SignalLike<string>;
		httpEquiv?: string | SignalLike<string>;
		icon?: string | SignalLike<string>;
		id?: string | SignalLike<string>;
		inputMode?: string | SignalLike<string>;
		integrity?: string | SignalLike<string>;
		is?: string | SignalLike<string>;
		keyParams?: string | SignalLike<string>;
		keyType?: string | SignalLike<string>;
		kind?: string | SignalLike<string>;
		label?: string | SignalLike<string>;
		lang?: string | SignalLike<string>;
		list?: string | SignalLike<string>;
		loading?: 'eager' | 'lazy' | SignalLike<'eager' | 'lazy'>;
		loop?: boolean | SignalLike<boolean>;
		low?: number | SignalLike<number>;
		manifest?: string | SignalLike<string>;
		marginHeight?: number | SignalLike<number>;
		marginWidth?: number | SignalLike<number>;
		max?: number | string | SignalLike<string>;
		maxLength?: number | SignalLike<number>;
		media?: string | SignalLike<string>;
		mediaGroup?: string | SignalLike<string>;
		method?: string | SignalLike<string>;
		min?: number | string | SignalLike<string>;
		minLength?: number | SignalLike<number>;
		multiple?: boolean | SignalLike<boolean>;
		muted?: boolean | SignalLike<boolean>;
		name?: string | SignalLike<string>;
		nomodule?: boolean | SignalLike<boolean>;
		nonce?: string | SignalLike<string>;
		noValidate?: boolean | SignalLike<boolean>;
		open?: boolean | SignalLike<boolean>;
		optimum?: number | SignalLike<number>;
		part?: string | SignalLike<string>;
		pattern?: string | SignalLike<string>;
		ping?: string | SignalLike<string>;
		placeholder?: string | SignalLike<string>;
		playsInline?: boolean | SignalLike<boolean>;
		poster?: string | SignalLike<string>;
		preload?: string | SignalLike<string>;
		radioGroup?: string | SignalLike<string>;
		readonly?: boolean | SignalLike<boolean>;
		readOnly?: boolean | SignalLike<boolean>;
		referrerpolicy?:
			| 'no-referrer'
			| 'no-referrer-when-downgrade'
			| 'origin'
			| 'origin-when-cross-origin'
			| 'same-origin'
			| 'strict-origin'
			| 'strict-origin-when-cross-origin'
			| 'unsafe-url'
			| SignalLike<
					| 'no-referrer'
					| 'no-referrer-when-downgrade'
					| 'origin'
					| 'origin-when-cross-origin'
					| 'same-origin'
					| 'strict-origin'
					| 'strict-origin-when-cross-origin'
					| 'unsafe-url'
			  >;
		rel?: string | SignalLike<string>;
		required?: boolean | SignalLike<boolean>;
		reversed?: boolean | SignalLike<boolean>;
		role?: string | SignalLike<string>;
		rows?: number | SignalLike<number>;
		rowSpan?: number | SignalLike<number>;
		sandbox?: string | SignalLike<string>;
		scope?: string | SignalLike<string>;
		scoped?: boolean | SignalLike<boolean>;
		scrolling?: string | SignalLike<string>;
		seamless?: boolean | SignalLike<boolean>;
		selected?: boolean | SignalLike<boolean>;
		shape?: string | SignalLike<string>;
		size?: number | SignalLike<number>;
		sizes?: string | SignalLike<string>;
		slot?: string | SignalLike<string>;
		span?: number | SignalLike<number>;
		spellcheck?: boolean | SignalLike<boolean>;
		spellCheck?: boolean | SignalLike<boolean>;
		src?: string | SignalLike<string>;
		srcset?: string | SignalLike<string>;
		srcDoc?: string | SignalLike<string>;
		srcLang?: string | SignalLike<string>;
		srcSet?: string | SignalLike<string>;
		start?: number | SignalLike<number>;
		step?: number | string | SignalLike<number | string>;
		style?: string | CSSProperties | SignalLike<string | CSSProperties>;
		summary?: string | SignalLike<string>;
		tabIndex?: number | SignalLike<number>;
		target?: string | SignalLike<string>;
		title?: string | SignalLike<string>;
		type?: string | SignalLike<string>;
		useMap?: string | SignalLike<string>;
		value?: string | string[] | number | SignalLike<string | string[] | number>;
		volume?: string | number | SignalLike<string | number>;
		width?: number | string | SignalLike<number | string>;
		wmode?: string | SignalLike<string>;
		wrap?: string | SignalLike<string>;

		// Non-standard Attributes
		autocapitalize?:
			| 'off'
			| 'none'
			| 'on'
			| 'sentences'
			| 'words'
			| 'characters'
			| SignalLike<
					'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
			  >;
		autoCapitalize?:
			| 'off'
			| 'none'
			| 'on'
			| 'sentences'
			| 'words'
			| 'characters'
			| SignalLike<
					'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'
			  >;
		disablePictureInPicture?: boolean | SignalLike<boolean>;
		results?: number | SignalLike<number>;
		translate?: 'yes' | 'no' | SignalLike<'yes' | 'no'>;

		// RDFa Attributes
		about?: string | SignalLike<string>;
		datatype?: string | SignalLike<string>;
		inlist?: any;
		prefix?: string | SignalLike<string>;
		property?: string | SignalLike<string>;
		resource?: string | SignalLike<string>;
		typeof?: string | SignalLike<string>;
		vocab?: string | SignalLike<string>;

		// Microdata Attributes
		itemProp?: string | SignalLike<string>;
		itemScope?: boolean | SignalLike<boolean>;
		itemType?: string | SignalLike<string>;
		itemID?: string | SignalLike<string>;
		itemRef?: string | SignalLike<string>;
	}

	export type DetailedHTMLProps<
		HA extends HTMLAttributes<RefType>,
		RefType extends EventTarget = EventTarget
	> = HA;

	export interface HTMLMarqueeElement extends HTMLElement {
		behavior?:
			| 'scroll'
			| 'slide'
			| 'alternate'
			| SignalLike<'scroll' | 'slide' | 'alternate'>;
		bgColor?: string | SignalLike<string>;
		direction?:
			| 'left'
			| 'right'
			| 'up'
			| 'down'
			| SignalLike<'left' | 'right' | 'up' | 'down'>;
		height?: number | string | SignalLike<number | string>;
		hspace?: number | string | SignalLike<number | string>;
		loop?: number | string | SignalLike<number | string>;
		scrollAmount?: number | string | SignalLike<number | string>;
		scrollDelay?: number | string | SignalLike<number | string>;
		trueSpeed?: boolean | SignalLike<boolean>;
		vspace?: number | string | SignalLike<number | string>;
		width?: number | string | SignalLike<number | string>;
	}

	export interface IntrinsicElements {
		// HTML
		a: HTMLAttributes<HTMLAnchorElement>;
		abbr: HTMLAttributes<HTMLElement>;
		address: HTMLAttributes<HTMLElement>;
		area: HTMLAttributes<HTMLAreaElement>;
		article: HTMLAttributes<HTMLElement>;
		aside: HTMLAttributes<HTMLElement>;
		audio: HTMLAttributes<HTMLAudioElement>;
		b: HTMLAttributes<HTMLElement>;
		base: HTMLAttributes<HTMLBaseElement>;
		bdi: HTMLAttributes<HTMLElement>;
		bdo: HTMLAttributes<HTMLElement>;
		big: HTMLAttributes<HTMLElement>;
		blockquote: HTMLAttributes<HTMLQuoteElement>;
		body: HTMLAttributes<HTMLBodyElement>;
		br: HTMLAttributes<HTMLBRElement>;
		button: HTMLAttributes<HTMLButtonElement>;
		canvas: HTMLAttributes<HTMLCanvasElement>;
		caption: HTMLAttributes<HTMLTableCaptionElement>;
		cite: HTMLAttributes<HTMLElement>;
		code: HTMLAttributes<HTMLElement>;
		col: HTMLAttributes<HTMLTableColElement>;
		colgroup: HTMLAttributes<HTMLTableColElement>;
		data: HTMLAttributes<HTMLDataElement>;
		datalist: HTMLAttributes<HTMLDataListElement>;
		dd: HTMLAttributes<HTMLElement>;
		del: HTMLAttributes<HTMLModElement>;
		details: HTMLAttributes<HTMLDetailsElement>;
		dfn: HTMLAttributes<HTMLElement>;
		dialog: HTMLAttributes<HTMLDialogElement>;
		div: HTMLAttributes<HTMLDivElement>;
		dl: HTMLAttributes<HTMLDListElement>;
		dt: HTMLAttributes<HTMLElement>;
		em: HTMLAttributes<HTMLElement>;
		embed: HTMLAttributes<HTMLEmbedElement>;
		fieldset: HTMLAttributes<HTMLFieldSetElement>;
		figcaption: HTMLAttributes<HTMLElement>;
		figure: HTMLAttributes<HTMLElement>;
		footer: HTMLAttributes<HTMLElement>;
		form: HTMLAttributes<HTMLFormElement>;
		h1: HTMLAttributes<HTMLHeadingElement>;
		h2: HTMLAttributes<HTMLHeadingElement>;
		h3: HTMLAttributes<HTMLHeadingElement>;
		h4: HTMLAttributes<HTMLHeadingElement>;
		h5: HTMLAttributes<HTMLHeadingElement>;
		h6: HTMLAttributes<HTMLHeadingElement>;
		head: HTMLAttributes<HTMLHeadElement>;
		header: HTMLAttributes<HTMLElement>;
		hgroup: HTMLAttributes<HTMLElement>;
		hr: HTMLAttributes<HTMLHRElement>;
		html: HTMLAttributes<HTMLHtmlElement>;
		i: HTMLAttributes<HTMLElement>;
		iframe: HTMLAttributes<HTMLIFrameElement>;
		img: HTMLAttributes<HTMLImageElement>;
		input: HTMLAttributes<HTMLInputElement> & { defaultValue?: string };
		ins: HTMLAttributes<HTMLModElement>;
		kbd: HTMLAttributes<HTMLElement>;
		keygen: HTMLAttributes<HTMLUnknownElement>;
		label: HTMLAttributes<HTMLLabelElement>;
		legend: HTMLAttributes<HTMLLegendElement>;
		li: HTMLAttributes<HTMLLIElement>;
		link: HTMLAttributes<HTMLLinkElement>;
		main: HTMLAttributes<HTMLElement>;
		map: HTMLAttributes<HTMLMapElement>;
		mark: HTMLAttributes<HTMLElement>;
		marquee: HTMLAttributes<HTMLMarqueeElement>;
		menu: HTMLAttributes<HTMLMenuElement>;
		menuitem: HTMLAttributes<HTMLUnknownElement>;
		meta: HTMLAttributes<HTMLMetaElement>;
		meter: HTMLAttributes<HTMLMeterElement>;
		nav: HTMLAttributes<HTMLElement>;
		noscript: HTMLAttributes<HTMLElement>;
		object: HTMLAttributes<HTMLObjectElement>;
		ol: HTMLAttributes<HTMLOListElement>;
		optgroup: HTMLAttributes<HTMLOptGroupElement>;
		option: HTMLAttributes<HTMLOptionElement>;
		output: HTMLAttributes<HTMLOutputElement>;
		p: HTMLAttributes<HTMLParagraphElement>;
		param: HTMLAttributes<HTMLParamElement>;
		picture: HTMLAttributes<HTMLPictureElement>;
		pre: HTMLAttributes<HTMLPreElement>;
		progress: HTMLAttributes<HTMLProgressElement>;
		q: HTMLAttributes<HTMLQuoteElement>;
		rp: HTMLAttributes<HTMLElement>;
		rt: HTMLAttributes<HTMLElement>;
		ruby: HTMLAttributes<HTMLElement>;
		s: HTMLAttributes<HTMLElement>;
		samp: HTMLAttributes<HTMLElement>;
		script: HTMLAttributes<HTMLScriptElement>;
		section: HTMLAttributes<HTMLElement>;
		select: HTMLAttributes<HTMLSelectElement>;
		slot: HTMLAttributes<HTMLSlotElement>;
		small: HTMLAttributes<HTMLElement>;
		source: HTMLAttributes<HTMLSourceElement>;
		span: HTMLAttributes<HTMLSpanElement>;
		strong: HTMLAttributes<HTMLElement>;
		style: HTMLAttributes<HTMLStyleElement>;
		sub: HTMLAttributes<HTMLElement>;
		summary: HTMLAttributes<HTMLElement>;
		sup: HTMLAttributes<HTMLElement>;
		table: HTMLAttributes<HTMLTableElement>;
		tbody: HTMLAttributes<HTMLTableSectionElement>;
		td: HTMLAttributes<HTMLTableCellElement>;
		textarea: HTMLAttributes<HTMLTextAreaElement>;
		tfoot: HTMLAttributes<HTMLTableSectionElement>;
		th: HTMLAttributes<HTMLTableCellElement>;
		thead: HTMLAttributes<HTMLTableSectionElement>;
		time: HTMLAttributes<HTMLTimeElement>;
		title: HTMLAttributes<HTMLTitleElement>;
		tr: HTMLAttributes<HTMLTableRowElement>;
		track: HTMLAttributes<HTMLTrackElement>;
		u: HTMLAttributes<HTMLElement>;
		ul: HTMLAttributes<HTMLUListElement>;
		var: HTMLAttributes<HTMLElement>;
		video: HTMLAttributes<HTMLVideoElement>;
		wbr: HTMLAttributes<HTMLElement>;

		//SVG
		svg: SVGAttributes<SVGSVGElement>;
		animate: SVGAttributes<SVGAnimateElement>;
		circle: SVGAttributes<SVGCircleElement>;
		animateTransform: SVGAttributes<SVGAnimateElement>;
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
		feSpecularLighting: SVGAttributes<SVGFESpecularLightingElement>;
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
		path: SVGAttributes<SVGPathElement>;
		pattern: SVGAttributes<SVGPatternElement>;
		polygon: SVGAttributes<SVGPolygonElement>;
		polyline: SVGAttributes<SVGPolylineElement>;
		radialGradient: SVGAttributes<SVGRadialGradientElement>;
		rect: SVGAttributes<SVGRectElement>;
		stop: SVGAttributes<SVGStopElement>;
		symbol: SVGAttributes<SVGSymbolElement>;
		text: SVGAttributes<SVGTextElement>;
		textPath: SVGAttributes<SVGTextPathElement>;
		tspan: SVGAttributes<SVGTSpanElement>;
		use: SVGAttributes<SVGUseElement>;
	}
}
