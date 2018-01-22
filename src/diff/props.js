import { IS_NON_DIMENSIONAL } from '../constants';

export function diffProps(node, props, oldProps, isSvg) {
	// if (props!=null) {
	if (props) {
		for (let i in props) {
			if (i!=='children' && i!=='key' && (!oldProps || oldProps[i]!=props[i])) {
			// if (i!=='children' && i!=='key' && (oldProps==null || oldProps[i]!=props[i])) {
			// if (oldProps==null || oldProps[i]!=props[i]) {
				setProperty(node, i, props[i], oldProps[i], isSvg);
				// node[i] = props[i];
			}
		}
	}
	// if (oldProps!=null) {
	if (oldProps) {
		for (let i in oldProps) {
			if (i!=='children' && i!=='key' && (!props || !(i in props))) {
			// if (i!=='children' && i!=='key' && (props==null || !(i in props))) {
			// if (props==null || !(i in props)) {
				// delete node[i];
				setProperty(node, i, null, oldProps[i], isSvg);
			}
		}
	}
}

// const DIMENSION_PROPS = {};

// function isDimensionalProp(name) {
// 	return DIMENSION_PROPS[name] || (DIMENSION_PROPS[name] = (IS_NON_DIMENSIONAL.test(name) === false));
// }

// let isNonDimensional = IS_NON_DIMENSIONAL.test.bind(IS_NON_DIMENSIONAL);

// function setStyle(node, value, oldValue) {
// 	for (let i in oldValue) {
// 		if (value==null || !(i in value)) node.style[i] = '';
// 	}
// 	for (let i in value) {
// 		let v = value[i];
// 		if (oldValue==null || v!==oldValue[i]) {
// 			node.style[i] = typeof v==='number' && IS_NON_DIMENSIONAL.test(i)===false ? (v + 'px') : v;
// 		}
// 	}
// }

function setProperty(node, name, value, oldValue, isSvg) {
	// if (name==='children') return;

	// let name = iname==='class' ? 'className' : iname;
	if (name==='class') name = 'className';
	// let isProperty = !isSvg && name in node;

	// let obj = node[name];

	// if (name==='children' || name==='key') {}
	// else
	if (name==='ref') {
		if (oldValue) oldValue(null);
		if (value) value(node);
	}
	else if (name==='style') {
		// setStyle(node, value, oldValue);

		let s = node.style;

		// remove values not in the new list
		for (let i in oldValue) {
			if (value==null || !(i in value)) s[i] = '';
		}
		for (let i in value) {
			let v = value[i];
			if (oldValue==null || v!==oldValue[i]) {
				s[i] = typeof v==='number' && IS_NON_DIMENSIONAL.test(i)===false ? (v + 'px') : v;
				// obj[i] = v;

				// if (typeof v==='number' && IS_NON_DIMENSIONAL.test(i)===false) v += 'px';
				// obj[i] = v;

				// node.style[i] = typeof v==='number' && isDimensionalProp(i) ? `${v}px` : v;
				// node.style[i] = v;

				// if (typeof v==='number' && (DIMENSION_PROPS[i] === true || (DIMENSION_PROPS[i] = IS_NON_DIMENSIONAL.test(i)===false))) {
				// 	v += 'px';
				// }
				// node.style[i] = v;
			}
		}
	}
	// else if (name.charCodeAt(0)===111 && name.charCodeAt(1)===110) {
	else if (name[0]==='o' && name[1]==='n') {
		let listenerName = name[2].toLowerCase() + name.substring(3);
		node.removeEventListener(listenerName, oldValue);
		node.addEventListener(listenerName, value);
	}
	// else if (isProperty===true) {
	// else if (name in node) {
	else if (!isSvg && (name in node)) {
		node[name] = value==null ? '' : value;
		// if (value==null || value===false) node.removeAttribute(name);
	}
	// else if (name in node && (isSvg===false || obj!=null && obj.baseVal!=null && obj.baseVal.valueAsString!=null)) {
	// 	if (isSvg===true) {
	// 		// console.log(name, value, node[name].baseVal.unitType);
	// 		obj.baseVal.valueAsString = typeof value==='number' ? (value + 'px') : value;
	// 	}
	// 	else {
	// 		node[name] = value==null ? '' : value;
	// 	}
	// 	if (value==null || value===false) node.removeAttribute(name);
	// }
	else if (value==null || value===false) {
		node.removeAttribute(name);
	}
	else {
		node.setAttribute(name, value);
	}
	// @TODO handle this implicitly in set?
	// else if (value==null) {
	// 	if (isProperty===true) {
	// 		delete node[name];
	// 	}
	// 	else {
	// 		node.removeAttribute(name);
	// 	}
	// }
	// else if (isProperty===true) {
	// 	node[name] = value;
	// }
	// else {
	// 	node.setAttribute(name, value);
	// }
}