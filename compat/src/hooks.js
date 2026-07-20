import { useLayoutEffect, useRef } from 'preact/hooks';

export function startTransition(cb) {
	cb();
}

export function useDeferredValue(val) {
	return val;
}

export function useTransition() {
	return [false, startTransition];
}

// TODO: in theory this should be done after a VNode is diffed as we want to insert
// styles/... before it attaches
export const useInsertionEffect = useLayoutEffect;

/**
 * @template {Function} T
 * @param {T} callback
 * @returns {T}
 */
export function useEffectEvent(callback) {
	const ref = useRef(callback);
	ref.current = callback;

	return /** @type {T} */ (
		function () {
			return ref.current.apply(undefined, arguments);
		}
	);
}
