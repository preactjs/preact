import { options, Fragment, Component } from 'preact';

export function initDevTools() {
	if (typeof window != 'undefined' && window.__PREACT_DEVTOOLS__) {
		window.__PREACT_DEVTOOLS__.attachPreact('10.19.3', options, {
			Fragment,
			Component
		});
	}
}
