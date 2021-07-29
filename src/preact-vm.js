const TYPE_TEXT = 1 << 1;
const TYPE_ELEMENT = 1 << 2;
const TYPE_ROOT = 1 << 3;
const TYPE_COMPONENT = 1 << 4;
const TYPE_CLASS = 1 << 5;
const MODE_SVG = 1 << 6;
const MODE_HYDRATING = 1 << 7;
const MODE_FORCE = 1 << 8;
const FLAGS_DESCEND = MODE_SVG | MODE_HYDRATING | MODE_FORCE;
const HAS_LISTENERS = 1 << 9;
const IS_MISMATCHED = 1 << 10;

// Used for generating monotonic IDs
let vnodeIdCounter = 0;
// let internalIdCounter = 0;

/** @typedef {ReturnType<typeof createElement> | string} VNode */
/** @typedef {ReturnType<typeof op>} Op */

/**
 * Enqueue an operation to run next. If the runloop is currently flushing (executing an operation),
 * this inserts before operations that were already in the queue *before* it started flushing,
 * but *after* any operations inserted *during* the current operation.
 * @example
 *    If the queue contains operations [A, B, C] and is currently executing A,
 *    ops D and E enqueued by A are inserted before B: [A, D, E, B, C]
 * @param {number} op
 * @param {Internal} internal
 * @param {any} [data]
 * @param {string} [extra]
 * @private
 */
function op(op, internal, data, extra) {
	const newOp = {
		op,
		internal,
		data,
		extra,
		next: undefined
	};

	if (currentOp) {
		newOp.next = currentOp.next;
		// The runloop is currently executing an operation. Add ours after the last op enqueued by the current op.
		currentOp.next = newOp;
		currentOp = newOp;
	} else if (ops) {
		newOp.next = ops.next;
		// There was at least one pending operation. Add our operation as the next in the queue:
		ops.next = newOp;
	} else {
		// There were no pending operations. Set ours as the next op and start the run loop again:
		ops = newOp;
		go();
	}
}

//const opCache = [];
//function reclaimOp(op) {
//	op.next = op.internal = op.data = op.extra = undefined;
//	opCache.push(op);
//}

export function createRef() {
	return { current: null };
}

/**
 * Check if a the argument is a valid Preact VNode.
 * @param {*} vnode
 * @returns {vnode is VNode}
 */
export const isValidElement = vnode =>
	vnode != null && vnode.constructor === undefined;

/**
 * For JSX.
 * @param {*} type
 * @param {Record<string, any> | null} props
 * @param {null | *} [c]
 */
export function createElement(type, props, c) {
	if (arguments.length > 3) {
		c = slice.call(arguments, 2);
	}
	if (c != null) {
		let p = { children: c };
		// props = Object.assign({ children: c }, props);
		// props.children = c;
		for (let i in props) {
			if (i !== 'children') p[i] = props[i];
		}
		props = p;
		// props = p;
		// props = Object.assign({}, props);
		// props.children = c;
	}
	let key;
	if (props != null) {
		for (let i in props) {
			let v = props[i];
			if (i === 'key') {
				key = v;
				break;
			}
		}
	}

	const vnode = {
		id: ++vnodeIdCounter,
		type,
		props,
		key,
		constructor: undefined
	};

	if (options.vnode != null) options.vnode(vnode);

	return vnode;
}
const slice = [].slice;

/**
 * @param {VNode} vnode
 * @param {Internal} [parent]
 */

