import { EMPTY_OBJ, EMPTY_ARR } from '../constants';
// import { assign } from '../util';
import { Component, enqueueRender } from '../component';
import { coerceToVNode /*, reclaimVNode*/ } from '../create-element';
import { diffChildren /*, create */ } from './children';
import { diffProps } from './props';
import { assign } from '../util';
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

export function diff(dom, parent, newTree, oldTree, context, isSvg, append, excessChildren, mounts, ancestorComponent) {
	if (newTree==null) {
		if (oldTree != null) {
			unmount(oldTree, ancestorComponent);
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

	let originalOldTree = oldTree;

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
		oldTag = oldTree!=null ? oldTree.tag : null,
		clearProcessingException;

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

	try {

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

			// Get component and set it to `c`
			if (oldTree!=null && oldTree._component) {
				c = newTree._component = oldTree._component;
				clearProcessingException = c._processingException;
			}
			else {
				isNew = true;
				// c = newTree._component = new newTree.tag(newTree.props, context);
				c = newTree._component = createComponent(newTree.tag, newTree.props, context, ancestorComponent);
				c.props = newTree.props;
				if (!c.state) c.state = {};
				c.context = context;
			}

			// Invoke getDerivedStateFromProps
			let s = c._nextState || c.state;
			if (newTag.getDerivedStateFromProps!=null) {
				oldState = assign({}, c.state);
				assign(s, newTag.getDerivedStateFromProps(newTree.props, s));
			}

			// Invoke pre-render lifecycle methods
			if (isNew) {
				if (newTag.getDerivedStateFromProps==null && c.componentWillMount!=null) c.componentWillMount();
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
			else {
				// let nextState = c.state;
				// if (c.prevState!=null) {
				// 	c.state = c.prevState;
				// 	c.prevState = null;
				// }

				// console.log('updating component in-place', c._nextState);
				// if (c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, c.state)===false) {
				// 	c.state = nextState;
				if (c.shouldComponentUpdate!=null && c.shouldComponentUpdate(newTree.props, s, context)===false) {
					dom = c.base;
					break outer;
					// return newTree._el = c.base;
				}
				if (newTag.getDerivedStateFromProps==null && c.componentWillReceiveProps!=null) {
					c.componentWillReceiveProps(newTree.props, context);
				}

				if (c.componentWillUpdate!=null) {
					c.componentWillUpdate(newTree.props, s, context);
				}
				// c.state = nextState;
			}

			oldProps = c.props;
			if (!oldState) oldState = c.state;

			oldContext = c.context = context;
			c.props = newTree.props;
			if (c._nextState!=null) {
				c.state = c._nextState;
				c._nextState = null;
			}
			let prev = c._previousVTree;
			let vnode = c._previousVTree = coerceToVNode(c.render(c.props, c.state, c.context));
			c._dirty = false;

			if (c.getChildContext!=null) {
				context = assign(assign({}, context), c.getChildContext());
			}

			if (!isNew && c.getSnapshotBeforeUpdate!=null) {
				oldContext = c.getSnapshotBeforeUpdate(oldProps, oldState);
			}

			if (vnode instanceof Array) {
				diffChildren(parent, vnode, prev==null ? EMPTY_ARR : prev, context, isSvg, excessChildren, mounts, c);
			}
			else {
				c.base = diff(dom, parent, vnode, prev, context, isSvg, append, excessChildren, mounts, c);
			}
			// context = assign({}, context);
			// context.__depth = (context.__depth || 0) + 1;
			// context = assign({
			// 	__depth: (context.__depth || 0) + 1
			// }, context);
			// if (c.getChildContext!=null) {
			// 	assign(context, c.getChildContext());
			// }
			// if (c.id==20) {
			// 	// console.trace('diffing '+c.id);
			// 	console.log('diffing '+c.id, vnode, prev);
			// }
			// newTree.tag.$precache = c.base;
			c._vnode = newTree;

			// if (dom!=null && c.base!=null && c.base!==dom) {
			// 	parent.replaceChild(c.base, dom);
			// }

			if (c.base==null) {
				if (prev && !(prev instanceof Array)) {
					unmount(prev, ancestorComponent);
				}
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

			dom = c.base;
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
			dom = diffElementNodes(dom, parent, newTree, oldTree, context, isSvg, excessChildren, mounts, ancestorComponent);
		}

		if (clearProcessingException) {
			c._processingException = null;
		}

	}
	catch (e) {
		if (c && !dom) {
			// Create an "anchor" into which we can rerender upon recovery even though the component doesn't have a proper tree to render
			// This is required because forceUpdate doesn't diff if c.base is null
			parent.appendChild(c.base = dom = document.createTextNode(''));
		}
		catchErrorInComponent(e, ancestorComponent);
	}

	newTree._el = dom;

	// console.log(isRootDiff);

	// if (oldTree!=null && oldTree!==newTree) unmount(oldTree, true, oldTree._el!==dom);

	// if (originalOldTree && originalOldTree._el && originalOldTree._el!==dom) {
	// 	unmount(originalOldTree);
	// }
	if (originalOldTree!=null && originalOldTree.tag!==newTag) {
		// console.trace('unmount', originalOldTree._el);
		unmount(originalOldTree, ancestorComponent);
	}

	return dom;
}

export function flushMounts(mounts) {
	let c;
	while ((c = mounts.pop())) {
		if (c.componentDidMount!=null) {
			try {
				c.componentDidMount();
			}
			catch (e) {
				catchErrorInComponent(e, c._ancestorComponent);
			}
		}
	}
}

function diffElementNodes(dom, parent, vnode, oldVNode, context, isSvg, excessChildren, mounts, ancestorComponent) {
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
	isSvg = isSvg ? vnode.tag !== 'foreignObject' : vnode.tag === 'svg';

	// if (oldVNode!=null) {
	// 	if (vnode.tag!==oldVNode.tag) console.log('vnode tag mismatch: ', oldVNode.tag, vnode.tag);
	// }

	if (oldVNode==null || vnode.tag!==oldVNode.tag) {
		// if (oldVNode) unmount(oldVNode);
		dom = null;
		oldVNode = EMPTY_OBJ;
	}

	// if (dom==null && excessChildren!=null) {
	// 	console.log('hydrating from '+excessChildren.length+' excess children', excessChildren.map( c => c && `${c.nodeType} @ ${c.localName}`), vnode.tag);
	// 	for (let j=0; j<excessChildren.length; j++) {
	// 		let c = excessChildren[j];
	// 		if (c!=null && c.localName==vnode.tag) {
	// 			// oldVNode = toVNode(dom = d = c);
	// 			// console.log(vnode, oldVNode, dom);
	// 			excessChildren[j] = null;
	// 			// console.log('found hydration match for '+vnode.tag, oldVNode);
	// 			// console.log(oldVNode, vnode);
	// 			// dom = toVNode(c);
	// 			break;
	// 		}
	// 	}
	// }

	if (dom==null && vnode!=null) {
	// if (dom==null || vnode.type!==(oldVNode==null?null:oldVNode.type) || vnode.tag!==(oldVNode==null?null:oldVNode.tag)) {
		// return create(dom, parent, vnode, context, isSvg);
		//dom = create(dom, parent, vnode, context, isSvg);

		// if (vnode.tag===null) {
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
		vnode._el = dom = vnode.tag===null ? document.createTextNode(vnode.text) : isSvg ? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag) : document.createElement(vnode.tag);

		// dom = vnode.tag===null ? document.createTextNode(vnode.text) : document.createElement(vnode.tag);
		// if (d) {
		// 	parent.replaceChild(dom, d);
		// 	while (d.firstChild) dom.appendChild(d.firstChild);
		// }
	}

	// if (typeof vnode==='string' || typeof vnode==='number') {
	if (vnode.tag===null) {
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
		if (vnode!==oldVNode) {
			diffProps(dom, vnode.props, oldVNode==EMPTY_OBJ ? EMPTY_OBJ : oldVNode.props, isSvg);
			if (vnode.ref!==oldVNode.ref) {
				let ref;
				if (ref = oldVNode.ref) ref(null);
				if (ref = vnode.ref) ref(dom);
			}
		}
		diffChildren(dom, getVNodeChildren(vnode), oldVNode==EMPTY_OBJ ? EMPTY_ARR : getVNodeChildren(oldVNode), context, isSvg, excessChildren, mounts, ancestorComponent);
	}

	// if (oldVNode!=null && dom!==d) unmount(oldVNode);

	return dom;
}


export function unmount(vnode, ancestorComponent) {
	let r;
	if (r = vnode.ref) {
		try {
			r(null);
		}
		catch (e) {
			catchErrorInComponent(e, ancestorComponent);
		}
	}
	if ((r = vnode._el)!=null) r.remove();
	vnode._el = null;

	if ((r = vnode._component)!=null) {
		if (r.componentWillUnmount) {
			try {
				r.componentWillUnmount();
			}
			catch (e) {
				catchErrorInComponent(e, ancestorComponent);
			}
		}
		// let ctor = r.constructor;
		// let cache = ctor.$cache || (ctor.$cache = []);
		// cache.push(r.base);

		// let ctor = r.constructor;
		// if (r.base!=null && ctor.recycle===true) {
		// 	(ctor.__cache || (ctor.__cache=[])).push(r._previousVTree);
		// 	return;
		// }

		r.base = null;
		if (r = r._previousVTree) unmount(r, ancestorComponent);
	}
	else if (r = vnode._children) {
		for (let i = 0; i < r.length; i++) {
			unmount(r[i], ancestorComponent);
		}
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
	// if (children==null) {}
	if (children==null || typeof children === 'boolean') {}
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

		// if (typeof children!=='object' && typeof children!=='function') {
		// 	children = createVNode(TEXT_NODE, null, null, null, children, null);
		// 	// children = createVNode(TEXT_NODE, null, null, null, children, key);
		// }
		children = coerceToVNode(children);

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


function createComponent(Ctor, props, context, ancestorComponent) {
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
	inst._ancestorComponent = ancestorComponent;
	return inst;
}

/** The `.render()` method for a PFC backing instance. */
function doRender(props, state, context) {
	return this._constructor(props, context);
}

function catchErrorInComponent(error, component) {
	for (; component; component = component._ancestorComponent) {
		if (component.componentDidCatch && !component._processingException) {
			try {
				component.componentDidCatch(error);
				return enqueueRender(component._processingException = component);
			}
			catch (e) {
				error = e;
			}
		}
	}
	throw error;
}
