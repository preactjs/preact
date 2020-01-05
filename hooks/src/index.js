export {
	useState,
	useReducer,
	useEffect,
	useLayoutEffect,
	useDebugValue,
	useContext,
	useRef,
	useMemo,
	useCallback
} from 'preact';

/**
 * @param {object} ref
 * @param {() => object} createHandle
 * @param {any[]} args
 */
export function useImperativeHandle(ref, createHandle, args) {
	useLayoutEffect(
		() => {
			if (typeof ref == 'function') ref(value);
			else if (ref) ref.current = value;
		},
		args == null ? args : args.concat(ref)
	);
}

/**
 * Display a custom label for a custom hook for the devtools panel
 * @type {<T>(value: T, cb?: (value: T) => string | number) => void}
 */
export function useDebugValue(value, formatter) {
	if (options.useDebugValue) {
		options.useDebugValue(formatter ? formatter(value) : value);
	}
}
