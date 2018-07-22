import { TEXT_NODE, EMPTY_OBJ, EMPTY_ARR } from '../constants';
// import { assign } from '../util';
import { Component /* , enqueueRender */ } from '../component';
import { createVNode /*, reclaimVNode*/ } from '../create-element';
import { diffChildren /*, create */ } from './children';
import { diffProps } from './props';
import { assign } from '../util';
// import { toVNode } from '../render';
// import { processQueue } from '../component';

// let hash = [
// 	['type', ['number']],
// 	['tag', [null,'string','function']],
// 	['props', ['object']],
// 	['children', ['object']],
// 	['text', ['string', null]],
// 	['key', [null,'string']],
// 	['index', [null,'number']],
// 	['_children', ['object']],
// 	['_el', ['object']],
// 	['_component', ['object']]
// ];

// function assertIsPureVNode(obj) {
// 	let index = 0;
// 	for (let i in obj) {
// 		let p = hash[index];
// 		if (i!==p[0]) return console.error('VNode property error ('+i+' !== '+p[0]+')');
// 		let isMatch = false;
// 		for (let j=0; j<p[1].length; j++) {
// 			if (obj[i]==p[1][j] || typeof obj[i]===p[1][j]) {
// 				isMatch = true;
// 				break;
// 			}
// 		}
// 		if (!isMatch) return console.error('VNode type error ('+i+' !~ '+p[1]+'): ', obj[i]);
// 		index++;
// 	}
// }

// const IDLE_OPTIONS = { timeout: 100 };
// let idleQueue = [];
// // let queuePopulated = false;
// // let queueIndex = 0;
// function processIdleQueue() {
// 	let p;
// 	// let processed = 0;
// 	let time = Date.now();
// 	while (Date.now()-time<30 && idleQueue.length!==0) {
// 		if ((p = idleQueue.pop())) {
// 			// eslint-disable-next-line prefer-spread
// 			diff.apply(null, p);
// 			// processed++;
// 		}
// 	}

// 	// if (processed) console.log(processed);

// 	if (idleQueue.length) {
// 		requestIdleCallback(processIdleQueue, IDLE_OPTIONS);
// 	}

// 	// if (queueIndex>=idleQueue.length-1) {
// 	// 	queuePopulated = false;
// 	// 	queueIndex = idleQueue.length = 0;
// 	// }
// 	// else {
// 	// 	requestIdleCallback(processIdleQueue, IDLE_OPTIONS);
// 	// }

// 	// // let len = idleQueue.length;
// 	// // console.log('emptying queue ('+queueIndex+' - '+idleQueue.length+')');
// 	// for ( ; queueIndex<idleQueue.length && !c.didTimeout; queueIndex++) {
// 	// 	// eslint-disable-next-line prefer-spread
// 	// 	diff.apply(null, idleQueue[queueIndex]);
// 	// }
// 	// if (queueIndex>=idleQueue.length-1) {
// 	// 	queuePopulated = false;
// 	// 	queueIndex = idleQueue.length = 0;
// 	// }
// 	// else {
// 	// 	requestIdleCallback(processIdleQueue, IDLE_OPTIONS);
// 	// }
// }


