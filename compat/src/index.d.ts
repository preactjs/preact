import * as _hooks from '../../hooks';
import * as preact from '../../src';
import { JSXInternal } from '../../src/jsx';
import * as _Suspense from './suspense';
import * as _SuspenseList from './suspense-list';

// export default React;
export = React;
export as namespace React;
declare namespace React {
	// Export JSX
	export import JSX = JSXInternal;

	// Hooks
	export import CreateHandle = _hooks.CreateHandle;
	export import EffectCallback = _hooks.EffectCallback;
	export import Inputs = _hooks.Inputs;
	export import PropRef = _hooks.PropRef;
	export import Reducer = _hooks.Reducer;
	export import Dispatch = _hooks.Dispatch;
	export import Ref = _hooks.Ref;
	export import StateUpdater = _hooks.StateUpdater;
	export import useCallback = _hooks.useCallback;
	export import useContext = _hooks.useContext;
	export import useDebugValue = _hooks.useDebugValue;
	export import useEffect = _hooks.useEffect;
	export import useImperativeHandle = _hooks.useImperativeHandle;
	export import useId = _hooks.useId;
	export import useLayoutEffect = _hooks.useLayoutEffect;
	export import useMemo = _hooks.useMemo;
	export import useReducer = _hooks.useReducer;
	export import useRef = _hooks.useRef;
	export import useState = _hooks.useState;
	// React 18 hooks
	export import useInsertionEffect = _hooks.useLayoutEffect;
	export function useTransition(): [false, typeof startTransition];
	export function useDeferredValue<T = any>(val: T): T;
	export function useSyncExternalStore<T>(
		subscribe: (flush: () => void) => () => void,
		getSnapshot: () => T
	): T;

	// Preact Defaults
	export import Context = preact.Context;
	export import ContextType = preact.ContextType;
	export import RefObject = preact.RefObject;
	export import Component = preact.Component;
	export import FunctionComponent = preact.FunctionComponent;
	export import FC = preact.FunctionComponent;
	export import createContext = preact.createContext;
	export import createRef = preact.createRef;
	export import Fragment = preact.Fragment;
	export import createElement = preact.createElement;
	export import cloneElement = preact.cloneElement;
	export import ComponentProps = preact.ComponentProps;
	export import ReactNode = preact.ComponentChild;

	// Suspense
	export import Suspense = _Suspense.Suspense;
	export import lazy = _Suspense.lazy;
	export import SuspenseList = _SuspenseList.SuspenseList;

	// Compat
	export import StrictMode = preact.Fragment;
	export const version: string;
	export function startTransition(cb: () => void): void;

	// HTML
	export interface HTMLAttributes<T extends EventTarget>
		extends JSXInternal.HTMLAttributes<T> {}

	export import DetailedHTMLProps = JSXInternal.DetailedHTMLProps;
	export import CSSProperties = JSXInternal.CSSProperties;

	export interface SVGProps<T extends EventTarget>
		extends JSXInternal.SVGAttributes<T>,
			preact.ClassAttributes<T> {}

	type HTMLAttributeReferrerPolicy =
		| ''
		| 'no-referrer'
		| 'no-referrer-when-downgrade'
		| 'origin'
		| 'origin-when-cross-origin'
		| 'same-origin'
		| 'strict-origin'
		| 'strict-origin-when-cross-origin'
		| 'unsafe-url';

	type HTMLAttributeAnchorTarget =
		| '_self'
		| '_blank'
		| '_parent'
		| '_top'
		| (string & {});

	interface AnchorHTMLAttributes<T> extends HTMLAttributes<T> {
		download?: any;
		href?: string | undefined;
		hrefLang?: string | undefined;
		media?: string | undefined;
		ping?: string | undefined;
		target?: HTMLAttributeAnchorTarget | undefined;
		type?: string | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
	}

	interface AudioHTMLAttributes<T> extends MediaHTMLAttributes<T> {}

	interface AreaHTMLAttributes<T> extends HTMLAttributes<T> {
		alt?: string | undefined;
		coords?: string | undefined;
		download?: any;
		href?: string | undefined;
		hrefLang?: string | undefined;
		media?: string | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
		shape?: string | undefined;
		target?: string | undefined;
	}

	interface BaseHTMLAttributes<T> extends HTMLAttributes<T> {
		href?: string | undefined;
		target?: string | undefined;
	}