// note: this could be converted to an ES5 class.
// It's a constructor because `new` forces the Internal to be pretenured.
// By contrast, an object factory defaults to local allocation that relies on runtime feedback to infer pretenuring.
// This causes the factory function to be deopted and reoptimized after a period of time, during marking.
class Internal {
	/**
	 * @param {VNode} vnode
	 * @param {Internal | null} [parent]
	 */
	constructor(vnode, parent) {
		let vnodeId = 0,
			/** @type {string | Function | null} */
			type = '',
			props,
			key,
			ref;
		let flags = parent ? parent.flags & FLAGS_DESCEND : 0;
		if (typeof vnode === 'string') {
			// type = '';
			props = vnode;
			flags |= TYPE_TEXT;
		} else {
			vnodeId = vnode.id;
			type = vnode.type;
			// Flags for components vs elements. <Root> gets a special flag, as do class components:
			flags |=
				typeof type === 'function'
					? type === Root
						? TYPE_ROOT
						: TYPE_COMPONENT |
						  (type.prototype && type.prototype.render ? TYPE_CLASS : 0)
					: TYPE_ELEMENT;
			props = {};
			// props = Object.create(null);
			// We clone props here so that mutating `internal.props` doesn't mutate the VNode's props.
			// It's also a fast way to hoist key and ref for fast access as properties of internal.
			key = vnode.key;
			const p = vnode.props;
			if (p) {
				for (let i in p) {
					const v = p[i];
					if (i === 'key') key = v;
					else if (i === 'ref') ref = v;
					else {
						props[i] = v;
					}
				}
			}
		}

		/**
		 * @type {number}
		 * @public
		 */
		this.flags = flags;
		this.type = type;
		this.props = props;
		this.key = key;
		this.ref = ref;
		this.vnodeId = vnodeId;
		this.component = EMPTY_COMPONENT;
		this.context = parent && parent.context;
		this.dom = EMPTY_ELEMENT;
		this.parent = parent;
		// used during diffing to bypass insertions for nodes that are already in-position after removals are processed
		this.nextOp = null;
		// this.child = parent;
		// this.next = parent;
		// this.prev = parent;
		// this.nextSeq = parent;

		// this was meant to pressupply the type for these same-map fields, but it doesn't appear to have any effect on performance:
		// this.child = this.next = this.prev = this.nextSeq = this;
		this.child = this.next = this.prev = this.nextSeq = undefined;
	}
}

function Root() {}
export function Fragment(props) {
	return props.children;
}

/** @param {ParentNode} parent */
export function createRoot(parent) {
	const root = new Internal(createElement(Root, { parent }), null);

	// @ts-ignore we use this for detection
	parent.__k = root;
	return {
		/** @param {VNode} vnode */
		render(vnode) {
			op(OP_RENDER, root, vnode);
		},
		/** @param {VNode} vnode */
		hydrate(vnode) {
			root.flags |= MODE_HYDRATING;
			op(OP_RENDER, root, vnode);
		}
	};
}

/** @param {VNode} vnode @param {ParentNode} parent */
export const render = (vnode, parent) =>
	// @ts-ignore
	(parent.__k || (parent.__k = createRoot(parent))).render(vnode);

export const hydrate = (vnode, parent) =>
	(parent.__k || (parent.__k = createRoot(parent))).hydrate(vnode);

export class Component {
	constructor(props, context) {
		this._internal = null; // this just keeps TypeScript happy
		this.props = props;
		this.context = context;
		this.state = {};
		this._nextState = null;
	}
	setState(update, callback) {
		let s = this._nextState;
		if (!s) this._nextState = s = Object.assign({}, this.state);
		Object.assign(s, typeof update === 'function' ? update(s) : update);
		const internal = this._internal;
		if (internal) {
			op(OP_PATCH, internal, createElement(internal.type, internal.props));
		}
		// if (callback) op(OP_CALLBACK, callback);
	}
	forceUpdate(callback) {
		const internal = this._internal;
		if (internal) {
			internal.flags |= MODE_FORCE;
			op(OP_PATCH, internal, createElement(internal.type, internal.props));
		}
		// if (callback) op(OP_CALLBACK, callback);
	}
	shouldComponentUpdate() {
		return true;
	}
	componentWillReceiveProps() {}
	componentWillMount() {}
	componentDidMount() {}
	componentWillUnmount() {}
	render() {}
}

const EMPTY_COMPONENT = new Component();
const EMPTY_ELEMENT = document.createElement('template');

const OP_RENDER = 1;
const OP_ROOT = 2;
const OP_PATCH = 3;
const OP_PATCH_CHILDREN = 4;
const OP_MOUNT = 5;
const OP_MOUNT_CHILDREN = 6;
const OP_UNMOUNT = 7;
const OP_SET_PROP = 8;
const OP_INSERT = 9;

// for debugging
// const OP_NAMES = [
//   '',
//   'RENDER',
//   'ROOT',
//   'PATCH',
//   'PATCH_CHILDREN',
//   'MOUNT',
//   'MOUNT_CHILDREN',
//   'UNMOUNT',
//   'SET_PROP',
//   'INSERT'
// ];

let ops;
let currentOp;

let count = 0;

const NOOP = {};