export function diff(dom, parent, newTree, oldTree, context, isSvg, append, excessChildren, diffLevel, mounts) {
	if (newTree==null) {
		if (oldTree!=null) {
			unmount(oldTree);
		}
		return null;
	}

	// if (dom!=null && now!==true) {
	// 	// console.log('queueing');

	// 	for (let i=0; i<idleQueue.length; i++) {
	// 		if (idleQueue[i]!=null && idleQueue[i][0]===dom) {
	// 			idleQueue[i] = null;
	// 			break;
	// 		}
	// 	}
	// 	if (idleQueue.push([dom, parent, newTree, oldTree, context, isSvg, true])===1) {
	// 		requestIdleCallback(processIdleQueue, IDLE_OPTIONS);
	// 	}

	// 	// let entry = [dom, parent, newTree, oldTree, context, isSvg, true];
	// 	// for (let i=queueIndex; i<idleQueue.length; i++) {
	// 	// 	if (idleQueue[i][0]===dom) {
	// 	// 		console.log('found earlier entry at '+i+' instead of '+idleQueue.length, dom);
	// 	// 		idleQueue[i] = entry;
	// 	// 		entry = null;
	// 	// 		break;
	// 	// 	}
	// 	// }
	// 	// if (entry!=null) idleQueue.push(entry);
	// 	// if (queuePopulated===false) {
	// 	// 	queuePopulated = true;
	// 	// 	requestIdleCallback(processIdleQueue, IDLE_OPTIONS);
	// 	// }

	// 	// setTimeout(processIdleQueue);
	// 	// requestIdleCallback( () => {
	// 	// 	let out = diff(dom, parent, newTree, oldTree, context, isSvg, true);
	// 	// 	if (out!==dom) {
	// 	// 		console.log('replacing ', dom, ' with ', out);
	// 	// 	}
	// 	// 	// if (out==null) dom.remove();
	// 	// 	// else dom.parentNode.replaceChild(out, dom);
	// 	// }, IDLE_OPTIONS);
	// 	return newTree._el = dom;
	// 	// return newTree._el = dom;
	// }

	let originalDom = dom,
		originalOldTree = oldTree;

	// if (newTree==null) {
	// 	newTree = createVNode(3, null, null, null, '', null);
	// 	// return;
	// 	// let c = document.createComment('empty');
	// 	// if (parent!=null) {
	// 	// 	if (dom!=null) parent.replaceChild(c, dom);
	// 	// 	else parent.appendChild(c);
	// 	// }
	// 	// if (oldTree!=null) unmount(oldTree);
	// 	// return c;
	// }

	// assertIsPureVNode(newTree);
	// console.log(oldTree, newTree);

	let c, p, isNew = false, oldProps, oldState, oldContext,
		newTag = newTree.tag,
		oldTag = oldTree!=null ? oldTree.tag : null;

	// root of a diff:
	if (diffLevel++ === 0) {
		isSvg = parent!=null && parent.ownerSVGElement!==undefined;
	}

	// @TODO unmounting here removes the dom pointer
	// if (newTree.tag!==oldTag) {
	// 	// console.log('mismatched tags: ', oldTag, newTree.tag);
	// 	if (typeof oldTag==='function') {
	// 		unmount(oldTree);
	// 	}
	// 	if (typeof newTree.tag==='function') {
	// 		mount(newTree);
	// 	}
	// }

	outer: if (typeof newTag==='function') {
		if (typeof oldTag==='function' && oldTag!==newTag) {
			// unmount(oldTree);
			oldTree = null;
			// oldTree._component.componentWillUnmount();
			// oldTree._component.base = null;
			// if (oldTree.props.ref!=null) {
			// 	oldTree.props.ref(null);
			// }
		}
		if (oldTree!=null && oldTree._component) {
			c = newTree._component = oldTree._component;

			// let nextState = c.state;
			// if (c.prevState!=null) {
			// 	c.state = c.prevState;
			// 	c.prevState = null;
			// }

			let s = c._nextState || c.state;
			if (newTag.getDerivedStateFromProps!=null) {
				// Since c._nextState is modified, the previous state doesn't need to be saved.
				// It remains intact at c.state
				assign(s, newTag.getDerivedStateFromProps(newTree.props, s));
			}
			// console.log('updating component in-place', c._nextState);
			// if (c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, c.state)===false) {
			// 	c.state = nextState;
			if (c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, s)===false) {
				// diffLevel--;
				dom = newTree._el = c.base;
				break outer;
				// return newTree._el = c.base;
			}
			if (newTag.getDerivedStateFromProps==null && c.componentWillReceiveProps!=null) {
				c.componentWillReceiveProps(newTree.props, s, context);
			}

			// c.state = nextState;
		}
		else {
			isNew = true;
			// c = newTree._component = new newTree.tag(newTree.props, context);
			c = newTree._component = createComponent(newTree.tag, newTree.props, context);
			c.props = newTree.props;
			if (!c.state) c.state = {};
			c.context = context;
			if (newTag.getDerivedStateFromProps!=null) {
				// Since c._nextState is modified, the previous state doesn't need to be saved.
				// It remains intact at c.state
				assign(c.state, newTag.getDerivedStateFromProps(newTree.props, c.state));
			}
			else if (c.componentWillMount!=null) {
				c.componentWillMount();
			}
			mounts.push(c);

			// if (dom==null && newTree.tag.recycle===true && newTree.tag.__cache!=null) {
			// 	console.log('using recycled DOM');
			// 	c._previousVTree = newTree.tag.__cache.pop();
			// 	c.base = c._previousVTree._el;
			// }

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
		if (c._nextState!=null) {
			c.state = c._nextState;
			c._nextState = null;
		}
		c.context = context;
		let prev = c._previousVTree;
		let vnode = c._previousVTree = c.render(c.props, c.state, c.context);
		// context = assign({}, context);
		// context.__depth = (context.__depth || 0) + 1;
		// context = assign({
		// 	__depth: (context.__depth || 0) + 1
		// }, context);
		// if (c.getChildContext!=null) {
		// 	assign(context, c.getChildContext());
		// }
		if (c.getChildContext!=null) {
			// context = assign(assign({}, context), c.getChildContext());
			context = assign(assign({}, context), c.getChildContext());
		}
		// if (c.id==20) {
		// 	// console.trace('diffing '+c.id);
		// 	console.log('diffing '+c.id, vnode, prev);
		// }
		c.base = diff(dom, parent, vnode, prev, context, isSvg, append, excessChildren, diffLevel, mounts);
		c._dirty = false;
		// newTree.tag.$precache = c.base;
		c._vnode = newTree;

		// if (dom!=null && c.base!=null && c.base!==dom) {
		// 	parent.replaceChild(c.base, dom);
		// }

		if (c.base==null) {
			if (prev) unmount(prev);
		}
		else if (parent && append!==false) {
			// if (insertBefore && c.base.nextSibling!==insertBefore) parent.insertBefore(c.base, insertBefore);
			if (dom==null || dom.parentNode!==parent) parent.appendChild(c.base);
			else if (c.base!==dom) {
				// console.log('replace', dom, c.base);
				parent.replaceChild(c.base, dom);
			}
		}

		// if (dom!=null && (c.base!==dom || !dom.parentNode)) {
		// 	if (c.base==null) unmount(prev);
		// 	else if (dom.parentNode!==parent) parent.appendChild(c.base);
		// 	else parent.replaceChild(c.base, dom);
		// }

		dom = newTree._el = c.base;
		while (p=c._renderCallbacks.pop()) p();

		// if (c!=null) {
		// c.base = newTree._el;
		if (!isNew && c.componentDidUpdate!=null) {
			c.componentDidUpdate(oldProps, oldState, oldContext);
		}
		// if (isNew) {
		// 	mounts.push(c);
		// 	// if (c.componentDidMount!=null) c.componentDidMount();
		// }
		// else if (c.componentDidUpdate!=null) {
		// 	c.componentDidUpdate(oldProps, oldState, oldContext);
		// }
		// }
	}
	else {
		dom = newTree._el = diffElementNodes(dom, parent, newTree, oldTree, context, isSvg, excessChildren, diffLevel, mounts);
	}

	if (--diffLevel===0) {
		// processQueue();
		// console.log('firing '+mounts.length+' mounts');
		while ((c = mounts.pop())) {
			if (c.componentDidMount!=null) c.componentDidMount();
		}
	}

	// console.log(diffLevel);

	// if (oldTree!=null && oldTree!==newTree) unmount(oldTree, true, oldTree._el!==dom);

	// if (originalOldTree && originalOldTree._el && originalOldTree._el!==dom) {
	// 	unmount(originalOldTree);
	// }
	if (dom!==originalDom && originalOldTree!=null && originalOldTree._el!==dom) {
		// console.trace('unmount', originalOldTree._el);
		unmount(originalOldTree);
	}

	return dom;
}

