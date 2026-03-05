import { useState, useLayoutEffect, useEffect } from 'preact/hooks';
import { options as _options } from 'preact';

const MODE_HYDRATE = 1 << 5;

/** @type {boolean} */
let hydrating;
// Cast to use internal Options type
const options = /** @type {import('../../src/internal').Options} */ (_options);
let oldBeforeRender = options._render;

/** @type {(vnode: import('./internal').VNode) => void} */
options._render = _vnode => {
	hydrating = !!(_vnode._flags & MODE_HYDRATE);
	if (oldBeforeRender) oldBeforeRender(_vnode);
};

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
		typeof window === 'undefined' || hydrating
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
	throw new Error(
		'Missing "getServerSnapshot" parameter for "useSyncExternalStore", this is required for server rendering & hydration of server-rendered content'
	);
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
