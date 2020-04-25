import { options, Fragment, Component } from 'preact';

export function initDevTools() {
	const hook =
		typeof window != 'undefined' &&
		(window.__PREACT_DEVTOOLS__ || window.parent.__PREACT_DEVTOOLS__);

	if (hook) {
		hook.attachPreact('10.4.1', options, {
			Fragment,
			Component
		});
	}
}