function diffElementNodes(dom, parent, vnode, oldVNode, context, isSvg, excessChildren, diffLevel, mounts) {
	// if (vnode==null) {
	// 	let c = document.createComment('empty');
	// 	if (parent!=null) {
	// 		if (dom!=null) parent.replaceChild(c, dom);
	// 		else parent.appendChild(c);
	// 	}
	// 	if (oldVNode!=null) unmount(oldVNode);
	// 	return c;
	// }

	let d = dom;

	// Tracks entering and exiting SVG namespace when descending through the tree.
	isSvg = vnode.tag === 'svg' ? true : vnode.tag === 'foreignObject' ? false : isSvg;

	// if (oldVNode!=null) {
	// 	if (vnode.type!==oldVNode.type) console.log('vnode type mismatch: ', oldVNode.type, vnode.type);
	// 	if (vnode.tag!==oldVNode.tag) console.log('vnode tag mismatch: ', oldVNode.tag, vnode.tag);
	// }

	if (oldVNode==null || vnode.type!==oldVNode.type || vnode.tag!==oldVNode.tag) {
		// if (oldVNode) unmount(oldVNode);
		dom = null;
	}

	// if (dom==null && excessChildren!=null) {
	// 	console.log('hydrating from '+excessChildren.length+' excess children', excessChildren.map( c => c && `${c.nodeType} @ ${c.localName}`), vnode.type, vnode.tag);
	// 	for (let j=0; j<excessChildren.length; j++) {
	// 		let c = excessChildren[j];
	// 		if (c!=null && c.nodeType==vnode.type && c.localName==vnode.tag) {
	// 			oldVNode = toVNode(dom = d = c);
	// 			// console.log(vnode, oldVNode, dom);
	// 			excessChildren[j] = null;
	// 			// console.log('found hydration match for '+vnode.tag+' ('+vnode.type+')', oldVNode);
	// 			// console.log(oldVNode, vnode);
	// 			// dom = toVNode(c);
	// 			break;
	// 		}
	// 	}
	// }

	if (dom==null) {
	// if (dom==null || vnode.type!==(oldVNode==null?null:oldVNode.type) || vnode.tag!==(oldVNode==null?null:oldVNode.tag)) {
		// return create(dom, parent, vnode, context, isSvg);
		//dom = create(dom, parent, vnode, context, isSvg);

		// if (vnode.type===3) {
		// 	dom = document.createTextNode(vnode.text);
		// }
		// else if (isSvg) {
		// 	dom = document.createElementNS('http://www.w3.org/2000/svg', vnode.tag);
		// }
		// else {
		// 	dom = document.createElement(vnode.tag);
		// }
		// // else {
		// // 	dom = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);
		// // }

		// vnode._el = dom;

		// vnode._el = dom = typeof vnode==='string' || typeof vnode==='number' ? document.createTextNode(vnode) : isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);
		vnode._el = dom = vnode.type===3 ? document.createTextNode(vnode.text) : isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);

		// dom = vnode.type===3 ? document.createTextNode(vnode.text) : document.createElement(vnode.tag);
		// if (d) {
		// 	parent.replaceChild(dom, d);
		// 	while (d.firstChild) dom.appendChild(d.firstChild);
		// }
	}

	// if (typeof vnode==='string' || typeof vnode==='number') {
	if (vnode.type===3) {
		if (dom===d && vnode.text!==oldVNode.text) {
			dom.data = vnode.text;
		}
	}
	else {
		if (excessChildren!=null && dom.childNodes!=null) {
			excessChildren = EMPTY_ARR.slice.call(dom.childNodes);
		}
		// console.log('diffChildren(', getVNodeChildren(vnode).map( p => Object.assign({}, p) ), getVNodeChildren(oldVNode).map( p => Object.assign({}, p) ), ')');
		// let newChildren = getVNodeChildren(vnode);
		// diffChildren(dom, newChildren, vnode===oldVNode ? newChildren : oldVNode==null ? [] : getVNodeChildren(oldVNode), context, isSvg, excessChildren);
		diffChildren(dom, getVNodeChildren(vnode), oldVNode==null ? EMPTY_ARR : getVNodeChildren(oldVNode), context, isSvg, excessChildren, diffLevel, mounts);
		if (vnode!==oldVNode) {
			diffProps(dom, vnode.props, oldVNode==null ? EMPTY_OBJ : oldVNode.props, isSvg);
		}
	}

	// if (oldVNode!=null && dom!==d) unmount(oldVNode);

	return dom;
}


