/* istanbul ignore file */
/**
 * Allow forcefully toggling Suspense components
 * @param {import('./devtools').IdMapper} idMapper
 */
export function createSuspender(idMapper) {
	let suspended = new Map();

	return {
		showFallback(vnode) {
			if (idMapper.hasId(vnode)) {
				const id = idMapper.getId(vnode);
				if (!suspended.has(id)) {
					let resolve;
					const p = new Promise(r => resolve = r);
					vnode._component._childDidSuspend(p);
					suspended.set(id, resolve);
				}
			}
		},
		showChildren(vnode) {
			if (idMapper.hasId(vnode)) {
				const id = idMapper.getId(vnode);
				if (suspended.has(id)) {
					suspended.get(id)();
					suspended.delete(id);
				}
			}
		}
	};
}
