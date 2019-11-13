import { Component, toChildArray } from 'preact';
import { suspended } from './suspense.js';

// having custom inheritance instead of a class here saves a lot of bytes
export function SuspenseList() {
	this._next = null;
	this._map = null;
}

const consume = (list, node, vnode) => {
	node.resolved++;

	const order = list.props.revealOrder;
	if (!order) {
		return;
	}

	if (node.resolved === node.suspended) {
		list._map.delete(vnode);
	}
	if (order[0] === 't' && list._map.size) {
		return;
	}

	node = list._next;
	while (node) {
		while (node.callbacks.length) {
			node.callbacks.pop()();
		}
		if (node.resolved < node.suspended) {
			break;
		}
		list._next = node = node.next;
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
	node.suspended++;

	return callback => {
		const finish = () => {
			if (!list.props.revealOrder) {
				callback();
			} else {
				node.callbacks.push(callback);
				consume(list, node, vnode);
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
		consume(list, node, vnode);
	});
};

SuspenseList.prototype.render = function(props) {
	this._next = null;
	this._map = new Map();

	const children = toChildArray(props.children);
	if (props.revealOrder && props.revealOrder[0] === 'b') {
		children.reverse();
	}
	for (let i = children.length; i--; ) {
		this._map.set(
			children[i],
			(this._next = {
				suspended: 1,
				resolved: 0,
				callbacks: [],
				next: this._next
			})
		);
	}
	return props.children;
};
