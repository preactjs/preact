import { useState, useLayoutEffect, useEffect } from 'preact/hooks';

/**
 * Asynchronously schedule a callback
 * @type {(cb: () => void) => void}
 */
/* istanbul ignore next */
// Note the following line isn't tree-shaken by rollup cuz of rollup/rollup#2566
const defer =
	typeof Promise == 'function'
		? Promise.prototype.then.bind(Promise.resolve())
		: setTimeout;

export function useDeferredValue(val) {
	return val;
}

export function useTransition() {
	const [isPending, setIsPending] = useState(false);

	const start = cb => {
		setIsPending(true);
		cb();
		defer(() => {
			setIsPending(false);
		});
	};

	return [isPending, start];
}

export const useInsertionEffect = useEffect;

export function useSyncExternalStore(subscribe, getSnapshot) {
	const [state, setState] = useState(getSnapshot);
	const value = getSnapshot();

	useLayoutEffect(() => {
		if (value !== state) {
			setState(value);
		}
	}, [value]);

	useEffect(() => {
		return subscribe(() => {
			setState(getSnapshot());
		});
	}, [subscribe, getSnapshot]);

	return state;
}

// TODO: useId... This could be a bit more challenging as RTS does not have
// all the capabilities our common renderer has.
