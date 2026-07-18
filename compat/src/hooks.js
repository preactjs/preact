import { useState, useLayoutEffect, useEffect, useRef } from 'preact/hooks';
import { options as _options } from 'preact';

// Cast to use internal Options type
const options = /** @type {import('../../src/internal').Options} */ (_options);

/**
 * This is taken from https://github.com/facebook/react/blob/main/packages/use-sync-external-store/src/useSyncExternalStoreShimClient.js#L84
 * on a high level this cuts out the warnings, ... and attempts a smaller implementation
 * @typedef {{ _value: any; _getSnapshot: () => any }} Store
 */
export function useSyncExternalStore(
	subscribe,
	getSnapshot,
	getServerSnapshot
) {
	const value =
		options._skipEffects || options._hydrationRoot
			? getServerSnapshot
				? getServerSnapshot()
				: missingGetServerSnapshot()
			: getSnapshot();

	/**
	 * @typedef {{ _instance: Store }} StoreRef
	 * @type {[StoreRef, (store: StoreRef) => void]}
	 */
	const [{ _instance }, forceUpdate] = useState({
		_instance: { _value: value, _getSnapshot: getSnapshot }
	});

	useLayoutEffect(() => {
		_instance._value = value;
		_instance._getSnapshot = getSnapshot;

		if (didSnapshotChange(_instance)) {
			forceUpdate({ _instance });
		}
	}, [subscribe, value, getSnapshot]);

	useEffect(() => {
		if (didSnapshotChange(_instance)) {
			forceUpdate({ _instance });
		}

		return subscribe(() => {
			if (didSnapshotChange(_instance)) {
				forceUpdate({ _instance });
			}
		});
	}, [subscribe]);

	return value;
}

/** @type {(inst: Store) => boolean} */
function didSnapshotChange(inst) {
	try {
		return !Object.is(inst._value, inst._getSnapshot());
	} catch (error) {
		return true;
	}
}

function missingGetServerSnapshot() {
	throw new Error('Missing getServerSnapshot');
}

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