	interface BlockquoteHTMLAttributes<T> extends HTMLAttributes<T> {
		cite?: string | undefined;
	}

	interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
		disabled?: boolean | undefined;
		form?: string | undefined;
		formAction?: string | undefined;
		formEncType?: string | undefined;
		formMethod?: string | undefined;
		formNoValidate?: boolean | undefined;
		formTarget?: string | undefined;
		name?: string | undefined;
		type?: 'submit' | 'reset' | 'button' | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface CanvasHTMLAttributes<T> extends HTMLAttributes<T> {
		height?: number | string | undefined;
		width?: number | string | undefined;
	}

	interface ColHTMLAttributes<T> extends HTMLAttributes<T> {
		span?: number | undefined;
		width?: number | string | undefined;
	}

	interface ColgroupHTMLAttributes<T> extends HTMLAttributes<T> {
		span?: number | undefined;
	}

	interface DataHTMLAttributes<T> extends HTMLAttributes<T> {
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface DetailsHTMLAttributes<T> extends HTMLAttributes<T> {
		open?: boolean | undefined;
		onToggle?: ReactEventHandler<T> | undefined;
	}

	interface DelHTMLAttributes<T> extends HTMLAttributes<T> {
		cite?: string | undefined;
		dateTime?: string | undefined;
	}

	interface DialogHTMLAttributes<T> extends HTMLAttributes<T> {
		onCancel?: ReactEventHandler<T> | undefined;
		onClose?: ReactEventHandler<T> | undefined;
		open?: boolean | undefined;
	}

	interface EmbedHTMLAttributes<T> extends HTMLAttributes<T> {
		height?: number | string | undefined;
		src?: string | undefined;
		type?: string | undefined;
		width?: number | string | undefined;
	}

	interface FieldsetHTMLAttributes<T> extends HTMLAttributes<T> {
		disabled?: boolean | undefined;
		form?: string | undefined;
		name?: string | undefined;
	}

	interface FormHTMLAttributes<T> extends HTMLAttributes<T> {
		acceptCharset?: string | undefined;
		action?: string | undefined;
		autoComplete?: string | undefined;
		encType?: string | undefined;
		method?: string | undefined;
		name?: string | undefined;
		noValidate?: boolean | undefined;
		target?: string | undefined;
	}

	interface HtmlHTMLAttributes<T> extends HTMLAttributes<T> {
		manifest?: string | undefined;
	}

	interface IframeHTMLAttributes<T> extends HTMLAttributes<T> {
		allow?: string | undefined;
		allowFullScreen?: boolean | undefined;
		allowTransparency?: boolean | undefined;
		/** @deprecated */
		frameBorder?: number | string | undefined;
		height?: number | string | undefined;
		loading?: 'eager' | 'lazy' | undefined;
		/** @deprecated */
		marginHeight?: number | undefined;
		/** @deprecated */
		marginWidth?: number | undefined;
		name?: string | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
		sandbox?: string | undefined;
		/** @deprecated */
		scrolling?: string | undefined;
		seamless?: boolean | undefined;
		src?: string | undefined;
		srcDoc?: string | undefined;
		width?: number | string | undefined;
	}

	interface ImgHTMLAttributes<T> extends HTMLAttributes<T> {
		alt?: string | undefined;
		crossOrigin?: CrossOrigin;
		decoding?: 'async' | 'auto' | 'sync' | undefined;
		height?: number | string | undefined;
		loading?: 'eager' | 'lazy' | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
		sizes?: string | undefined;
		src?: string | undefined;
		srcSet?: string | undefined;
		useMap?: string | undefined;
		width?: number | string | undefined;
	}

	interface InsHTMLAttributes<T> extends HTMLAttributes<T> {
		cite?: string | undefined;
		dateTime?: string | undefined;
	}

	type HTMLInputTypeAttribute =
		| 'button'
		| 'checkbox'
		| 'color'
		| 'date'
		| 'datetime-local'
		| 'email'
		| 'file'
		| 'hidden'
		| 'image'
		| 'month'
		| 'number'
		| 'password'
		| 'radio'
		| 'range'
		| 'reset'
		| 'search'
		| 'submit'
		| 'tel'
		| 'text'
		| 'time'
		| 'url'
		| 'week'
		| (string & {});

	interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
		accept?: string | undefined;
		alt?: string | undefined;
		autoComplete?: string | undefined;
		capture?: boolean | 'user' | 'environment' | undefined; // https://www.w3.org/TR/html-media-capture/#the-capture-attribute
		checked?: boolean | undefined;
		disabled?: boolean | undefined;
		enterKeyHint?:
			| 'enter'
			| 'done'
			| 'go'
			| 'next'
			| 'previous'
			| 'search'
			| 'send'
			| undefined;
		form?: string | undefined;
		formAction?: string | undefined;
		formEncType?: string | undefined;
		formMethod?: string | undefined;
		formNoValidate?: boolean | undefined;
		formTarget?: string | undefined;
		height?: number | string | undefined;
		list?: string | undefined;
		max?: number | string | undefined;
		maxLength?: number | undefined;
		min?: number | string | undefined;
		minLength?: number | undefined;
		multiple?: boolean | undefined;
		name?: string | undefined;
		pattern?: string | undefined;
		placeholder?: string | undefined;
		readOnly?: boolean | undefined;
		required?: boolean | undefined;
		size?: number | undefined;
		src?: string | undefined;
		step?: number | string | undefined;
		type?: HTMLInputTypeAttribute | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
		width?: number | string | undefined;

		onChange?: ChangeEventHandler<T> | undefined;
	}

	interface KeygenHTMLAttributes<T> extends HTMLAttributes<T> {
		challenge?: string | undefined;
		disabled?: boolean | undefined;
		form?: string | undefined;
		keyType?: string | undefined;
		keyParams?: string | undefined;
		name?: string | undefined;
	}

	interface LabelHTMLAttributes<T> extends HTMLAttributes<T> {
		form?: string | undefined;
		htmlFor?: string | undefined;
	}

	interface LiHTMLAttributes<T> extends HTMLAttributes<T> {
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface LinkHTMLAttributes<T> extends HTMLAttributes<T> {
		as?: string | undefined;
		crossOrigin?: CrossOrigin;
		fetchPriority?: 'high' | 'low' | 'auto';
		href?: string | undefined;
		hrefLang?: string | undefined;
		integrity?: string | undefined;
		media?: string | undefined;
		imageSrcSet?: string | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
		sizes?: string | undefined;
		type?: string | undefined;
		charSet?: string | undefined;
	}

	interface MapHTMLAttributes<T> extends HTMLAttributes<T> {
		name?: string | undefined;
	}

	interface MenuHTMLAttributes<T> extends HTMLAttributes<T> {
		type?: string | undefined;
	}

	interface MediaHTMLAttributes<T> extends HTMLAttributes<T> {
		autoPlay?: boolean | undefined;
		controls?: boolean | undefined;
		controlsList?: string | undefined;
		crossOrigin?: CrossOrigin;
		loop?: boolean | undefined;
		mediaGroup?: string | undefined;
		muted?: boolean | undefined;
		playsInline?: boolean | undefined;
		preload?: string | undefined;
		src?: string | undefined;
	}

	interface MetaHTMLAttributes<T> extends HTMLAttributes<T> {
		charSet?: string | undefined;
		httpEquiv?: string | undefined;
		name?: string | undefined;
		media?: string | undefined;
	}

	interface MeterHTMLAttributes<T> extends HTMLAttributes<T> {
		form?: string | undefined;
		high?: number | undefined;
		low?: number | undefined;
		max?: number | string | undefined;
		min?: number | string | undefined;
		optimum?: number | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface QuoteHTMLAttributes<T> extends HTMLAttributes<T> {
		cite?: string | undefined;
	}

	interface ObjectHTMLAttributes<T> extends HTMLAttributes<T> {
		classID?: string | undefined;
		data?: string | undefined;
		form?: string | undefined;
		height?: number | string | undefined;
		name?: string | undefined;
		type?: string | undefined;
		useMap?: string | undefined;
		width?: number | string | undefined;
		wmode?: string | undefined;
	}

	interface OlHTMLAttributes<T> extends HTMLAttributes<T> {
		reversed?: boolean | undefined;
		start?: number | undefined;
		type?: '1' | 'a' | 'A' | 'i' | 'I' | undefined;
	}

	interface OptgroupHTMLAttributes<T> extends HTMLAttributes<T> {
		disabled?: boolean | undefined;
		label?: string | undefined;
	}

