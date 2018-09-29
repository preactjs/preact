import { getData, getChildren, getRoot } from './custom';

/**
 * Custom renderer tailored for Preact. It converts updated vnode trees
 * to events the devtools can understand.
 * @class Renderer
 */
export class Renderer {
	constructor(hook, rid) {
		this.rid = rid;
		this.hook = hook;
		this.pending = [];
		this.seen = new WeakSet();
		this.dom2vnode = new WeakMap();
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
		this.dom2vnode.set(vnode._el, vnode);
		let data = getData(vnode);

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

				this.dom2vnode.set(item._el, item);

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
				if (!this.seen.has(vnode)) this.mount(vnode);
				else this.update(child);
			});
		}

		this.pending.push({
			internalInstance: vnode,
			data,
			renderer: this.rid,
			type: 'update'
		});
	}

	/**
	 * Pass a rendered tree to the devtools. At this point elements have already
	 * unmounted, so we don't need to check for removals and only update vs mount
	 * instead.
	 * @param {import('../internal').VNode} root
	 */
	handleCommitFiberRoot(root) {
		if (this.seen.has(root)) this.update(root);
		else this.mount(root);

		// find the actual root
		root = getRoot(root) || root;

		this.seen.add(root);
		this.markRootCommitted(root);
		this.flushPendingEvents();
	}

	/**
	 * Unmount a vnode recursively
	 * @param {import('../internal').VNode} vnode
	 */
	handleCommitFiberUnmount(vnode) {}

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
	getReactElementFromNative(dom, b) {
		return this.dom2vnode.get(dom);
	}

	// Unused, but devtools expects it to be there
	walkTree() {}

	// Unused, but devtools expects it to be there
	cleanup() {}
}
