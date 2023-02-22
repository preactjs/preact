import { createElement, JSX } from 'preact';

function createSignal<T>(value: T) {
	return { value };
}

// @ts-expect-error We should correctly type aria attributes like autocomplete
const badAriaValues = <div aria-autocomplete="bad-value" />;
const validAriaValues = <div aria-autocomplete="none" />;
const undefAriaValues = <div aria-autocomplete={undefined} />;
const noAriaValues = <div />;

// @ts-expect-error We should correctly type aria attributes like autocomplete
const signalBadAriaValues = (
	<div aria-autocomplete={createSignal('bad-value' as const)} />
);
const signalValidAriaValues = (
	<div
		aria-autocomplete={createSignal(
			'none' as 'none' | undefined
			// 'none' as JSX.AriaAttributes['aria-autocomplete']
		)}
	/>
);

// Explicitly allow any string to accommodate new aria roles and match React typings behavior
const newRole = <div role="new-value" />;
const validRole = <div role="button" />;
