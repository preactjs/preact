import { Component, toChildArray } from 'preact';
import { suspended } from './suspense.js';

// Indexes to linked list nodes (nodes are stored as arrays to save bytes).
const SUSPENDED_COUNT = 0;
const RESOLVED_COUNT = 1;
const NEXT_NODE = 2;

// Having custom inheritance instead of a class here saves a lot of bytes.
export function SuspenseList() {
	this._next = null;
	this._map = null;
}

const resolve = (list, node, vnode) => {
	if (++node[RESOLVED_COUNT] === node[SUSPENDED_COUNT]) {
		// The number a child (or any of its descendants) has been suspended
		// matches the number of times it's been resolved. Therefore we
		// mark the vnode as completely resolved by deleting it from ._map.
		// This is used to figure out when *all* children have been completely
		// resolved when revealOrder is 'together'.
		list._map.delete(vnode);
	}

	// If revealOrder is falsy then we can do an early exit, as the
	// callbacks won't get queued in the node's callbacks anyway.
	// If revealOrder is 'together' then also do an early exit
	// if all suspended descendants have not yet been resolved.
	if (
		!list.props.revealOrder ||
		(list.props.revealOrder[0] === 't' && list._map.size)
	) {
		return;
	}

	// Walk the currently unfinished children in order, calling their
	// stored callbacks on the way. Stop if we encounter a child that
	// has not been completely resolved yet.
	node = list._next;
	while (node) {
		while (node.length > 3) {
			node.pop()();
		}
		if (node[RESOLVED_COUNT] < node[SUSPENDED_COUNT]) {
			break;
		}
		list._next = node = node[NEXT_NODE];
	}
};

// Things we do here to save some bytes but are not proper JS inheritance:
// - call `new Component()` as the prototype
// - do not set `Suspense.prototype.constructor` to `Suspense`
SuspenseList.prototype = new Component();

SuspenseList.prototype._suspended = function(vnode) {
	const list = this;
	const wrapper = suspended(list._vnode);

	let node = list._map.get(vnode);
	node[SUSPENDED_COUNT]++;

	return callback => {
		const finish = () => {
			if (!list.props.revealOrder) {
				callback();
			} else {
				node.push(callback);
				resolve(list, node, vnode);
			}
		};
		if (wrapper) {
			wrapper(finish);
		} else {
			finish();
		}
	};
};

SuspenseList.prototype.componentDidMount = function() {
	const list = this;
	list._map.forEach((node, vnode) => {
		resolve(list, node, vnode);
	});
};

SuspenseList.prototype.render = function(props) {
	this._next = null;
	this._map = new Map();

	const children = toChildArray(props.children);
	if (props.revealOrder && props.revealOrder[0] === 'b') {
		// If order === 'backwards' (or, well, anything starting with a 'b')
		// then flip the child list around so that the last vnode will be
		// the first in the linked list.
		children.reverse();
	}
	// Build the linked list. Iterating through the children in reverse order
	// so that `_next` points to the first linked list node to be resolved.
	for (let i = children.length; i--; ) {
		this._map.set(children[i], (this._next = [1, 0, this._next]));
	}
	return props.children;
};
