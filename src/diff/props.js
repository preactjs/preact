import { IS_NON_DIMENSIONAL } from '../constants';
import options from '../options';

/**
 * Diff the old and new properties of a VNode and apply changes to the DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to apply
 * changes to
 * @param {object} newProps The new props
 * @param {object} oldProps The old props
 * @param {boolean} isSvg Whether or not this node is an SVG node
 */
export function diffProps(dom, newProps, oldProps, isSvg, isHydrating) {
	// compare(newProps, oldProps, setProperty, dom, isSvg);
	
	let i;
	
	for (i in oldProps) {
		// if (i!=='children' && i!=='key' && !(i in newProps)) {
		// if (!(i=='value' || i=='checked' || i=='children' || i=='key' || i in newProps)) {
		// if (i!=='key' && i!=='children' && !(i in newProps)) {
		if (!(i in newProps)) {
			setProperty(dom, i, null, oldProps[i], isSvg, isHydrating);
		}
	}

	for (i in newProps) {
		// if (i!=='children' && i!=='key' && (!oldProps || ((i==='value' || i==='checked') ? dom : oldProps)[i]!==newProps[i])) {
		// if (i!=='children' && i!=='key' && (!oldProps || oldProps[i]!==newProps[i])) {
		// if (i!=='children' && i!=='key' && oldProps[i]!==newProps[i]) {
		// if (oldProps[i]!==newProps[i]) {
		// if (i!=='value' && i!=='checked' && i!=='key' && i!=='children' && oldProps[i]!==newProps[i]) {
		if (i!=='value' && i!=='checked' && oldProps[i]!==newProps[i]) {
			setProperty(dom, i, newProps[i], oldProps[i], isSvg, isHydrating);
		}
		// if (i!=='value' && i!=='checked') {
		// 	if (!oldProps) {
		// 		setProperty(dom, i, newProps[i], null, isSvg);
		// 	}
		// 	else if (oldProps[i] !== newProps[i]) {
		// 		setProperty(dom, i, newProps[i], oldProps && oldProps[i], isSvg);
		// 	}
		// }
	}
}

// function compare(obj, old, comparator, ctx1, ctx2) {
// 	if (old) for (let i in old) {
// 		if (!obj || !(i in obj)) comparator(ctx1, i, null, old[i], ctx2);
// 	}
// 	if (obj) for (let i in obj) {
// 		if (!old) comparator(ctx1, i, obj[i], null, ctx2);
// 		else if (obj[i] !== old[i]) comparator(ctx1, i, obj[i], old[i], ctx2);
// 	}
// }

function setStyle(style, key, value) {
	if (key[0] === '-') {
		style.setProperty(key, value);
	}
	else {
		style[key] = typeof value==='number' && IS_NON_DIMENSIONAL.test(key)===false ? value+'px' : value;
	}
}

/**
 * Set a property value on a DOM node
 * @param {import('../internal').PreactElement} dom The DOM node to modify
 * @param {string} name The name of the property to set
 * @param {*} value The value to set the property to
 * @param {*} oldValue The old value the property had
 * @param {boolean} isSvg Whether or not this DOM node is an SVG node or not
 */
function setProperty(dom, name, value, oldValue, isSvg, isHydrating) {
	name = isSvg ? (name==='className' ? 'class' : name) : (name==='class' ? 'className' : name);
	// if (name === 'className') name = 'class';

	// ignore everything but event handlers during SSR hydration:
	if (isHydrating && name[0]!=='o') {}
	else if (name==='key' || name === 'children') {}
	else if (name==='style') {
		// compare(value, oldValue, setStyle, dom.style);

		const s = dom.style;
		if (oldValue) for (let i in oldValue) {
			if (!(value && i in value)) {
				setStyle(s, i, '');
				// s.setProperty(
				// 	i[0] === '-' && i[1] === '-' ? i : i.replace(CAMEL_REG, '-$&'),
				// 	''
				// );
			}
		}

		if (value) for (let i in value) {
			if (!oldValue || value[i] !== oldValue[i]) {
				setStyle(s, i, value[i]);
				// setStyle(dom.style, i, (
				// 	typeof value[i]==='number' && IS_NON_DIMENSIONAL.test(i)===false)
				// 	? value[i] + 'px'
				// 	: value[i]
				// );

				// s.setProperty(
				// 	i[0] === '-' && i[1] === '-' ? i : i.replace(CAMEL_REG, '-$&'),
				// 	(typeof value[i]==='number' && IS_NON_DIMENSIONAL.test(i)===false)
				// 		? value[i] + 'px'
				// 		: value[i]
				// );
			}
		}
	}
	else if (name === 'dangerouslySetInnerHTML') {
		// Note: re-using free name variable here as `html`.
		name = value && value.__html || '';
		// Avoid re-applying the same '__html' if it did not changed between re-render
		if (!oldValue || name!=oldValue.__html) {
			dom.innerHTML = name;
		}
	}
	// Benchmark for comparison: https://esbench.com/bench/574c954bdb965b9a00965ac6
	else if (name[0]==='o' && name[1]==='n') {
		let useCapture = name !== (name=name.replace(/Capture$/, ''));
		let nameLower = name.toLowerCase();
		name = (nameLower in dom ? nameLower : name).slice(2);

		if (value) {
			if (!oldValue) dom.addEventListener(name, eventProxy, useCapture);
		}
		else {
			dom.removeEventListener(name, eventProxy, useCapture);
		}
		(dom._listeners || (dom._listeners = {}))[name] = value;
	}
	else if (name!=='list' && !isSvg && (name in dom)) {
		try {
			dom[name] = value==null ? '' : value;
		}
		catch (e) {}
	}
	else if (typeof value!=='function') {
		if (name!==(name = name.replace(/^xlink:?/, ''))) {
			if (value==null || value===false) {
				dom.removeAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase());
			}
			else {
				dom.setAttributeNS('http://www.w3.org/1999/xlink', name.toLowerCase(), value);
			}
		}
		else if (value==null || value===false) {
			dom.removeAttribute(name);
		}
		else {
			dom.setAttribute(name, value);
		}
	}
}

/**
 * Proxy an event to hooked event handlers
 * @param {Event} e The event object from the browser
 * @private
 */
function eventProxy(e) {
	return this._listeners[e.type](options.event ? options.event(e) : e);
}