/** Starts the main run loop, exits when there is no work left. */
function go() {
	// const start = Date.now();
	while (ops !== undefined) {
		const _op = ops;
		let opcode = _op.op;
		let internal = _op.internal;
		let data = _op.data;
		let extra = _op.extra;
		let dom = internal.dom;
		let props = internal.props;
		let flags = internal.flags;

		currentOp = _op;
		switch (opcode) {
			// switch(_op) {
			// todo: this operation isn't super useful, but might be a good entry point to trigger a component render.
			case OP_RENDER:
				if (internal.type === Root) op(OP_ROOT, internal, data);
				break;

			case OP_ROOT:
				// if given a new parent DOM element to render into, mount:
				let operation = OP_PATCH_CHILDREN;
				if (internal.dom !== props.parent) {
					internal.dom = props.parent;
					operation = OP_MOUNT_CHILDREN;
					// @TODO unmount old children here?:
					// let child = internal.child;
					// while (child) { op(OP_UNMOUNT, child); child = child.next; }
					// internal.child = undefined;
					// op(OP_MOUNT_CHILDREN, internal, data);
				}
				// else {
				//   op(OP_PATCH_CHILDREN, internal, data);
				// }
				op(operation, internal, data);
				break;

			case OP_MOUNT:
				if (flags & (TYPE_TEXT | TYPE_ELEMENT)) {
					if (flags & TYPE_TEXT) {
						internal.dom = document.createTextNode(props);
					} else {
						internal.dom = document.createElement(internal.type);
						let children;
						for (let i in props) {
							if (i === 'key') {
							} else if (i === 'ref') {
							} else if (i === 'children') {
								children = props[i];
							} else {
								op(OP_SET_PROP, internal, props[i], i);
								props[i] = undefined;
							}
						}
						if (children != null) {
							op(OP_MOUNT_CHILDREN, internal, children);
						}
					}
					op(OP_INSERT, internal, internal.prev);
				} else {
					let inst;
					let renderResult;
					let contextType = internal.type.contextType;
					let context = internal.context;
					let callMount = false;
					if (contextType) context = context[contextType.id];
					if (flags & TYPE_CLASS) {
						inst = new internal.type(props, context);
						// internal.component = inst;
						// inst._internal = internal;
						inst.props = props;
						inst.context = context;
						if (!inst.state) inst.state = {};
						if (inst.componentWillMount) inst.componentWillMount();
						renderResult = inst.render(props, inst.state, context);
						callMount = true;
					} else {
						inst = new Component(props, context);
						// internal.component = inst;
						// inst._internal = internal;
						inst.state = {};
						renderResult = internal.type.call(inst, props, context);
					}
					internal.component = inst;
					inst._internal = internal;
					if (callMount && inst.componentDidMount) inst.componentDidMount();
					if (renderResult != null) {
						op(OP_MOUNT_CHILDREN, internal, renderResult);
					}
				}
				// If mounting into a DOM parent, insert into the DOM.
				// @TODO: the tree walk for non-DOM appends here is O(n).
				// Instead, we could always issue OP_INSERT, and have it be a noop for non-DOM internals.

				// if (internal.parent.flags & (TYPE_ELEMENT | TYPE_ROOT)) {
				//   op(OP_INSERT, internal, internal.prev);
				// }
				break;

			case OP_MOUNT_CHILDREN: {
				if (data == null) break;
				let children = [];
				normalizeChildren(data, children);
				let prev;
				for (let i = 0; i < children.length; i++) {
					const vnode = children[i];
					if (vnode != null) {
						const child = new Internal(vnode, internal);
						child.prev = prev;
						if (prev) prev.next = child;
						else prev = internal.child = child;
						prev = child;
						op(OP_MOUNT, child);
					}
				}
				break;
			}

			case OP_UNMOUNT: {
				let skipRemove = data || false;
				// console.log(`${skipRemove?'unmount':'remove'} <${internal.type} key=${internal.key}>`);
				if (flags & TYPE_COMPONENT) {
					const inst = internal.component;
					if (flags & TYPE_CLASS) {
						// unmountClassComponent(inst);
						callMethod(inst, 'componentWillUnmount');
					}
					// if (flags & TYPE_CLASS && inst.componentWillUnmount) {
					//   inst.componentWillUnmount();
					// }
					// Object.defineProperty(inst, '_internal', { value: null });
					inst._internal = undefined;
					// internal.component = undefined;
					internal.component = EMPTY_COMPONENT;
				} else if (flags & TYPE_ELEMENT) {
					if (!skipRemove) {
						skipRemove = true;
						dom.remove();
						// TODO: This breaks logCall in tests
						// remove.call(dom);
						if (flags & HAS_LISTENERS) {
							const listeners = EVENT_LISTENERS.get(dom);
							EVENT_LISTENERS.delete(dom);
							for (let i in listeners) {
								dom.removeEventListener(i, eventProxy);
								// listeners[i] = undefined;
							}
						}
					}

					internal.dom = EMPTY_ELEMENT;
				} else {
					// Must be a Text
					if (!skipRemove) dom.remove();
					internal.dom = EMPTY_ELEMENT;
				}

				let child = internal.child;
				while (child) {
					let next = child.next;
					op(OP_UNMOUNT, child, skipRemove);
					child = next;
				}
				// internal.child = internal.next = internal.prev = internal.parent = internal.nextSeq = internal.context = internal.props = internal.type = undefined;
				internal.child = internal.next = internal.prev = internal.parent = internal.nextSeq = undefined;
				break;
			}

			case OP_PATCH: {
				if (!internal.parent) break;
				if (flags & TYPE_TEXT) {
					if (props !== data) {
						dom.data = internal.props = data;
					}
					break;
				}
				// If the vnode is referentially-equal to the previous render, stop diffing (unless its a forced update):
				if ((flags & MODE_FORCE) === 0 && data.id === internal.vnodeId) {
					// console.log('equality bailout', internal, data);
					break;
				}
				internal.vnodeId = data.id;
				if (flags & TYPE_ELEMENT) {
					const newProps = data.props;
					// internal.props = newProps;
					for (let i in props) {
						if (!(newProps && i in newProps)) {
							// @TODO: handling of key and ref props could be left to OP_SET_PROP for a possible size win:
							if (i === 'key') {
								internal.key = undefined;
							} else if (i === 'ref') {
								internal.ref = undefined;
							} else if (i !== 'children') {
								//props[i] = undefined;
								op(OP_SET_PROP, internal, null, i);
							}
						}
					}
					let children, value;
					for (let i in newProps) {
						value = newProps[i];
						// @TODO: handling of key and ref props could be left to OP_SET_PROP for a possible size win:
						if (i === 'key') {
							internal.key = value;
						} else if (i === 'ref') {
							internal.ref = value;
						} else if (i === 'children') {
							children = value;
						} else if (value !== props[i]) {
							//props[i] = value;
							op(OP_SET_PROP, internal, value, i);
						}
					}
					if (children != null || internal.child) {
						op(OP_PATCH_CHILDREN, internal, children);
					}
					break;
				}
				let renderResult;
				const inst = internal.component;
				// const nextProps = internal.props;
				const prevProps = internal.props;
				const prevState = inst.state;
				const nextProps = data.props;
				internal.props = nextProps;
				// @TODO: do we need to propagate `props.key` to `internal.key` here?
				const nextState = inst._nextState || inst.state;
				let contextType = internal.type.contextType;
				let context = internal.context;
				if (contextType) context = context[contextType.id];
				callMethod(inst, 'shouldComponentUpdate', nextProps, nextState);
				// if (inst.shouldComponentUpdate && !inst.shouldComponentUpdate(nextProps, nextState)) {
				//   break;
				// }
				if (inst.componentWillUpdate)
					inst.componentWillUpdate(nextProps, nextState);
				inst.props = nextProps;
				inst.state = nextState;
				// console.log('rendering component', inst.type, internal.key);
				if (flags & TYPE_CLASS) {
					// if (typeof inst.render === 'function') {
					//   const r = inst.render;
					//   renderResult = r.call(inst, nextProps, nextState, context);
					// }
					renderResult = inst.render(nextProps, nextState, context);
				} else {
					renderResult = internal.type.call(inst, nextProps, context);
				}
				if (inst.componentDidUpdate)
					inst.componentDidUpdate(prevProps, prevState);
				let childContext = internal.context;
				if (inst.getChildContext)
					childContext = Object.assign(
						{},
						childContext,
						inst.getChildContext()
					);
				op(OP_PATCH_CHILDREN, internal, renderResult, childContext);
				break;
			}

			case OP_PATCH_CHILDREN: {
				let child = internal.child;

				// possible new context object, passed down from a parent component:
				let incomingContext = extra;
				let children = [];
				if (data != null) normalizeChildren(data, children);

				// The maximum index we will attempt to access and diff within `children`:
				let max = children.length - 1;

				// Optimization: when all children are removed, skip normalization and iteration
				if (max === -1) {
					internal.child = undefined;
					while (child) {
						let next = child.next;
						// child.next = child.prev = child; // @TODO this is annoying
						child.next = child.prev = undefined;
						// console.log('unmount mode 1');
						op(OP_UNMOUNT, child);
						child = next;
					}
					break;
				}

				// Single incoming child
				if (max === 0) {
					const vnode = children[0];
					let foundMatch = false;
					while (child) {
						const next = child.next;
						const isMatch =
							child.flags & TYPE_TEXT
								? typeof vnode === 'string'
								: typeof vnode === 'object' &&
								  (vnode.id === child.vnodeId ||
										// (child.flags & (typeof vnode.type === 'string' ? TYPE_ELEMENT : TYPE_COMPONENT)) &&
										// (child.flags & TYPE_ELEMENT ? 'string' : 'function') === typeof vnode.type &&
										(typeof child.type === typeof vnode.type &&
											child.type === vnode.type &&
											child.key === vnode.key));
						let patchOp = OP_UNMOUNT;
						let data;
						child.next = child.prev = undefined;
						if (isMatch) {
							foundMatch = true;
							patchOp = OP_PATCH;
							data = vnode;
							internal.child = child;
							if (incomingContext) child.context = incomingContext;
						} else {
							// console.log('unmount mode 2');
							// child.next = child.prev = undefined;
							// child.next = child.prev = child;
						}
						op(patchOp, child, data);
						child = next;
					}
					if (!foundMatch) {
						child = new Internal(vnode, internal);
						internal.child = child;
						if (incomingContext) child.context = incomingContext;
						op(OP_MOUNT, child);
					}
					break;

					// // if we failed to match, fall through to full diffing for child creation
					// if (foundMatch) break;
				}

				let keyed = new Map();
				// keyed.set(null, EMPTY_INTERNAL);

				// Unkeyed Internals form a singly-linked list (via `.nextSeq`).
				// `unkeyed is the first unkeyed internal, `lastUnkeyed` is the last.
				// let unkeyed;
				// let lastUnkeyed;
				// NOTE: we initialize these to `internal` to seed type info
				let unkeyed = internal;
				let lastUnkeyed = internal;
				lastUnkeyed.nextSeq = internal;
				lastUnkeyed.nextSeq = undefined;
				// unkeyed.nextSeq = lastUnkeyed.nextSeq = internal;
				// lastUnkeyed.nextSeq = unkeyed = lastUnkeyed = undefined;

				let index = 0;

				// When in-place matches are found at the start and/or end, we skip them in the second loop:
				let start = 0;
				let end = 0;

				let startChild = child; // @TODO useless?
				// Normally, the last Internal get a `.next` value of `undefined`.
				// However, if we skip unchanged tail Internals, the last Internal we diff
				// must instead have `.next` point to the first unchanged tail Internal.
				let endChild;
				// During both iterations, `prev` is the Internal from the previous iteration:
				let prev;

				while (child) {
					const next = child.next;
					const flags = (child.flags |= IS_MISMATCHED); // Note: we preemptively set mismatched=TRUE
					const key = child.key;
					const vnodeId = child.vnodeId;
					let vnode,
						isMatch = false;
					if (index <= max) {
						vnode = children[index];
						isMatch =
							flags & TYPE_TEXT
								? typeof vnode === 'string'
								: typeof vnode === 'object' &&
								  (vnode.id === vnodeId ||
										(child.type === vnode.type && key === vnode.key)); // @TODO do we care about key={null}?
					}

					if (isMatch) {
						// Flip mismatched back to FALSE to mark as in-place match:
						child.flags &= ~IS_MISMATCHED;

						// Note: an in-place match means we already have correct next/prev pointers!

						if (incomingContext) child.context = incomingContext;
						op(OP_PATCH, child, vnode);

						// If we haven't encountered a non-match yet, move the start pointers forward.
						// This is how the second "out of order" pass skips the unchanged head Internals.
						if (index === start) {
							start++;
							prev = child;
							startChild = next;
						} else if (index <= max) {
							// @TODO: This is probably worth changing, since it likely later deopts.
							//        It replaces the VNode for in-place matches that are *not* head/tail matches with
							//        the matched Internal, which is used as a signal to skip this node in the second pass.
							// Note:  The Internal is used here both as an indicator value, *and*
							//        because the second pass needs to reference it to update its pointers.
							children[index] = child;
						}

						// @TODO The in-place logic here does not handle removal from the middle.
						// Doing so might be easier with `internal.lastChild` for backward traversal?
						// Or, after the first non-matching *head* item, start looking at (max-len + index) (may need internal.childCount).
						//else if (index === end) end--;
					} else {
						// flags |= IS_MISMATCHED;
						// child.flags |= IS_MISMATCHED;
						// child.flags = flags | IS_MISMATCHED;

						// The *last* non-match is our end index (start of tail):
						end = index;
						endChild = child.next;

						if (key == null) {
							// if (unkeyed === EMPTY_INTERNAL) unkeyed = child;
							// else lastUnkeyed.nextSeq = child;
							// if (unkeyed === internal) unkeyed = child;
							// else lastUnkeyed.nextSeq = child;
							// if (lastUnkeyed) lastUnkeyed.nextSeq = child;
							// else unkeyed = child;
							lastUnkeyed.nextSeq = child;
							lastUnkeyed = child;
						} else {
							keyed.set(key, child);
						}
					}

					// child.flags = flags;
					index++;
					child = next;
				}

				// if (internal.type === 'ul') {
				//   debugger;
				// }

				child = startChild;
				child = undefined;
				if (end > max || index < max + 1) {
					end = max;
					endChild = undefined; // @TODO verify - only makes sense if there was no in-place tail?
				}

				for (index = start; index <= end; index++) {
					const vnode = children[index];
					const type = typeof vnode;
					let prevMatch, nextMatch, key;
					child = undefined;

					// This is not great (see note in first loop - patched-in-place vnodes are replaced with their internal):
					if (type === 'object' && 'vnodeId' in vnode) {
						// For in-place matches that weren't head/tail, all we need to do is update pointers:
						child = vnode;
					} else {
						if (type === 'string') {
							// find the next Text Internal (which cannot be keyed):
							child = unkeyed;
							while (child) {
								nextMatch = child.nextSeq;
								if (child.flags & TYPE_TEXT && child !== internal) {
									prevMatch.nextSeq = nextMatch;
									// if (prevMatch) prevMatch.nextSeq = nextMatch;
									// else prevMatch = unkeyed = nextMatch;
									child.nextSeq = undefined;
									break;
								}
								prevMatch = child;
								child = nextMatch;
								// child = nextMatch === child ? undefined : nextMatch;
							}
						} else if ((key = vnode.key) == null) {
							// Find the next unkeyed Internal with matching `type`:
							child = unkeyed;
							while (child) {
								nextMatch = child.nextSeq;
								if (child.type === vnode.type && child !== internal) {
									prevMatch.nextSeq = nextMatch;
									// if (prevMatch) prevMatch.nextSeq = nextMatch;
									// else prevMatch = unkeyed = nextMatch;
									child.nextSeq = undefined;
									break;
								}
								prevMatch = child;
								child = nextMatch;
								// child = nextMatch === child ? undefined : nextMatch;
							}
						} else {
							// Find and claim the keyed Internal (as long as it has the correct `type`):
							child = keyed.get(key);
							if (child && child.type === vnode.type) {
								keyed.delete(key);
							} else {
								child = undefined;
							}
						}

						let inserted = false;
						if (child) {
							// Mark the internal as no longer mismatched since it's now in the correct sequence order:
							child.flags &= ~IS_MISMATCHED;
							// if (child.flags & WILL_BE_MOVED) child.flags ^= WILL_BE_MOVED;

							// We found a match! Trigger patching on it:
							if (incomingContext) child.context = incomingContext;
							op(OP_PATCH, child, vnode);

							// If the match is in the wrong spot, insert it into the right one.
							// Note: we walk backwards over any mismatched internals here that haven't yet been put in-place.
							// At this point, any earlier mismatched items are either removed or have been moved to later in the list.
							let prevInPlace = child;
							while (
								(prevInPlace = prevInPlace.prev) &&
								prevInPlace.flags & IS_MISMATCHED
							);
							// let prevInPlace = child.prev;
							// while (prevInPlace && prevInPlace.flags & IS_MISMATCHED) {
							//   prevInPlace = prevInPlace.prev;
							// }
							if (prevInPlace !== prev) {
								op(OP_INSERT, child, prev);
								inserted = true;
							}
						} else {
							// No match was found, so we're creating and mounting a new Internal:
							child = new Internal(vnode, internal);
							if (incomingContext) child.context = incomingContext;
							// console.log('create@'+i+' ', match.key, 'after', prev && prev.key);
							op(OP_MOUNT, child);
							inserted = true;
						}
					}

					if (prev) prev.next = child;
					else internal.child = child;
					child.prev = prev;
					prev = child;
				}

				if (prev) prev.next = endChild;
				if (endChild) endChild.prev = prev;

				// Unmount any remaining unkeyed & keyed Internals:
				let keyedValues = keyed.values();

				while (unkeyed || (unkeyed = keyedValues.next().value)) {
					// while (unkeyed && unkeyed !== internal) {
					// while (unkeyed) {
					let nextSeq = unkeyed.nextSeq;
					unkeyed.nextSeq = undefined;

					prev = unkeyed.prev;

					op(unkeyed === internal ? 0 : OP_UNMOUNT, unkeyed);
					unkeyed = nextSeq;
				}

				internal.nextSeq = undefined;
				// EMPTY_INTERNAL.nextSeq = undefined;
				break;
			}

			case OP_INSERT: {
				let after;
				if (internal.prev) {
					after = getLastDom(internal.prev);
				}

				let parent, before;
				if (after) {
					parent = after.parentNode;
					before = after.nextSibling;
				} else {
					// walk up to the next sibling in the parent and search from there
					let p = internal;
					while ((p = p.parent)) {
						if (p.flags & (TYPE_ELEMENT | TYPE_ROOT)) {
							if (!parent) {
								parent = p.dom;
								before = parent.firstChild;
							}
							break;
						}
						let prev = p.prev;
						if (prev) {
							after = getLastDom(prev);
							if (after) {
								parent = after.parentNode;
								before = after.nextSibling;
								break;
							}
						}
					}
				}

				if (flags & (TYPE_TEXT | TYPE_ELEMENT)) {
					parent.insertBefore(dom, before);
					// TODO: This breaks logCalls in tests
					// insertBefore.call(parent, dom, before);
				} else {
					// Inserting a Component/Fragment inserts its outermost DOM children:
					// let roots = [];
					// getDomRoots(internal, roots);
					// console.log('inserting', internal, roots, before);
					insertDomRoots(internal, parent, before);
				}
				break;
			}

			case OP_SET_PROP: {
				// Note: for SET_PROP, `extra` is the prop name, `data` is the value.
				let name = extra === 'class' ? 'className' : extra;

				// @TODO: weirdly never ended up needing the old value:
				let oldData = props[extra];
				props[extra] = data;

				if (name === 'style' && typeof data !== 'string') {
					if (typeof oldData == 'string') {
						dom.style.cssText = oldData = '';
					}

					if (oldData) {
						for (name in oldData) {
							if (!(data && name in data)) {
								setStyle(dom.style, name, '');
							}
						}
					}

					if (data) {
						for (name in data) {
							if (!oldData || data[name] !== oldData[name]) {
								setStyle(dom.style, name, data[name]);
							}
						}
					}
					break;
				}

				if (name[0] === 'o' && name[1] === 'n') {
					// If the lower-cased event name is defined as a property, we use that name instead:
					// (`onClick` --> 'onclick' in dom === true --> use 'click')
					let lc = name.toLowerCase();
					name = lc in dom ? lc.slice(2) : name.slice(2);

					if (!oldData) {
						dom.addEventListener(name, eventProxy);
						// dom.removeEventListener(name, oldData);
					} else if (!data) {
						dom.removeEventListener(name, eventProxy);
						// dom.addEventListener(name, data);
					}

					// getListeners(dom)[name] = data;
					// dom.l[name] = data;
					let listeners = EVENT_LISTENERS.get(dom);
					if (!listeners) {
						listeners = {};
						EVENT_LISTENERS.set(dom, listeners);
					}
					listeners[name] = data;
					break;
				}

				if (flags & MODE_SVG) {
					// Normalize xlinkHref and className to class
					name = name.replace(/xlink[H:h]/, 'h').replace(/sName$/, 's');
				}
				// else if (name === 'className') {
				// 	dom.className = data;
				// }
				else if (name in dom) {
					// Note that we don't take this branch for SVG (we always set attributes)
					if (setUserProperty(dom, name, data)) break;
					// try {
					//   // if setting as a property succeeds, we're done:
					//   dom[name] = data;
					//   break;
					// } catch (e) {}
				}
				// Finally, set as an attribute. This means either we're in SVG mode,
				// or the prop name wasn't defined as a property of the element, or assigning to it threw.
				if (typeof data !== 'function') {
					if (extra === 'dangerouslySetInnerHTML') {
						if (data) {
							const value = data.__html;
							if (
								!oldData ||
								(value !== oldData.__html && value !== dom.innerHTML)
							) {
								dom.innerHTML = value;
							}
						} else if (oldData) {
							dom.innerHTML = '';
						}
					} else if (data == null || data === false) {
						dom.removeAttribute(name);
					} else dom.setAttribute(name, data);
				}
				break;
			}
		}

		// if (ops === current) ops = ops.next;
		// if (ops === NOOP) ops = undefined;
		// let old = ops;
		currentOp = ops = ops.next;
		// reclaimOp(old);
	}
}

