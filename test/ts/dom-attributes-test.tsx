import { createElement, Fragment, JSX } from 'preact';

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

// @ts-expect-error A button should not have a role of presentation
const badAriaRole = <button role="presentation" />;
const validAriaRole = <button role="slider" />;

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

const validRole = <div role="button" />;
// @ts-expect-error We should correctly type aria roles
const invalidRole = <div role="invalid-role" />;
// @ts-expect-error We should disallow `generic` as it should not ever be explicitly set
const invalidRole2 = <div role="generic" />;
const fallbackRole = <div role="none presentation" />;

const booleanishTest = (
	<>
		<div aria-haspopup={true} />
		<div aria-haspopup={false} />
		<div aria-haspopup={'true'} />
		<div aria-haspopup={'false'} />
		<div aria-haspopup={'dialog'} />
	</>
);
