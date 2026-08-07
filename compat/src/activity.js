import { createElement } from 'preact';

/**
 * A lightweight compatibility implementation of React's Activity component.
 *
 * Keeping the wrapper mounted preserves component state and DOM state when the
 * activity is hidden. Unlike React, this does not disconnect effects or defer
 * updates in hidden trees.
 *
 * @param {import('./activity').ActivityProps} props
 */
export function Activity(props) {
	return createElement(
		'div',
		{ style: { display: props.mode == 'hidden' ? 'none' : 'contents' } },
		props.children
	);
}
