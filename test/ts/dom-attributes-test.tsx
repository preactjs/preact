import { createElement, JSX } from 'preact';

function createSignal<T>(value: T): JSX.SignalLike<T> {
	return {
		value,
		peek() {
			return value;
		},
		subscribe() {
			return () => {};
		}
	};
}

// @ts-expect-error We should correctly type aria attributes like autocomplete
const badAriaValues = <div aria-autocomplete="bad-value" />;
const validAriaValues = <div aria-autocomplete="none" />;
const undefAriaValues = <div aria-autocomplete={undefined} />;
const noAriaValues = <div />;

const signalBadAriaValues = (
	// @ts-expect-error We should correctly type aria attributes like autocomplete
	<div aria-autocomplete={createSignal('bad-value' as const)} />
);
const signalValidAriaValues = (
	<div aria-autocomplete={createSignal('none' as 'none' | undefined)} />
);
const signalValidAriaValues2 = (
	<div
		aria-autocomplete={createSignal(
			'none' as JSX.UnpackSignal<JSX.AriaAttributes['aria-autocomplete']>
		)}
	/>
);

// Explicitly allow any string to accommodate new aria roles and match React typings behavior
const newRole = <div role="new-value" />;
const validRole = <div role="button" />;
