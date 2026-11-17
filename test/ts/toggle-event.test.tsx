import { createElement, ToggleEventHandler } from 'preact';

const onToggle: ToggleEventHandler<HTMLDivElement> = event => {
	const source: Element | null = event.source;
	const noSource: typeof event.source = null;
	const currentTarget: HTMLDivElement = event.currentTarget;

	// @ts-expect-error The source of a toggle event is read-only.
	event.source = source;
};

const toggleSource = (
	<div
		popover
		onToggle={onToggle}
		onBeforeToggle={event => {
			const source: Element | null = event.source;
		}}
	/>
);
