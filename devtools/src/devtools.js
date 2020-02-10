import { options, Fragment } from 'preact';

export function initDevTools() {
	if (typeof window !== 'undefined' && window.__PREACT_DEVTOOLS__) {
		window.__PREACT_DEVTOOLS__.attachPreact('10.0.5', options, {
			Fragment
		});
	}
}