// TODO: These break logCall in tests
// const insertBefore = Element.prototype.insertBefore;
// const remove = Element.prototype.remove;
// const removeText = Text.prototype.remove;

// const componentWillUnmount = 'componentWillUnmount';
function unmountClassComponent(inst) {
	try {
		if (typeof inst.componentWillUnmount !== 'undefined') {
			inst.componentWillUnmount();
		}
	} catch (e) {}
	// try {
	//   if (inst instanceof Component && inst[componentWillUnmount]) {
	//     inst[componentWillUnmount]();
	//   }
	// } catch (e) {}
}

let set = false;
function setUserProperty(dom, property, value) {
	set = false;
	try {
		dom[property] = value;
		set = true;
	} catch (e) {}
	return set;
}

let _method;
function callMethod(inst, method, a, b) {
	_method = String(method);
	if (typeof inst[_method] !== 'undefined') {
		return inst[_method](a, b);
	}
}

/**
 * Style property application
 * Optimization Attempts:
 *   - create memoized property setters for each new style object key
 *   - create global property setters for each name in CSSStyleDeclaration
 *   - the above two, but using `new Function()`+globals instead of closures+arguments
 *   - calling CSSStyleDeclaration.setProperty as a generic
 */

const CSSPROP = /(?=[A-Z])/g;
const nmap = { __proto__: null };

