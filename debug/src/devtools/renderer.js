/* istanbul ignore file */
import { getData, getChildren, getInstance, hasDataChanged, isRoot } from './custom';

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
	 * Recursively mount a vnode tree. Note that the devtools expects the tree to
	 * be mounted from the bottom up, otherwise the order will be messed up.
	 * Therefore we mount children prior to mounting the vnode itself.
	 * @param {import('../internal').VNode} vnode
	 */
	mount(vnode) {
		this.inst2vnode.set(getInstance(vnode), vnode);
		let data = getData(vnode);

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

		// The `updateProfileTimes` event is a faster version of `updated` and
		// is processed much quicker inside the devtools extension.
		if (!hasDataChanged(prev, vnode)) {
			// Always assume profiling data has changed. When we skip an event here
			// the devtools element picker will somehow break.
			this.pending.push({
				// This property is only used as an id inside the devtools. The
				// relevant data will be read from `.data` instead which is a
				// normalized structure that every react release adheres to. This
				// makes backwards-compatibility easier instead of relying on internal
				// vnode/fiber shape.
				internalInstance: prev,
				data,
				renderer: this.rid,
				type: 'updateProfileTimes'
			});
			return;
		}

		this.pending.push({
			// This property is only used as an id inside the devtools. The
			// relevant data will be read from `.data` instead which is a
			// normalized structure that every react release adheres to. This
			// makes backwards-compatibility easier instead of relying on internal
			// vnode/fiber shape.
			internalInstance: prev,
			data,
			renderer: this.rid,
			type: 'update'
		});
	}

	/**
	 * Pass a rendered tree to the devtools. At this point elements have already
	 * unmounted, so we don't need to check for removals and only update vs mount
	 * instead.
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberRoot(vnode) {
		let inst = getInstance(vnode);

		if (this.inst2vnode.has(inst)) this.update(vnode);
		else this.mount(vnode);

		// The devtools checks via the existence of this property if the devtools
		// profiler should be enabled or not. If it is missing from the first root
		// node the "Profiler" tab won't show up.
		/** @type {import('../internal').VNode} */
		let root = null;
		if (isRoot(vnode)) {

			/** @type {*} */
			(vnode).treeBaseDuration = 0;
			root = vnode;
		}
		else {
			// "rootCommitted" always needs the actual root node for the profiler
			// to be able to collect timings. The `_parent` property will
			// point to a vnode for a root node.
			root = vnode;
			while (root._parent!=null) {
				root = root._parent;
			}
		}

		this.pending.push({
			internalInstance: root,
			renderer: this.rid,
			data: getData(root),
			type: 'rootCommitted'
		});

		this.flushPendingEvents();
		return vnode;
	}

	/**
	 * Unmount a vnode recursively. Contrary to mounting or updating unmounting needs
	 * to push the events in parent-first order. Because `options.unmount` is
	 * already fired in parent-first order we don't need to traverse anything here.
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberUnmount(vnode) {
		let inst = getInstance(vnode);
		this.inst2vnode.delete(inst);

		// Special case when unmounting a root (most prominently caused by webpack's
		// `hot-module-reloading`). If this happens we need to unmount the virtual
		// `Fragment` we're wrapping around each root just for the devtools.

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
		return vnode._dom;
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