export function unmount(vnode) {
	let r;
	if (vnode.props!=null && (r = vnode.props.ref)) r(null);
	if ((r = vnode._el)!=null) r.remove();
	vnode._el = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) r.componentWillUnmount();
		// let ctor = r.constructor;
		// let cache = ctor.$cache || (ctor.$cache = []);
		// cache.push(r.base);

		// let ctor = r.constructor;
		// if (r.base!=null && ctor.recycle===true) {
		// 	(ctor.__cache || (ctor.__cache=[])).push(r._previousVTree);
		// 	return;
		// }

		r.base = null;
	}

	// if (recursive) {
	// 	let children = getVNodeChildren(vnode);
	// 	for (let i=children.length; i--; ) {
	// 		unmount(children[i], true, false);
	// 	}
	// }
}

// export function mount(vnode) {
// 	let r;
// 	if (vnode.props!=null && (r = vnode.props.ref)) r(vnode._component!=null ? vnode._component : vnode._el);
// 	if ((r = vnode._component)) {
// 		if (r.componentWillMount) r.componentWillMount();
// 		r.base = vnode._el;
// 	}
// }


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

// const ARR = [];

export function getVNodeChildren(vnode) {
	if (vnode._children==null) {
		// flattenChildren(vnode.children, vnode._children=[], '', 0);
		// flattenChildren(vnode.props.children, vnode._children=[], '', 0);
		flattenChildren(vnode.props.children, vnode._children=[]);
	}
	return vnode._children;

	// ARR[0] = vnode.children;
	// flattenChildren(ARR, children, '', 0);
	// flattenChildren(Array.isArray(vnode.children) ? vnode.children : [vnode.children], children, '', 0);
	// if (vnode._children!=null) {
	// 	return vnode._children;
	// }
	// // ARR[0] = vnode.children;
	// // flattenChildren(ARR, children, '', 0);
	// // flattenChildren(Array.isArray(vnode.children) ? vnode.children : [vnode.children], children, '', 0);
	// let children = vnode._children = [];
	// flattenChildren(vnode.children, children, '', 0);
	// return children;
}


