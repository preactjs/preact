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

	export import DOMCSSProperties = preact.DOMCSSProperties;
	export import AllCSSProperties = preact.AllCSSProperties;
	export import CSSProperties = preact.CSSProperties;

	export import SignalLike = preact.SignalLike;
	export import Signalish = preact.Signalish;
	export import UnpackSignal = preact.UnpackSignal;

	export import SVGAttributes = preact.SVGAttributes;

	export import PathAttributes = preact.PathAttributes;

	export import TargetedEvent = preact.TargetedEvent;

	export import TargetedAnimationEvent = preact.TargetedAnimationEvent;
	export import TargetedClipboardEvent = preact.TargetedClipboardEvent;
	export import TargetedCommandEvent = preact.TargetedCommandEvent;
	export import TargetedCompositionEvent = preact.TargetedCompositionEvent;
	export import TargetedDragEvent = preact.TargetedDragEvent;
	export import TargetedFocusEvent = preact.TargetedFocusEvent;
	export import TargetedInputEvent = preact.TargetedInputEvent;
	export import TargetedKeyboardEvent = preact.TargetedKeyboardEvent;
	export import TargetedMouseEvent = preact.TargetedMouseEvent;
	export import TargetedPointerEvent = preact.TargetedPointerEvent;
	export import TargetedSubmitEvent = preact.TargetedSubmitEvent;
	export import TargetedTouchEvent = preact.TargetedTouchEvent;
	export import TargetedToggleEvent = preact.TargetedToggleEvent;
	export import TargetedTransitionEvent = preact.TargetedTransitionEvent;
	export import TargetedUIEvent = preact.TargetedUIEvent;
	export import TargetedWheelEvent = preact.TargetedWheelEvent;
	export import TargetedPictureInPictureEvent = preact.TargetedPictureInPictureEvent;

	export import EventHandler = preact.EventHandler;

	export import AnimationEventHandler = preact.AnimationEventHandler;
	export import ClipboardEventHandler = preact.ClipboardEventHandler;
	export import CommandEventHandler = preact.CommandEventHandler;
	export import CompositionEventHandler = preact.CompositionEventHandler;
	export import DragEventHandler = preact.DragEventHandler;
	export import ToggleEventHandler = preact.ToggleEventHandler;
	export import FocusEventHandler = preact.FocusEventHandler;
	export import GenericEventHandler = preact.GenericEventHandler;
	export import InputEventHandler = preact.InputEventHandler;
	export import KeyboardEventHandler = preact.KeyboardEventHandler;
	export import MouseEventHandler = preact.MouseEventHandler;
	export import PointerEventHandler = preact.PointerEventHandler;
	export import SubmitEventHandler = preact.SubmitEventHandler;
	export import TouchEventHandler = preact.TouchEventHandler;
	export import TransitionEventHandler = preact.TransitionEventHandler;
	export import UIEventHandler = preact.UIEventHandler;
	export import WheelEventHandler = preact.WheelEventHandler;
	export import PictureInPictureEventHandler = preact.PictureInPictureEventHandler;

	export import DOMAttributes = preact.DOMAttributes;

	export import AriaAttributes = preact.AriaAttributes;

	export import WAIAriaRole = preact.WAIAriaRole;

	export import DPubAriaRole = preact.DPubAriaRole;

	export import AriaRole = preact.AriaRole;

	export import AllHTMLAttributes = preact.AllHTMLAttributes;

	export import HTMLAttributes = preact.HTMLAttributes;

	export import HTMLAttributeReferrerPolicy = preact.HTMLAttributeReferrerPolicy;

	export import HTMLAttributeAnchorTarget = preact.HTMLAttributeAnchorTarget;

	export import AnchorHTMLAttributes = preact.AnchorHTMLAttributes;

	export import AreaHTMLAttributes = preact.AreaHTMLAttributes;

	export import AudioHTMLAttributes = preact.AudioHTMLAttributes;

	export import BaseHTMLAttributes = preact.BaseHTMLAttributes;

	export import BlockquoteHTMLAttributes = preact.BlockquoteHTMLAttributes;

	export import ButtonHTMLAttributes = preact.ButtonHTMLAttributes;

	export import CanvasHTMLAttributes = preact.CanvasHTMLAttributes;

	export import ColHTMLAttributes = preact.ColHTMLAttributes;

	export import ColgroupHTMLAttributes = preact.ColgroupHTMLAttributes;

	export import DataHTMLAttributes = preact.DataHTMLAttributes;

	export import DelHTMLAttributes = preact.DelHTMLAttributes;

	export import DetailsHTMLAttributes = preact.DetailsHTMLAttributes;

	export import DialogHTMLAttributes = preact.DialogHTMLAttributes;

	export import EmbedHTMLAttributes = preact.EmbedHTMLAttributes;

	export import FieldsetHTMLAttributes = preact.FieldsetHTMLAttributes;

	export import FormHTMLAttributes = preact.FormHTMLAttributes;

	export import IframeHTMLAttributes = preact.IframeHTMLAttributes;

	export import HTMLAttributeCrossOrigin = preact.HTMLAttributeCrossOrigin;

	export import ImgHTMLAttributes = preact.ImgHTMLAttributes;

	export import HTMLInputTypeAttribute = preact.HTMLInputTypeAttribute;

	export import InputHTMLAttributes = preact.InputHTMLAttributes;

	export import InsHTMLAttributes = preact.InsHTMLAttributes;

	export import KeygenHTMLAttributes = preact.KeygenHTMLAttributes;

	export import LabelHTMLAttributes = preact.LabelHTMLAttributes;

	export import LiHTMLAttributes = preact.LiHTMLAttributes;

	export import LinkHTMLAttributes = preact.LinkHTMLAttributes;

	export import MapHTMLAttributes = preact.MapHTMLAttributes;

	export import MarqueeHTMLAttributes = preact.MarqueeHTMLAttributes;

	export import MediaHTMLAttributes = preact.MediaHTMLAttributes;

	export import MenuHTMLAttributes = preact.MenuHTMLAttributes;

	export import MetaHTMLAttributes = preact.MetaHTMLAttributes;

	export import MeterHTMLAttributes = preact.MeterHTMLAttributes;

	export import ObjectHTMLAttributes = preact.ObjectHTMLAttributes;

	export import OlHTMLAttributes = preact.OlHTMLAttributes;

	export import OptgroupHTMLAttributes = preact.OptgroupHTMLAttributes;

	export import OptionHTMLAttributes = preact.OptionHTMLAttributes;

	export import OutputHTMLAttributes = preact.OutputHTMLAttributes;

	export import ParamHTMLAttributes = preact.ParamHTMLAttributes;

	export import ProgressHTMLAttributes = preact.ProgressHTMLAttributes;

	export import QuoteHTMLAttributes = preact.QuoteHTMLAttributes;

	export import ScriptHTMLAttributes = preact.ScriptHTMLAttributes;

	export import SelectHTMLAttributes = preact.SelectHTMLAttributes;

	export import SlotHTMLAttributes = preact.SlotHTMLAttributes;

	export import SourceHTMLAttributes = preact.SourceHTMLAttributes;

	export import StyleHTMLAttributes = preact.StyleHTMLAttributes;

	export import TableHTMLAttributes = preact.TableHTMLAttributes;

	export import TdHTMLAttributes = preact.TdHTMLAttributes;

	export import TextareaHTMLAttributes = preact.TextareaHTMLAttributes;

	export import ThHTMLAttributes = preact.ThHTMLAttributes;

	export import TimeHTMLAttributes = preact.TimeHTMLAttributes;

	export import TrackHTMLAttributes = preact.TrackHTMLAttributes;

	export import VideoHTMLAttributes = preact.VideoHTMLAttributes;

	export import DetailedHTMLProps = preact.DetailedHTMLProps;

	export import MathMLAttributes = preact.MathMLAttributes;

	export import AnnotationMathMLAttributes = preact.AnnotationMathMLAttributes;

	export import AnnotationXmlMathMLAttributes = preact.AnnotationXmlMathMLAttributes;

	export import MActionMathMLAttributes = preact.MActionMathMLAttributes;

	export import MathMathMLAttributes = preact.MathMathMLAttributes;

	export import MEncloseMathMLAttributes = preact.MEncloseMathMLAttributes;

	export import MErrorMathMLAttributes = preact.MErrorMathMLAttributes;

	export import MFencedMathMLAttributes = preact.MFencedMathMLAttributes;

	export import MFracMathMLAttributes = preact.MFracMathMLAttributes;

	export import MiMathMLAttributes = preact.MiMathMLAttributes;

	export import MmultiScriptsMathMLAttributes = preact.MmultiScriptsMathMLAttributes;

	export import MNMathMLAttributes = preact.MNMathMLAttributes;

	export import MOMathMLAttributes = preact.MOMathMLAttributes;

	export import MOverMathMLAttributes = preact.MOverMathMLAttributes;

	export import MPaddedMathMLAttributes = preact.MPaddedMathMLAttributes;

	export import MPhantomMathMLAttributes = preact.MPhantomMathMLAttributes;

	export import MPrescriptsMathMLAttributes = preact.MPrescriptsMathMLAttributes;

	export import MRootMathMLAttributes = preact.MRootMathMLAttributes;

	export import MRowMathMLAttributes = preact.MRowMathMLAttributes;

	export import MSMathMLAttributes = preact.MSMathMLAttributes;

	export import MSpaceMathMLAttributes = preact.MSpaceMathMLAttributes;

	export import MSqrtMathMLAttributes = preact.MSqrtMathMLAttributes;

	export import MStyleMathMLAttributes = preact.MStyleMathMLAttributes;

	export import MSubMathMLAttributes = preact.MSubMathMLAttributes;

	export import MSubsupMathMLAttributes = preact.MSubsupMathMLAttributes;

	export import MSupMathMLAttributes = preact.MSupMathMLAttributes;

	export import MTableMathMLAttributes = preact.MTableMathMLAttributes;

	export import MTdMathMLAttributes = preact.MTdMathMLAttributes;

	export import MTextMathMLAttributes = preact.MTextMathMLAttributes;

	export import MTrMathMLAttributes = preact.MTrMathMLAttributes;

	export import MUnderMathMLAttributes = preact.MUnderMathMLAttributes;

	export import MUnderoverMathMLAttributes = preact.MUnderoverMathMLAttributes;

	export import SemanticsMathMLAttributes = preact.SemanticsMathMLAttributes;

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

	export interface IntrinsicElements
		extends IntrinsicSVGElements,
			IntrinsicMathMLElements {
		a: preact.AnchorHTMLAttributes<HTMLAnchorElement>;
		abbr: preact.HTMLAttributes<HTMLElement>;
		address: preact.HTMLAttributes<HTMLElement>;
		area: preact.AreaHTMLAttributes<HTMLAreaElement>;
		article: preact.HTMLAttributes<HTMLElement>;
		aside: preact.HTMLAttributes<HTMLElement>;
		audio: preact.AudioHTMLAttributes<HTMLAudioElement>;
		b: preact.HTMLAttributes<HTMLElement>;
		base: preact.BaseHTMLAttributes<HTMLBaseElement>;
		bdi: preact.HTMLAttributes<HTMLElement>;
		bdo: preact.HTMLAttributes<HTMLElement>;
		big: preact.HTMLAttributes<HTMLElement>;
		blockquote: preact.BlockquoteHTMLAttributes<HTMLQuoteElement>;
		body: preact.HTMLAttributes<HTMLBodyElement>;
		br: preact.HTMLAttributes<HTMLBRElement>;
		button: preact.ButtonHTMLAttributes<HTMLButtonElement>;
		canvas: preact.CanvasHTMLAttributes<HTMLCanvasElement>;
		caption: preact.HTMLAttributes<HTMLTableCaptionElement>;
		cite: preact.HTMLAttributes<HTMLElement>;
		code: preact.HTMLAttributes<HTMLElement>;
		col: preact.ColHTMLAttributes<HTMLTableColElement>;
		colgroup: preact.ColgroupHTMLAttributes<HTMLTableColElement>;
		data: preact.DataHTMLAttributes<HTMLDataElement>;
		datalist: preact.HTMLAttributes<HTMLDataListElement>;
		dd: preact.HTMLAttributes<HTMLElement>;
		del: preact.DelHTMLAttributes<HTMLModElement>;
		details: preact.DetailsHTMLAttributes<HTMLDetailsElement>;
		dfn: preact.HTMLAttributes<HTMLElement>;
		dialog: preact.DialogHTMLAttributes<HTMLDialogElement>;
		div: preact.HTMLAttributes<HTMLDivElement>;
		dl: preact.HTMLAttributes<HTMLDListElement>;
		dt: preact.HTMLAttributes<HTMLElement>;
		em: preact.HTMLAttributes<HTMLElement>;
		embed: preact.EmbedHTMLAttributes<HTMLEmbedElement>;
		fieldset: preact.FieldsetHTMLAttributes<HTMLFieldSetElement>;
		figcaption: preact.HTMLAttributes<HTMLElement>;
		figure: preact.HTMLAttributes<HTMLElement>;
		footer: preact.HTMLAttributes<HTMLElement>;
		form: preact.FormHTMLAttributes<HTMLFormElement>;
		h1: preact.HTMLAttributes<HTMLHeadingElement>;
		h2: preact.HTMLAttributes<HTMLHeadingElement>;
		h3: preact.HTMLAttributes<HTMLHeadingElement>;
		h4: preact.HTMLAttributes<HTMLHeadingElement>;
		h5: preact.HTMLAttributes<HTMLHeadingElement>;
		h6: preact.HTMLAttributes<HTMLHeadingElement>;
		head: preact.HTMLAttributes<HTMLHeadElement>;
		header: preact.HTMLAttributes<HTMLElement>;
		hgroup: preact.HTMLAttributes<HTMLElement>;
		hr: preact.HTMLAttributes<HTMLHRElement>;
		html: preact.HTMLAttributes<HTMLHtmlElement>;
		i: preact.HTMLAttributes<HTMLElement>;
		iframe: preact.IframeHTMLAttributes<HTMLIFrameElement>;
		img: preact.ImgHTMLAttributes<HTMLImageElement>;
		input: preact.InputHTMLAttributes<HTMLInputElement>;
		ins: preact.InsHTMLAttributes<HTMLModElement>;
		kbd: preact.HTMLAttributes<HTMLElement>;
		keygen: preact.KeygenHTMLAttributes<HTMLUnknownElement>;
		label: preact.LabelHTMLAttributes<HTMLLabelElement>;
		legend: preact.HTMLAttributes<HTMLLegendElement>;
		li: preact.LiHTMLAttributes<HTMLLIElement>;
		link: preact.LinkHTMLAttributes<HTMLLinkElement>;
		main: preact.HTMLAttributes<HTMLElement>;
		map: preact.MapHTMLAttributes<HTMLMapElement>;
		mark: preact.HTMLAttributes<HTMLElement>;
		marquee: preact.MarqueeHTMLAttributes<HTMLMarqueeElement>;
		menu: preact.MenuHTMLAttributes<HTMLMenuElement>;
		menuitem: preact.HTMLAttributes<HTMLUnknownElement>;
		meta: preact.MetaHTMLAttributes<HTMLMetaElement>;
		meter: preact.MeterHTMLAttributes<HTMLMeterElement>;
		nav: preact.HTMLAttributes<HTMLElement>;
		noscript: preact.HTMLAttributes<HTMLElement>;
		object: preact.ObjectHTMLAttributes<HTMLObjectElement>;
		ol: preact.OlHTMLAttributes<HTMLOListElement>;
		optgroup: preact.OptgroupHTMLAttributes<HTMLOptGroupElement>;
		option: preact.OptionHTMLAttributes<HTMLOptionElement>;
		output: preact.OutputHTMLAttributes<HTMLOutputElement>;
		p: preact.HTMLAttributes<HTMLParagraphElement>;
		param: preact.ParamHTMLAttributes<HTMLParamElement>;
		picture: preact.HTMLAttributes<HTMLPictureElement>;
		pre: preact.HTMLAttributes<HTMLPreElement>;
		progress: preact.ProgressHTMLAttributes<HTMLProgressElement>;
		q: preact.QuoteHTMLAttributes<HTMLQuoteElement>;
		rp: preact.HTMLAttributes<HTMLElement>;
		rt: preact.HTMLAttributes<HTMLElement>;
		ruby: preact.HTMLAttributes<HTMLElement>;
		s: preact.HTMLAttributes<HTMLElement>;
		samp: preact.HTMLAttributes<HTMLElement>;
		script: preact.ScriptHTMLAttributes<HTMLScriptElement>;
		search: preact.HTMLAttributes<HTMLElement>;
		section: preact.HTMLAttributes<HTMLElement>;
		select: preact.SelectHTMLAttributes<HTMLSelectElement>;
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
		template: preact.HTMLAttributes<HTMLTemplateElement>;
		textarea: preact.TextareaHTMLAttributes<HTMLTextAreaElement>;
		tfoot: preact.HTMLAttributes<HTMLTableSectionElement>;
		th: preact.ThHTMLAttributes<HTMLTableCellElement>;
		thead: preact.HTMLAttributes<HTMLTableSectionElement>;
		time: preact.TimeHTMLAttributes<HTMLTimeElement>;
		title: preact.HTMLAttributes<HTMLTitleElement>;
		tr: preact.HTMLAttributes<HTMLTableRowElement>;
		track: preact.TrackHTMLAttributes<HTMLTrackElement>;
		u: preact.HTMLAttributes<HTMLElement>;
		ul: preact.HTMLAttributes<HTMLUListElement>;
		var: preact.HTMLAttributes<HTMLElement>;
		video: preact.VideoHTMLAttributes<HTMLVideoElement>;
		wbr: preact.HTMLAttributes<HTMLElement>;
	}
}