	interface OptionHTMLAttributes<T> extends HTMLAttributes<T> {
		disabled?: boolean | undefined;
		label?: string | undefined;
		selected?: boolean | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface OutputHTMLAttributes<T> extends HTMLAttributes<T> {
		form?: string | undefined;
		htmlFor?: string | undefined;
		name?: string | undefined;
	}

	interface ParamHTMLAttributes<T> extends HTMLAttributes<T> {
		name?: string | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface ProgressHTMLAttributes<T> extends HTMLAttributes<T> {
		max?: number | string | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
	}

	interface SlotHTMLAttributes<T> extends HTMLAttributes<T> {
		name?: string | undefined;
	}

	interface ScriptHTMLAttributes<T> extends HTMLAttributes<T> {
		async?: boolean | undefined;
		/** @deprecated */
		charSet?: string | undefined;
		crossOrigin?: CrossOrigin;
		defer?: boolean | undefined;
		integrity?: string | undefined;
		noModule?: boolean | undefined;
		referrerPolicy?: HTMLAttributeReferrerPolicy | undefined;
		src?: string | undefined;
		type?: string | undefined;
	}

	interface SelectHTMLAttributes<T> extends HTMLAttributes<T> {
		autoComplete?: string | undefined;
		disabled?: boolean | undefined;
		form?: string | undefined;
		multiple?: boolean | undefined;
		name?: string | undefined;
		required?: boolean | undefined;
		size?: number | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
		onChange?: ChangeEventHandler<T> | undefined;
	}

	interface SourceHTMLAttributes<T> extends HTMLAttributes<T> {
		height?: number | string | undefined;
		media?: string | undefined;
		sizes?: string | undefined;
		src?: string | undefined;
		srcSet?: string | undefined;
		type?: string | undefined;
		width?: number | string | undefined;
	}

	interface StyleHTMLAttributes<T> extends HTMLAttributes<T> {
		media?: string | undefined;
		scoped?: boolean | undefined;
		type?: string | undefined;
	}

	interface TableHTMLAttributes<T> extends HTMLAttributes<T> {
		cellPadding?: number | string | undefined;
		cellSpacing?: number | string | undefined;
		summary?: string | undefined;
		width?: number | string | undefined;
	}

	interface TextareaHTMLAttributes<T> extends HTMLAttributes<T> {
		autoComplete?: string | undefined;
		cols?: number | undefined;
		dirName?: string | undefined;
		disabled?: boolean | undefined;
		form?: string | undefined;
		maxLength?: number | undefined;
		minLength?: number | undefined;
		name?: string | undefined;
		placeholder?: string | undefined;
		readOnly?: boolean | undefined;
		required?: boolean | undefined;
		rows?: number | undefined;
		value?: string | ReadonlyArray<string> | number | undefined;
		wrap?: string | undefined;

		onChange?: ChangeEventHandler<T> | undefined;
	}

	interface TdHTMLAttributes<T> extends HTMLAttributes<T> {
		align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
		colSpan?: number | undefined;
		headers?: string | undefined;
		rowSpan?: number | undefined;
		scope?: string | undefined;
		abbr?: string | undefined;
		height?: number | string | undefined;
		width?: number | string | undefined;
		valign?: 'top' | 'middle' | 'bottom' | 'baseline' | undefined;
	}

	interface ThHTMLAttributes<T> extends HTMLAttributes<T> {
		align?: 'left' | 'center' | 'right' | 'justify' | 'char' | undefined;
		colSpan?: number | undefined;
		headers?: string | undefined;
		rowSpan?: number | undefined;
		scope?: string | undefined;
		abbr?: string | undefined;
	}

	interface TimeHTMLAttributes<T> extends HTMLAttributes<T> {
		dateTime?: string | undefined;
	}

	interface TrackHTMLAttributes<T> extends HTMLAttributes<T> {
		default?: boolean | undefined;
		kind?: string | undefined;
		label?: string | undefined;
		src?: string | undefined;
		srcLang?: string | undefined;
	}

	interface VideoHTMLAttributes<T> extends MediaHTMLAttributes<T> {
		height?: number | string | undefined;
		playsInline?: boolean | undefined;
		poster?: string | undefined;
		width?: number | string | undefined;
		disablePictureInPicture?: boolean | undefined;
		disableRemotePlayback?: boolean | undefined;
	}