// function flattenChildren(children, flattened, path, index) {
// function flattenChildren(children, flattened, key, index) {
function flattenChildren(children, flattened) {
	// let i = 0;
	//	key = path+'.'+index,	//key = path.length===0 ? index : `${path}.${index}`,
	//	isObject = children===Object(children);
	//	child,
	//	type = typeof children;

	// if (key) key += '.';

	// key += '.';
	// key += index;

	// if (type==='object' && typeof Symbol!=='undefined' && Symbol.iterator in children) {
	// 	children = Array.from(children);
	// }
	if (children==null) {}
	// else if (isObject && 'pop' in children) {
	else if (typeof children==='object' && ('pop' in children || Symbol.iterator in children && (children = Array.from(children)))) {
	// else if (type==='object' && 'pop' in children) {
		for (let i=0; i < children.length; i++) {
			// let child = children[i];
			// let key = path + '.' + i;
			// if ('pop' in child) {
			// 	flattenChildren(child, flattened, key, i);
			// }
			// else {
			// 	pushChild(child, flattened, key, i, typeof child);
			// }
			flattenChildren(children[i], flattened);
			// flattenChildren(children[i], flattened, key, i);
		}
	}
	// else if (type==='object' && Symbol.iterator in children) {
	// 	flattenChildren(Array.from(children), flattened, key, index);
	// }
	// else if (type==='object' && Symbol.iterator in children) {
	// 	let child;
	// 	while ((child = children.next()).done !== true) {
	// 		flattenChildren(child.value, flattened, key, i++);
	// 	}
	// }
	else {
		// pushChild(children, flattened, path, index, type);
		// if (!isObject) {

		if (typeof children!=='object' && typeof children!=='function') {
			children = createVNode(TEXT_NODE, null, null, null, children, null);
			// children = createVNode(TEXT_NODE, null, null, null, children, key);
		}

		// else if (children.key == null) {
		// 	children.key = key;
		// }
		// if (flattened.indexOf(children)!==-1) {
		// 	children = assign({}, children);
		// }
		flattened.push(children);
	}
}

// function pushChild(child, flattened, path, index, key, type) {
// 	if (type!=='object' && type!=='function') {
// 		child = createVNode(TEXT_NODE, null, null, null, child, key);
// 	}
// 	else if (child.key == null) {
// 		child.key = key;
// 	}
// 	if (flattened.indexOf(child)!==-1) {
// 		child = assign({}, child);
// 	}
// 	flattened.push(child);
// }

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


function createComponent(Ctor, props, context) {
	let inst;
	if (Ctor.prototype && Ctor.prototype.render) {
		inst = new Ctor(props, context);
		// @TODO this really shouldn't be necessary and people shouldn't rely on it!
		// Component.call(inst, props, context);
	}
	else {
		inst = new Component(props, context);
		inst._constructor = Ctor;
		inst.render = doRender;
	}
	return inst;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this._constructor(props, context);
}
