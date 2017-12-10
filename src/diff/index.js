import { TEXT_NODE } from '../constants';
// import { assign } from '../util';
import { createVNode /*, reclaimVNode*/ } from '../create-element';
import { diffChildren, create } from './children';
import { diffProps } from './props';

const mounts = [];
let diffLevel = 0;

export function diff(dom, parent, newTree, oldTree, context, isSvg) {
	// console.log(oldTree, newTree);
	let c, isNew = false, oldProps, oldState, oldContext,
		oldTag = oldTree!=null ? oldTree.tag : oldTree;
	
	// root of a diff:
	if (diffLevel++ === 0) {
		isSvg = parent!=null && parent.ownerSVGElement!==undefined;
	}
	
	if (newTree.tag!==oldTag) {
		// console.log('mismatched tags: ', oldTag, newTree.tag);
		if (typeof oldTag==='function') {
			unmount(oldTree);
		}
		if (typeof newTree.tag==='function') {
			mount(newTree);
		}
	}
	if (typeof newTree.tag==='function') {
		if (typeof oldTag==='function' && oldTag!==newTree.tag) {
			unmount(oldTree);
			oldTree = null;
			// oldTree._component.componentWillUnmount();
			// oldTree._component.base = null;
			// if (oldTree.props.ref!=null) {
			// 	oldTree.props.ref(null);
			// }
		}
		if (oldTree!=null && oldTree._component) {
			c = newTree._component = oldTree._component;
			// console.log('updating component in-place');
			let s = c.nextState || c.state;
			if (c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, s)===false) {
				return newTree._el = c.base;
			}
			if (c.componentWillReceiveProps!=null) {
				c.componentWillReceiveProps(newTree.props, s, context);
			}
		}
		else {
			isNew = true;
			c = newTree._component = new newTree.tag(newTree.props, context);
			c.props = newTree.props;
			if (!c.state) c.state = {};
			c.context = context;
			if (c.componentWillMount!=null) c.componentWillMount();
			mounts.push(c);
			// if (dom == null && newTree.tag.$cache!=null) {
			// 	dom = newTree.tag.$cache.pop();
			// }
			// if (dom==null && newTree.tag.$precache!=null) {
			// 	if (newTree.tag.$cache==null) {
			// 		let t = document.createElement('template');
			// 		newTree.tag.$cache = newTree.tag.$precache.cloneNode(true);
			// 		t.appendChild(newTree.tag.$cache);
			// 	}
			// 	dom = newTree.tag.$cache.cloneNode(true);
			// }
		}

		oldProps = c.props;
		oldState = c.state;
		oldContext = c.context;
		c.props = newTree.props;
		if (c.nextState!=null) {
			c.state = c.nextState;
			c.nextState = null;
		}
		c.context = context;
		let prev = c._previousVTree;
		let vnode = c._previousVTree = c.render(c.props, c.state, c.context);
		if (c.getChildContext!=null) {
			// context = assign(assign({}, context), c.getChildContext());
			context = Object.assign({}, context, c.getChildContext());
		}
		c.base = diff(dom, parent, vnode, prev, context, isSvg);
		c._dirty = false;
		// newTree.tag.$precache = c.base;
		c.vnode = newTree;
		if (dom!=null && c.base!==dom) {
			parent.replaceChild(c.base, dom);
		}
		dom = newTree._el = c.base;
	}
	else {
		dom = newTree._el = diffElementNodes(dom, parent, newTree, oldTree, context, isSvg);
		if (c!=null) {
			c.base = newTree._el;
			if (isNew) {
				if (c.componentDidMount!=null) c.componentDidMount();
			}
			else {
				c.componentDidUpdate(oldProps, oldState, oldContext);
			}
		}
	}
	if (--diffLevel===0) {
		while ((c = mounts.pop())) {
			if (c.componentDidMount!=null) c.componentDidMount();
		}
	}
	// if (oldTree!=null && oldTree!==newTree) reclaimVNode(oldTree);
	return dom;
}