	// this list is "complete" in that it contains every SVG attribute
	// that React supports, but the types can be improved.
	// Full list here: https://facebook.github.io/react/docs/dom-elements.html
	//
	// The three broad type categories are (in order of restrictiveness):
	//   - "number | string"
	//   - "string"
	//   - union of string literals
	interface SVGAttributes<T> extends AriaAttributes, DOMAttributes<T> {
		// Attributes which also defined in HTMLAttributes
		// See comment in SVGDOMPropertyConfig.js
		className?: string | undefined;
		color?: string | undefined;
		height?: number | string | undefined;
		id?: string | undefined;
		lang?: string | undefined;
		max?: number | string | undefined;
		media?: string | undefined;
		method?: string | undefined;
		min?: number | string | undefined;
		name?: string | undefined;
		style?: CSSProperties | undefined;
		target?: string | undefined;
		type?: string | undefined;
		width?: number | string | undefined;

		// Other HTML properties supported by SVG elements in browsers
		role?: AriaRole | undefined;
		tabIndex?: number | undefined;
		crossOrigin?: CrossOrigin;

		// SVG Specific attributes
		accentHeight?: number | string | undefined;
		accumulate?: 'none' | 'sum' | undefined;
		additive?: 'replace' | 'sum' | undefined;
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
			| undefined;
		allowReorder?: 'no' | 'yes' | undefined;
		alphabetic?: number | string | undefined;
		amplitude?: number | string | undefined;
		arabicForm?: 'initial' | 'medial' | 'terminal' | 'isolated' | undefined;
		ascent?: number | string | undefined;
		attributeName?: string | undefined;
		attributeType?: string | undefined;
		autoReverse?: Booleanish | undefined;
		azimuth?: number | string | undefined;
		baseFrequency?: number | string | undefined;
		baselineShift?: number | string | undefined;
		baseProfile?: number | string | undefined;
		bbox?: number | string | undefined;
		begin?: number | string | undefined;
		bias?: number | string | undefined;
		by?: number | string | undefined;
		calcMode?: number | string | undefined;
		capHeight?: number | string | undefined;
		clip?: number | string | undefined;
		clipPath?: string | undefined;
		clipPathUnits?: number | string | undefined;
		clipRule?: number | string | undefined;
		colorInterpolation?: number | string | undefined;
		colorInterpolationFilters?:
			| 'auto'
			| 'sRGB'
			| 'linearRGB'
			| 'inherit'
			| undefined;
		colorProfile?: number | string | undefined;
		colorRendering?: number | string | undefined;
		contentScriptType?: number | string | undefined;
		contentStyleType?: number | string | undefined;
		cursor?: number | string | undefined;
		cx?: number | string | undefined;
		cy?: number | string | undefined;
		d?: string | undefined;
		decelerate?: number | string | undefined;
		descent?: number | string | undefined;
		diffuseConstant?: number | string | undefined;
		direction?: number | string | undefined;
		display?: number | string | undefined;
		divisor?: number | string | undefined;
		dominantBaseline?: number | string | undefined;
		dur?: number | string | undefined;
		dx?: number | string | undefined;
		dy?: number | string | undefined;
		edgeMode?: number | string | undefined;
		elevation?: number | string | undefined;
		enableBackground?: number | string | undefined;
		end?: number | string | undefined;
		exponent?: number | string | undefined;
		externalResourcesRequired?: Booleanish | undefined;
		fill?: string | undefined;
		fillOpacity?: number | string | undefined;
		fillRule?: 'nonzero' | 'evenodd' | 'inherit' | undefined;
		filter?: string | undefined;
		filterRes?: number | string | undefined;
		filterUnits?: number | string | undefined;
		floodColor?: number | string | undefined;
		floodOpacity?: number | string | undefined;
		focusable?: Booleanish | 'auto' | undefined;
		fontFamily?: string | undefined;
		fontSize?: number | string | undefined;
		fontSizeAdjust?: number | string | undefined;
		fontStretch?: number | string | undefined;
		fontStyle?: number | string | undefined;
		fontVariant?: number | string | undefined;
		fontWeight?: number | string | undefined;
		format?: number | string | undefined;
		fr?: number | string | undefined;
		from?: number | string | undefined;
		fx?: number | string | undefined;
		fy?: number | string | undefined;
		g1?: number | string | undefined;
		g2?: number | string | undefined;
		glyphName?: number | string | undefined;
		glyphOrientationHorizontal?: number | string | undefined;
		glyphOrientationVertical?: number | string | undefined;
		glyphRef?: number | string | undefined;
		gradientTransform?: string | undefined;
		gradientUnits?: string | undefined;
		hanging?: number | string | undefined;
		horizAdvX?: number | string | undefined;
		horizOriginX?: number | string | undefined;
		href?: string | undefined;
		ideographic?: number | string | undefined;
		imageRendering?: number | string | undefined;
		in2?: number | string | undefined;
		in?: string | undefined;
		intercept?: number | string | undefined;
		k1?: number | string | undefined;
		k2?: number | string | undefined;
		k3?: number | string | undefined;
		k4?: number | string | undefined;
		k?: number | string | undefined;
		kernelMatrix?: number | string | undefined;
		kernelUnitLength?: number | string | undefined;
		kerning?: number | string | undefined;
		keyPoints?: number | string | undefined;
		keySplines?: number | string | undefined;
		keyTimes?: number | string | undefined;
		lengthAdjust?: number | string | undefined;
		letterSpacing?: number | string | undefined;
		lightingColor?: number | string | undefined;
		limitingConeAngle?: number | string | undefined;
		local?: number | string | undefined;
		markerEnd?: string | undefined;
		markerHeight?: number | string | undefined;
		markerMid?: string | undefined;
		markerStart?: string | undefined;
		markerUnits?: number | string | undefined;
		markerWidth?: number | string | undefined;
		mask?: string | undefined;
		maskContentUnits?: number | string | undefined;
		maskUnits?: number | string | undefined;
		mathematical?: number | string | undefined;
		mode?: number | string | undefined;
		numOctaves?: number | string | undefined;
		offset?: number | string | undefined;
		opacity?: number | string | undefined;
		operator?: number | string | undefined;
		order?: number | string | undefined;
		orient?: number | string | undefined;
		orientation?: number | string | undefined;
		origin?: number | string | undefined;
		overflow?: number | string | undefined;
		overlinePosition?: number | string | undefined;
		overlineThickness?: number | string | undefined;
		paintOrder?: number | string | undefined;
		panose1?: number | string | undefined;
		path?: string | undefined;
		pathLength?: number | string | undefined;
		patternContentUnits?: string | undefined;
		patternTransform?: number | string | undefined;
		patternUnits?: string | undefined;
		pointerEvents?: number | string | undefined;
		points?: string | undefined;
		pointsAtX?: number | string | undefined;
		pointsAtY?: number | string | undefined;
		pointsAtZ?: number | string | undefined;
		preserveAlpha?: Booleanish | undefined;
		preserveAspectRatio?: string | undefined;
		primitiveUnits?: number | string | undefined;
		r?: number | string | undefined;
		radius?: number | string | undefined;
		refX?: number | string | undefined;
		refY?: number | string | undefined;
		renderingIntent?: number | string | undefined;
		repeatCount?: number | string | undefined;
		repeatDur?: number | string | undefined;
		requiredExtensions?: number | string | undefined;
		requiredFeatures?: number | string | undefined;
		restart?: number | string | undefined;
		result?: string | undefined;
		rotate?: number | string | undefined;
		rx?: number | string | undefined;
		ry?: number | string | undefined;
		scale?: number | string | undefined;
		seed?: number | string | undefined;
		shapeRendering?: number | string | undefined;
		slope?: number | string | undefined;
		spacing?: number | string | undefined;
		specularConstant?: number | string | undefined;
		specularExponent?: number | string | undefined;
		speed?: number | string | undefined;
		spreadMethod?: string | undefined;
		startOffset?: number | string | undefined;
		stdDeviation?: number | string | undefined;
		stemh?: number | string | undefined;
		stemv?: number | string | undefined;
		stitchTiles?: number | string | undefined;
		stopColor?: string | undefined;
		stopOpacity?: number | string | undefined;
		strikethroughPosition?: number | string | undefined;
		strikethroughThickness?: number | string | undefined;
		string?: number | string | undefined;
		stroke?: string | undefined;
		strokeDasharray?: string | number | undefined;
		strokeDashoffset?: string | number | undefined;
		strokeLinecap?: 'butt' | 'round' | 'square' | 'inherit' | undefined;
		strokeLinejoin?: 'miter' | 'round' | 'bevel' | 'inherit' | undefined;
		strokeMiterlimit?: number | string | undefined;
		strokeOpacity?: number | string | undefined;
		strokeWidth?: number | string | undefined;
		surfaceScale?: number | string | undefined;
		systemLanguage?: number | string | undefined;
		tableValues?: number | string | undefined;
		targetX?: number | string | undefined;
		targetY?: number | string | undefined;
		textAnchor?: string | undefined;
		textDecoration?: number | string | undefined;
		textLength?: number | string | undefined;
		textRendering?: number | string | undefined;
		to?: number | string | undefined;
		transform?: string | undefined;
		u1?: number | string | undefined;
		u2?: number | string | undefined;
		underlinePosition?: number | string | undefined;
		underlineThickness?: number | string | undefined;
		unicode?: number | string | undefined;
		unicodeBidi?: number | string | undefined;
		unicodeRange?: number | string | undefined;
		unitsPerEm?: number | string | undefined;
		vAlphabetic?: number | string | undefined;
		values?: string | undefined;
		vectorEffect?: number | string | undefined;
		version?: string | undefined;
		vertAdvY?: number | string | undefined;
		vertOriginX?: number | string | undefined;
		vertOriginY?: number | string | undefined;
		vHanging?: number | string | undefined;
		vIdeographic?: number | string | undefined;
		viewBox?: string | undefined;
		viewTarget?: number | string | undefined;
		visibility?: number | string | undefined;
		vMathematical?: number | string | undefined;
		widths?: number | string | undefined;
		wordSpacing?: number | string | undefined;
		writingMode?: number | string | undefined;
		x1?: number | string | undefined;
		x2?: number | string | undefined;
		x?: number | string | undefined;
		xChannelSelector?: string | undefined;
		xHeight?: number | string | undefined;
		xlinkActuate?: string | undefined;
		xlinkArcrole?: string | undefined;
		xlinkHref?: string | undefined;
		xlinkRole?: string | undefined;
		xlinkShow?: string | undefined;
		xlinkTitle?: string | undefined;
		xlinkType?: string | undefined;
		xmlBase?: string | undefined;
		xmlLang?: string | undefined;
		xmlns?: string | undefined;
		xmlnsXlink?: string | undefined;
		xmlSpace?: string | undefined;
		y1?: number | string | undefined;
		y2?: number | string | undefined;
		y?: number | string | undefined;
		yChannelSelector?: string | undefined;
		z?: number | string | undefined;
		zoomAndPan?: string | undefined;
	}

