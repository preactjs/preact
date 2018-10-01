import { getData, getChildren, getRoot, getInstance, hasProfileDataChanged, hasDataChanged } from './custom';
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
		console.log(events)
		this.pending = [];
		for (let i = 0; i < events.length; i++) {
			let event = events[i];
			this.hook.emit(event.type, event);
		}
	}

	/**
	 * Mark the reconciliation of a root tree as done
	 * @param {import('../internal').VNode} vnode
	 */
	markRootCommitted(vnode) {
		this.pending.push({
			internalInstance: vnode,
			renderer: this.rid,
			type: 'rootCommitted'
		});
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
		// TODO: Don't patch vnode directly
		vnode.stateNode = vnode._component!=null ? vnode._component.state : {};

		/** @type {Array<import('../internal').DevtoolsEvent>} */
		let work = [{
			internalInstance: vnode,
			data,
			renderer: this.rid,
			type: 'mount'
		}];

		// Children must be mounted first
		if (Array.isArray(data.children)) {
			let stack = [...data.children];
			let item;
			while ((item = stack.pop())!=null) {
				let children = getChildren(item);
				stack.push(...children);

				this.inst2vnode.set(getInstance(item), item);

				// The Profiler throws if this is not present
				// TODO: Don't patch vnode directly
				item.stateNode = item._component!=null ? item._component.state : {};

				work.push({
					internalInstance: item,
					data: getData(item),
					renderer: this.rid,
					type: 'mount'
				});
			}
		}

		for (let i = work.length; --i>=0;) {
			this.pending.push(work[i]);
		}

		// Special event if we have a root
		if (getRoot(vnode) === vnode) {
			this.pending.push({
				internalInstance: vnode,
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
			data.children.forEach(child => {
				let prevChild = this.inst2vnode.get(getInstance(child));
				if (prevChild==null) this.mount(child);
				else this.update(child);
			});
		}

		let prev = this.inst2vnode.get(getInstance(vnode));

		if (!hasDataChanged(prev, vnode) && hasProfileDataChanged(prev, vnode)) {
			this.pending.push({
				internalInstance: assign(prev, vnode),
				data,
				renderer: this.rid,
				type: 'updateProfileTimes'
			});
		}
		else {
			this.pending.push({
				internalInstance: assign(prev, vnode),
				data,
				renderer: this.rid,
				type: 'update'
			});
		}
	}

	/**
	 * Pass a rendered tree to the devtools. At this point elements have already
	 * unmounted, so we don't need to check for removals and only update vs mount
	 * instead.
	 * @param {import('../internal').VNode} root
	 */
	handleCommitFiberRoot(root) {
		if (this.inst2vnode.has(getInstance(root))) this.update(root);
		else this.mount(root);

		// find the actual root
		root = getRoot(root) || root;

		let inst = getInstance(root);
		if (!this.inst2vnode.has(inst)) {
			this.inst2vnode.set(inst, root);
		}
		this.markRootCommitted(root);
		this.flushPendingEvents();
	}

	/**
	 * Unmount a vnode recursively
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberUnmount(vnode) {
		let inst = getInstance(vnode);
		if (!this.inst2vnode.has(inst)) return;

		this.inst2vnode.delete(inst);
		const isRoot = getRoot(vnode) === vnode;

		/** @type {import('../internal').DevtoolsEvent} */
		const event = {
			internalInstance: vnode,
			renderer: this.rid,
			type: 'unmount'
		};

		if (isRoot) {
			this.pending.push(event);
		}
		else {
			// Non-root fibers are deleted during the commit phase.
			// They are deleted in the child-first order. However
			// DevTools currently expects deletions to be parent-first.
			// This is why we unshift deletions rather than push them.
			this.pending.unshift(event);
		}
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
	walkTree() {}

	// Unused, but devtools expects it to be there
	cleanup() {}
}
