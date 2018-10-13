import { getData, getChildren, getPatchedRoot, getInstance, hasProfileDataChanged, hasDataChanged, isRoot, patchRoot } from './custom';
import { assign } from '../util';

/**
 * Custom renderer tailored for Preact. It converts updated vnode trees
 * to events the devtools can understand.
 * @class Renderer
 */
export class Renderer {
	constructor(hook, rid) {

		/** @type {string} */
		this.rid = rid;
		this.hook = hook;

		/** @type {Array<import('../internal').DevtoolsEvent>} */
		this.pending = [];

		/**
		 * Store the instance of a vnode. This will be later used to decide if a
		 * vnode needs to be mounted or updated. For components the instance refers
		 * to the actuall class instance whereas for dom nodes it refers to the
		 * underlying dom element.
		 * @type {WeakMap<import('../internal').Component | import('../internal').PreactElement | HTMLElement | Text, import('../internal').VNode>}
		 */
		this.inst2vnode = new WeakMap();
		this.connected = false;
	}

	/**
	 * Mark the connection status as ready so that we can proceed
	 * to actually flush events.
	 */
	markConnected() {
		this.connected = true;
		this.flushPendingEvents();
	}

	/**
	 * Flush all queued events
	 */
	flushPendingEvents() {
		if (!this.connected) return;

		let events = this.pending;
		this.pending = [];
		for (let i = 0; i < events.length; i++) {
			let event = events[i];
			this.hook.emit(event.type, event);
		}
	}

	/**
	 * Recursively mount a vnode tree. Note that the devtools expectes the tree to
	 * be mounted from the bottom up, otherwise the order will be messed up.
	 * Therefore we mount children prior to mounting the vnode itself.
	 * @param {import('../internal').VNode} vnode
	 */
	mount(vnode) {
		this.inst2vnode.set(getInstance(vnode), vnode);
		let data = getData(vnode);

		// The Profiler throws if this is not present
		// Workaround until this PR the following PR is merged. The profiler will
		// throw if this property is not present
		// https://github.com/facebook/react-devtools/pull/1178/
		/** @type {*} */
		(vnode).stateNode = { memoizedInteractions: data.memoizedInteractions };

		/** @type {Array<import('../internal').DevtoolsEvent>} */
		let work = [{
			internalInstance: vnode,
			data,
			renderer: this.rid,
			type: 'mount'
		}];

		// Children must be mounted first
		if (Array.isArray(data.children)) {
			let stack = data.children.slice();
			let item;
			while ((item = stack.pop())!=null) {
				let children = getChildren(item);
				stack.push(...children);

				this.inst2vnode.set(getInstance(item), item);

				let data = getData(item);

				// In preparation for https://github.com/facebook/react-devtools/pull/1178/
				item.stateNode = { memoizedInteractions: data.memoizedInteractions };

				work.push({
					internalInstance: item,
					data,
					renderer: this.rid,
					type: 'mount'
				});
			}
		}

		for (let i = work.length; --i>=0;) {
			this.pending.push(work[i]);
		}

		// Special event if we have a root
		if (isRoot(vnode)) {
			this.pending.push({
				internalInstance: vnode,
				// In preparation for https://github.com/facebook/react-devtools/pull/1178/
				data,
				renderer: this.rid,
				type: 'root'
			});
		}
	}

	/**
	 * Update a vnode tree
	 * @param {import('../internal').VNode} vnode
	 */
	update(vnode) {
		let data = getData(vnode);

		// Children must be updated first
		if (Array.isArray(data.children)) {
			for (let i = 0; i < data.children.length; i++) {
				let child = data.children[i];
				let inst = getInstance(child);

				let prevChild = this.inst2vnode.get(inst);
				if (prevChild==null) this.mount(child);
				else this.update(child);

				// Mutate child to keep referential equality intact
				data.children[i] = this.inst2vnode.get(inst);
			}
		}

		let prev = this.inst2vnode.get(data.publicInstance);

		/** @type {import('../internal').EventType} */
		let type = !hasDataChanged(prev, vnode) && hasProfileDataChanged(prev, vnode)
			? 'updateProfileTimes'
			: 'update';

		this.pending.push({
			internalInstance: assign(prev, vnode),
			data,
			renderer: this.rid,
			type
		});
	}

	/**
	 * Pass a rendered tree to the devtools. At this point elements have already
	 * unmounted, so we don't need to check for removals and only update vs mount
	 * instead.
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberRoot(vnode) {
		if (isRoot(vnode)) {
			vnode = patchRoot(vnode);
		}

		let inst = getInstance(vnode);

		if (this.inst2vnode.has(inst)) this.update(vnode);
		else this.mount(vnode);

		let root = getPatchedRoot(vnode);
		this.pending.push({
			internalInstance: root,
			renderer: this.rid,
			// In preparation for https://github.com/facebook/react-devtools/pull/1178/
			data: getData(root),
			type: 'rootCommitted'
		});

		this.flushPendingEvents();
		return root;
	}

	/**
	 * Unmount a vnode recursively
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberUnmount(vnode) {
		let inst = getInstance(vnode);

		this.inst2vnode.delete(inst);

		this.pending.push({
			internalInstance: vnode,
			renderer: this.rid,
			type: 'unmount'
		});
	}

	/**
	 * Get the dom element by a vnode
	 * @param {import('../internal').VNode} vnode
	 * @returns {import('../internal').PreactElement | Text}
	 */
	getNativeFromReactElement(vnode) {
		return vnode._el;
	}

	/**
	 * Get a vnode by a dom element
	 * @param {import('../internal').PreactElement | Text} dom
	 * @returns {import('../internal').VNode | null}
	 */
	getReactElementFromNative(dom) {
		return this.inst2vnode.get(dom) || null;
	}

	// Unused, but devtools expects it to be there
	/* istanbul ignore next */
	walkTree() {}

	// Unused, but devtools expects it to be there
	/* istanbul ignore next */
	cleanup() {}
}