	interface WebViewHTMLAttributes<T> extends HTMLAttributes<T> {
		allowFullScreen?: boolean | undefined;
		allowpopups?: boolean | undefined;
		autosize?: boolean | undefined;
		blinkfeatures?: string | undefined;
		disableblinkfeatures?: string | undefined;
		disableguestresize?: boolean | undefined;
		disablewebsecurity?: boolean | undefined;
		guestinstance?: string | undefined;
		httpreferrer?: string | undefined;
		nodeintegration?: boolean | undefined;
		partition?: string | undefined;
		plugins?: boolean | undefined;
		preload?: string | undefined;
		src?: string | undefined;
		useragent?: string | undefined;
		webpreferences?: string | undefined;
	}

	interface ReactSVG {
		animate: SVGFactory;
		circle: SVGFactory;
		clipPath: SVGFactory;
		defs: SVGFactory;
		desc: SVGFactory;
		ellipse: SVGFactory;
		feBlend: SVGFactory;
		feColorMatrix: SVGFactory;
		feComponentTransfer: SVGFactory;
		feComposite: SVGFactory;
		feConvolveMatrix: SVGFactory;
		feDiffuseLighting: SVGFactory;
		feDisplacementMap: SVGFactory;
		feDistantLight: SVGFactory;
		feDropShadow: SVGFactory;
		feFlood: SVGFactory;
		feFuncA: SVGFactory;
		feFuncB: SVGFactory;
		feFuncG: SVGFactory;
		feFuncR: SVGFactory;
		feGaussianBlur: SVGFactory;
		feImage: SVGFactory;
		feMerge: SVGFactory;
		feMergeNode: SVGFactory;
		feMorphology: SVGFactory;
		feOffset: SVGFactory;
		fePointLight: SVGFactory;
		feSpecularLighting: SVGFactory;
		feSpotLight: SVGFactory;
		feTile: SVGFactory;
		feTurbulence: SVGFactory;
		filter: SVGFactory;
		foreignObject: SVGFactory;
		g: SVGFactory;
		image: SVGFactory;
		line: SVGFactory;
		linearGradient: SVGFactory;
		marker: SVGFactory;
		mask: SVGFactory;
		metadata: SVGFactory;
		path: SVGFactory;
		pattern: SVGFactory;
		polygon: SVGFactory;
		polyline: SVGFactory;
		radialGradient: SVGFactory;
		rect: SVGFactory;
		stop: SVGFactory;
		svg: SVGFactory;
		switch: SVGFactory;
		symbol: SVGFactory;
		text: SVGFactory;
		textPath: SVGFactory;
		tspan: SVGFactory;
		use: SVGFactory;
		view: SVGFactory;
	}