/**
 * @param {*} style
 * @param {string} key
 * @param {string | number | null | undefined} value
 */
function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	} else if (value == null) {
		style[key] = '';
	} else {
		style[key] = value;
	}
}

// Insert the outermost DOM elements rooted at a given Internal before an element
function insertDomRoots(internal, parent, before) {
	if (internal.flags & (TYPE_TEXT | TYPE_ELEMENT)) {
		parent.insertBefore(internal.dom, before);
		// TODO: This breaks logCalls in tests
		// insertBefore.call(parent, internal.dom, before);
	} else {
		let child = internal.child;
		while (child) {
			insertDomRoots(child, parent, before);
			child = child.next;
		}
	}
}

function getLastDom(internal) {
	if (internal.flags & (TYPE_TEXT | TYPE_ELEMENT)) {
		return internal.dom;
	}
	// DFS starting from *last* child
	let child = internal.child;
	if (child) {
		let next;
		while ((next = child.next)) child = next;
		const d = getLastDom(child);
		if (d) return d;
	}
	// advance to prev
	const prev = internal.prev;
	if (prev) {
		const d = getLastDom(prev);
		if (d) return d;
	}
}

function getDomParent(internal) {
	while ((internal = internal.parent)) {
		if (internal.flags & (TYPE_ELEMENT | TYPE_ROOT)) {
			// return internal.dom;
			return internal;
		}
	}
}