function diffElementNodes(dom, parent, vnode, oldVNode, context, isSvg) {
	let d = dom;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = vnode.tag === 'svg' ? true : vnode.tag === 'foreignObject' ? false : isSvg;

	if (dom==null || vnode.tag!==(oldVNode==null?null:oldVNode.tag)) {
		return create(dom, parent, vnode, isSvg);
		// dom = create(dom, parent, vnode);
		// dom = vnode.type===3 ? document.createTextNode(vnode.text) : document.createElement(vnode.tag);
		// if (d) {
		// 	parent.replaceChild(dom, d);
		// 	while (d.firstChild) dom.appendChild(d.firstChild);
		// }
	}
	if (vnode.type===3) {
		if (dom===d) {
			let text = String(vnode.text);
			if (text!==String(oldVNode.text)) {
				dom.nodeValue = text;
			}
		}
	}
	else {
		diffChildren(dom, getVNodeChildren(vnode), getVNodeChildren(oldVNode), null, context, isSvg);
		diffProps(dom, vnode.props, oldVNode.props, isSvg);
	}
	return dom;
}


export function unmount(vnode) {
	let r;
	if (vnode.props!=null && (r = vnode.props.ref)) r(null);
	if ((r = vnode._el)) r.remove();
	vnode._el = null;
	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) r.componentWillUnmount();
		// let ctor = r.constructor;
		// let cache = ctor.$cache || (ctor.$cache = []);
		// cache.push(r.base);
		r.base = null;
	}
}

export function mount(vnode) {
	let r;
	if (vnode.props!=null && (r = vnode.props.ref)) r(vnode._component!=null ? vnode._component : vnode._el);
	if ((r = vnode._component)) {
		if (r.componentWillMount) r.componentWillMount();
		r.base = vnode._el;
	}
}


/*
function getVNodeChildren(vnode) {
	if (vnode._children) return vnode._children;
	let list = [],
		stack = vnode.children.slice(),
		key = 0,
		child,
		type;
	while (stack.length) {
		child = stack.pop();
		if (child && child.pop!==undefined) {
			while (child.length) stack.push(child.pop());
		}
		else {
			type = typeof vnode;
			if (type!=='object' && type!=='function') {
				child = createVNode(TEXT_NODE, null, null, null, child, key);
			}
			else if (!child.key) {
				child.key = key;
			}
			list.push(child);
			key++;
		}
	}
	return vnode._children = list;
}
*/


export function getVNodeChildren(vnode) {
	if (vnode._children!=null) {
		return vnode._children;
	}
	let children = vnode._children = [];
	flattenChildren(vnode.children, children, null, 0);
	return children;
}


function flattenChildren(children, flattened, path, index) {
	let key = path==null ? '' : `${path}.${index}`,
		i = 0,
		child,
		type = typeof children;
	if (children==null) {}
	else if (type==='object' && 'pop' in children) {
		for (; i < children.length; i++) {
			flattenChildren(children[i], flattened, key, i);
		}
	}
	else if (type==='object' && Symbol.iterator in children) {
		while ((child = children.next()).done !== true) {
			flattenChildren(child.value, flattened, key, i++);
		}
	}
	else {
		if (type!=='object' && type!=='function') {
			children = createVNode(TEXT_NODE, null, null, null, children, key);
		}
		else if (children.key == null) {
			children.key = key;
		}
		flattened.push(children);
	}
}

// function flattenChildren(children) {
// 	let stack = [children],
// 		result = [],
// 		child;

// 	while (stack.length) {
// 		let item = stack.pop();
// 		if (item && 'pop' in item) {
// 			for (let i=0; i<item.length; i++) stack.push(item[i]);
// 		}
// 		else if (item && Symbol.iterator in item) {
// 			while ((child = item.next()).done!==true) {
// 				stack.push(child.value);
// 			}
// 		}
// 		else {
// 			result.push(item);
// 		}
// 	}

// 	return result.reverse();
// }