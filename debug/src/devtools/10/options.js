/**
 *
 * @param {import('../../internal').Options} options
 * @param {import('./types').Renderer} renderer
 */
export function setupOptions(options, renderer) {
	// Store (possible) previous hooks so that we don't overwrite them
	let prevVNodeHook = options.vnode;
	let prevCommitRoot = options._commit;
	let prevBeforeUnmount = options.unmount;
	let prevBeforeDiff = options._diff;
	let prevAfterDiff = options.diffed;

	options.vnode = vnode => {
		// Tiny performance improvement by initializing fields as doubles
		// from the start. `performance.now()` will always return a double.
		// See https://github.com/facebook/react/issues/14365
		// and https://slidr.io/bmeurer/javascript-engine-fundamentals-the-good-the-bad-and-the-ugly
		vnode.startTime = NaN;
		vnode.endTime = NaN;

		vnode.startTime = 0;
		vnode.endTime = -1;
		if (prevVNodeHook) prevVNodeHook(vnode);
	};

	options._diff = vnode => {
		vnode.startTime = performance.now();
		if (prevBeforeDiff != null) prevBeforeDiff(vnode);
	};

	options.diffed = vnode => {
		vnode.endTime = performance.now();

		if (prevAfterDiff) prevAfterDiff(vnode);
	};

	options._commit = (vnode, queue) => {
		if (prevCommitRoot) prevCommitRoot(vnode, queue);

		// These cases are already handled by `unmount`
		if (vnode == null) return;

		renderer.onCommit(vnode);
	};

	options.unmount = vnode => {
		if (prevBeforeUnmount) prevBeforeUnmount(vnode);
		renderer.onUnmount(vnode);
	};

	// Teardown devtools options. Mainly used for testing
	return () => {
		options.unmount = prevBeforeUnmount;
		options._commit = prevCommitRoot;
		options.diffed = prevAfterDiff;
		options._diff = prevBeforeDiff;
		options.vnode = prevVNodeHook;
	};
}