function getFirstDom(internal) {
	if (internal.flags & (TYPE_TEXT | TYPE_ELEMENT)) {
		return internal.dom;
	}
	const child = internal.child;
	if (child) {
		const d = getFirstDom(child);
		if (d) return d;
	}
	const next = internal.next;
	if (next) {
		return getFirstDom(next);
	}
}

// const getListeners = new Function('dom', 'return dom.l || (dom.l={})');

const EVENT_LISTENERS = new WeakMap();

function eventProxy(e) {
	return EVENT_LISTENERS.get(this)[e.type](e);
}
// function eventProxy(e) { return this.l[e.type](e) }

const EMPTY_ARR = [];
let j = 0,
	prev = false,
	buf = EMPTY_ARR;
function normalizeChildren(children, normalized) {
	if (!Array.isArray(children)) {
		if (children != null) {
			// TODO: Test bigint and booleans
			if (typeof children !== 'object') {
				children = String(children);
			}
			normalized.push(children);
		}
		return;
	}
	buf = normalized;
	j = -1;
	// let i = children.length;
	prev = false;
	_normalize(children);
	// while (j < --i) children.pop();
	// while (j < --i) pop.call(children);
	buf = EMPTY_ARR;
}
// const pop = EMPTY_ARR.pop;
function _normalize(children) {
	for (let i = 0; i < children.length; i++) {
		const c = children[i];
		const isText = c != null && typeof c !== 'object';
		if (isText && prev) buf[j] += String(c);
		else if (Array.isArray(c)) _normalize(c);
		// Function children are invalid during rendering
		else if (typeof c === 'function') continue;
		else buf[++j] = (prev = isText) ? String(c) : c;
	}
}

export const options = {};
