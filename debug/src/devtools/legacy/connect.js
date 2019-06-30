import { Fragment } from 'preact';
import { assign } from '../../../../src/util';
import { Renderer } from './renderer';
import { catchErrors } from '../util';

/**
 * Create an adapter instance for the legacy devtools
 * @param {import('../../internal').RendererConfigBase} config
 * @param {import('../../internal').LegacyDevtoolsHook} hook
 */
export function createLegacyAdapter(config, hook) {
	// The renderer id is just a random string
	let rendererId = Math.random().toString(16).slice(2);

	let adapter = new Renderer(hook, rendererId);

	let renderer = assign(assign({}, config), {
		findHostInstanceByFiber: adapter.getNativeFromReactElement,
		findFiberByHostInstance: adapter.getReactElementFromNative
	});

	hook._renderers[rendererId] = renderer;
	let shouldConnect = false;
	let connectManually = false;

	// We can't bring our own `attachRenderer` function therefore we simply
	// prevent the devtools from overwriting our custom renderer by creating
	// a noop setter.
	Object.defineProperty(hook.helpers, rendererId, {
		get: () => adapter,
		set: () => {
			if (shouldConnect && !adapter.connected) {
				helpers.markConnected();
			}
			else {
				connectManually = true;
			}
		}
	});

	let helpers = hook.helpers[rendererId];

	return {
		renderer,
		connect() {
			shouldConnect = true;

			if (connectManually) {
				helpers.markConnected();
			}

			// Tell the devtools that we are ready to start
			hook.emit('renderer-attached', {
				id: rendererId,
				renderer,
				helpers
			});
		},
		onCommitRoot: catchErrors(root => {
			// Empty root
			if (root.type===Fragment && root._children.length==0) return;

			let roots = hook.getFiberRoots(rendererId);
			root = helpers.handleCommitFiberRoot(root);
			if (!roots.has(root)) roots.add(root);
		}),
		onCommitUnmount: catchErrors(vnode => {
			hook.onCommitFiberUnmount(rendererId, vnode);
		})
	};
}
