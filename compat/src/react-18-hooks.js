import { useState, useLayoutEffect, useEffect, useCallback } from 'preact/hooks';

export function useDeferredValue(val) {
	return val;
}

export function useTransition() {
  return [false, useCallback(cb => { cb(); }, [])];
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
