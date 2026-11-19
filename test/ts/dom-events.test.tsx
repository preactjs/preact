import {
	createElement,
	ContentVisibilityAutoStateChangeEventHandler,
	SecurityPolicyViolationEventHandler
} from 'preact';

// Events that fire on any element
const globalEvents = (
	<div
		onAnimationCancel={event => {
			const name: string = event.animationName;
			const target: HTMLDivElement = event.currentTarget;
		}}
		onBeforeMatch={event => {
			const target: HTMLDivElement = event.currentTarget;
		}}
		onContentVisibilityAutoStateChange={event => {
			const skipped: boolean = event.skipped;
			const target: HTMLDivElement = event.currentTarget;
		}}
		onFullscreenChange={event => {
			const target: HTMLDivElement = event.currentTarget;
		}}
		onFullscreenError={event => {
			const target: HTMLDivElement = event.currentTarget;
		}}
		onPointerRawUpdate={event => {
			const pressure: number = event.pressure;
		}}
		onSecurityPolicyViolation={event => {
			const directive: string = event.violatedDirective;
		}}
		onSelectStart={event => {
			const target: HTMLDivElement = event.currentTarget;
		}}
		onSelectionChange={event => {
			const target: HTMLDivElement = event.currentTarget;
		}}
	/>
);

const captureEvents = (
	<div
		onAnimationCancelCapture={() => {}}
		onBeforeMatchCapture={() => {}}
		onContentVisibilityAutoStateChangeCapture={() => {}}
		onFullscreenChangeCapture={() => {}}
		onFullscreenErrorCapture={() => {}}
		onPointerRawUpdateCapture={() => {}}
		onSecurityPolicyViolationCapture={() => {}}
		onSelectStartCapture={() => {}}
		onSelectionChangeCapture={() => {}}
	/>
);

const contentVisibility: ContentVisibilityAutoStateChangeEventHandler<
	HTMLDivElement
> = event => {
	const skipped: boolean = event.skipped;
};
const securityPolicy: SecurityPolicyViolationEventHandler<
	HTMLDivElement
> = event => {
	const blockedURI: string = event.blockedURI;
};

// Events that only fire on specific elements
const slot = (
	<slot
		onSlotChange={event => {
			const target: HTMLSlotElement = event.currentTarget;
		}}
		onSlotChangeCapture={() => {}}
	/>
);

const canvas = (
	<canvas
		onContextLost={event => {
			const target: HTMLCanvasElement = event.currentTarget;
		}}
		onContextRestored={event => {
			const target: HTMLCanvasElement = event.currentTarget;
		}}
		onContextLostCapture={() => {}}
		onContextRestoredCapture={() => {}}
	/>
);

const track = (
	<track
		onCueChange={event => {
			const target: HTMLTrackElement = event.currentTarget;
		}}
		onCueChangeCapture={() => {}}
	/>
);

// @ts-expect-error `slotchange` only fires on <slot>
const slotChangeOnDiv = <div onSlotChange={() => {}} />;
// @ts-expect-error `contextlost` only fires on <canvas>
const contextLostOnDiv = <div onContextLost={() => {}} />;
