import { options, Fragment, Component } from 'preact';

export function initDevTools() {
	if (typeof window != 'undefined' && window.__PREACT_DEVTOOLS__) {
		window.__PREACT_DEVTOOLS__.attachPreact('10.5.15', options, {
			Fragment,
			Component
		});
	}
}
