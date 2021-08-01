import { MODE_SVG, TYPE_ELEMENT, TYPE_ROOT } from '../constants';
import options from '../options';
import { getDomSibling } from '../tree';
import { setProperty } from './props';
import { applyRef } from './refs';

/**
 * @param {import('../internal').Internal} internal
 * @param {() => void} callback
 */
export function addCommitCallback(internal, callback) {
	if (internal._commitCallbacks == null) {
		internal._commitCallbacks = [];
	}

	internal._commitCallbacks.push(callback);
}

/**
 * @param {import('../internal').CommitQueue} commitQueue List of components
 * which have callbacks to invoke in commitRoot
 * @param {any[]} refs List of refs to call
 * @param {import('../internal').Internal} rootInternal
 */
export function commitRoot(commitQueue, refs, rootInternal) {
	if (options._commit) options._commit(rootInternal, commitQueue);

	// Flush all pending changes to the DOM
	try {
		processOps();
	} catch (err) {
		currentOp = undefined;
		startOp = undefined;
		throw err;
	}

	if (refs.length) {
		for (let i = 0; i < refs.length; i++) {
			const oldRef = refs[i];
			const ref = refs[++i];
			const internal = refs[++i];
			const value = internal._component || internal._dom;
			applyRef(oldRef, ref, value, internal);
		}
	}

	commitQueue.some(internal => {
		try {
			// @ts-ignore Reuse the root variable here so the type changes
			commitQueue = internal._commitCallbacks.length;
			// @ts-ignore See above ts-ignore comment
			while (commitQueue--) {
				internal._commitCallbacks.shift().call(internal._component);
			}
		} catch (e) {
			options._catchError(e, internal);
		}
	});
}

export const OP_CREATE_ELEMENT = 1 << 0;
export const OP_CREATE_TEXT = 1 << 1;
export const OP_SET_TEXT = 1 << 2;
export const OP_INSERT = 1 << 3;
export const OP_REMOVE = 1 << 4;
export const OP_SET_PROP = 1 << 5;
export const OP_REMOVE_PROP = 1 << 6;
export const OP_SET_HTML = 1 << 7;

/** @type {import('../internal').Operation | undefined} */
let currentOp;
/** @type {import('../internal').Operation | undefined} */
let startOp;

/**
 * @param {number} op
 * @param {import('../internal').Internal} internal
 * @param {*} data
 * @param {*} extra
 */
export function op(op, internal, data, extra) {
	/** @type {import('../internal').Operation} */
	const newOp = {
		op,
		internal,
		data,
		extra,
		next: undefined
	};

	internal._effectFlags |= op;

	if (currentOp) {
		currentOp.next = newOp;
	} else {
		startOp = newOp;
	}

	currentOp = newOp;
}

function processOps() {
	while (startOp !== undefined) {
		const opcode = startOp.op;
		const internal = startOp.internal;
		const data = startOp.data;
		const extra = startOp.extra;
		const flags = internal._flags;

		internal._effectFlags &= opcode;

		switch (opcode) {
			/**
			 * @param {Element} data Element type
			 * @param {string} extra Element options
			 */
			case OP_CREATE_ELEMENT:
				internal._dom =
					flags & MODE_SVG
						? document.createElementNS('http://www.w3.org/2000/svg', data)
						: document.createElement(data, extra.is && extra);
				break;

			/**
			 * @param {Element} data DOM element
			 * @param {string} extra Text value
			 */
			case OP_CREATE_TEXT:
				internal._dom = document.createTextNode(data);
				break;

			/**
			 * @param {Element} data DOM element
			 * @param {string} extra Text value
			 */
			case OP_SET_TEXT:
				extra.data = data;
				break;

			/**
			 * @param {Element} data DOM element
			 * @param {string} extra Attribute name
			 */
			case OP_REMOVE_PROP:
				data.removeAttribute(extra);
				break;

			/**
			 * @param {string} data Attribute name
			 * @param {string} extra Attribute value
			 */
			case OP_SET_PROP: {
				let oldValue = internal.props[data];
				setProperty(
					internal._dom,
					data,
					extra,
					oldValue !== extra ? oldValue : null,
					flags & MODE_SVG
				);
				break;
			}

			/**
			 * @param {string} data Optional next sibling node
			 * @param {undefined} extra
			 */
			case OP_INSERT: {
				let parentDom = data ? data.parentNode : undefined;
				if (!parentDom) {
					let p = internal._parent;
					while (!(p._flags & (TYPE_ELEMENT | TYPE_ROOT))) {
						p = p._parent;
					}

					parentDom = p._dom;
				}

				const before = getDomSibling(internal, null);
				parentDom.insertBefore(internal._dom, before);
				break;
			}

			/**
			 * @param {Element} data DOM node to remove
			 * @param {undefined} extra
			 */
			case OP_REMOVE:
				data.remove();
				break;

			/**
			 * @param {string} data HTML string
			 * @param {undefined} extra
			 */
			case OP_SET_HTML:
				internal._dom.innerHTML = data;
				break;
		}

		startOp = startOp.next;
	}

	// Clean up pointers
	currentOp = undefined;
}