	// Events
	export import TargetedEvent = JSXInternal.TargetedEvent;
	export import ChangeEvent = JSXInternal.TargetedEvent;
	export import ChangeEventHandler = JSXInternal.GenericEventHandler;

	export function createPortal(
		vnode: preact.VNode,
		container: Element | DocumentFragment
	): preact.VNode<any>;

	export function render(
		vnode: preact.VNode<any>,
		parent: Element,
		callback?: () => void
	): Component | null;

	export function hydrate(
		vnode: preact.VNode<any>,
		parent: Element,
		callback?: () => void
	): Component | null;

	export function unmountComponentAtNode(
		container: Element | Document | ShadowRoot | DocumentFragment
	): boolean;

	export function createFactory(
		type: preact.VNode<any>['type']
	): (
		props?: any,
		...children: preact.ComponentChildren[]
	) => preact.VNode<any>;
	export function isValidElement(element: any): boolean;
	export function isFragment(element: any): boolean;
	export function findDOMNode(
		component: preact.Component | Element
	): Element | null;

	export abstract class PureComponent<P = {}, S = {}> extends preact.Component<
		P,
		S
	> {
		isPureReactComponent: boolean;
	}

	export type MemoExoticComponent<C extends preact.FunctionalComponent<any>> =
		preact.FunctionComponent<ComponentProps<C>> & {
			readonly type: C;
		};

	export function memo<P = {}>(
		component: preact.FunctionalComponent<P>,
		comparer?: (prev: P, next: P) => boolean
	): preact.FunctionComponent<P>;
	export function memo<C extends preact.FunctionalComponent<any>>(
		component: C,
		comparer?: (
			prev: preact.ComponentProps<C>,
			next: preact.ComponentProps<C>
		) => boolean
	): C;

	export interface RefAttributes<R> extends preact.Attributes {
		ref?: preact.Ref<R> | undefined;
	}

	export interface ForwardFn<P = {}, T = any> {
		(props: P, ref: ForwardedRef<T>): preact.ComponentChild;
		displayName?: string;
	}

	export interface ForwardRefExoticComponent<P>
		extends preact.FunctionComponent<P> {
		defaultProps?: Partial<P> | undefined;
	}

	export function forwardRef<R, P = {}>(
		fn: ForwardFn<P, R>
	): preact.FunctionalComponent<Omit<P, 'ref'> & { ref?: preact.Ref<R> }>;

	interface MutableRefObject<T> {
		current: T;
	}

	export type ForwardedRef<T> =
		| ((instance: T | null) => void)
		| MutableRefObject<T | null>
		| null;

	export function unstable_batchedUpdates(
		callback: (arg?: any) => void,
		arg?: any
	): void;

	export type PropsWithChildren<P = unknown> = P & {
		children?: preact.ComponentChild | undefined;
	};

	export const Children: {
		map<T extends preact.ComponentChild, R>(
			children: T | T[],
			fn: (child: T, i: number) => R
		): R[];
		forEach<T extends preact.ComponentChild>(
			children: T | T[],
			fn: (child: T, i: number) => void
		): void;
		count: (children: preact.ComponentChildren) => number;
		only: (children: preact.ComponentChildren) => preact.ComponentChild;
		toArray: (children: preact.ComponentChildren) => preact.VNode<{}>[];
	};

	// scheduler
	export const unstable_ImmediatePriority: number;
	export const unstable_UserBlockingPriority: number;
	export const unstable_NormalPriority: number;
	export const unstable_LowPriority: number;
	export const unstable_IdlePriority: number;
	export function unstable_runWithPriority(
		priority: number,
		callback: () => void
	): void;
	export const unstable_now: () => number;
}
