import { IS_NON_DIMENSIONAL } from '../constants';

export function diffProps(node, props, oldProps) {
	if (props) {
		for (let i in props) {
			if (!oldProps || oldProps[i]!=props[i]) {
				setProperty(node, i, props[i], oldProps[i]);
				// node[i] = props[i];
			}
		}
	}
	if (oldProps) {
		for (let i in oldProps) {
			if (!props || !(i in props)) {
				// delete node[i];
				setProperty(node, i, null, oldProps[i]);
			}
		}
	}
}

// const DIMENSION_PROPS = {};

// function isDimensionalProp(name) {
// 	return DIMENSION_PROPS[name] || (DIMENSION_PROPS[name] = (IS_NON_DIMENSIONAL.test(name) === false));
// }

// let isNonDimensional = IS_NON_DIMENSIONAL.test.bind(IS_NON_DIMENSIONAL);

function setProperty(node, name, value, oldValue) {
	if (name==='class') name = 'className';
	if (name==='style') {
		// remove values not in the new list
		for (let i in oldValue) {
			if (value==null || !(i in value)) node.style[i] = '';
		}
		for (let i in value) {
			let v = value[i];
			if (oldValue==null || v!==oldValue[i]) {
				node.style[i] = typeof v === 'number' && IS_NON_DIMENSIONAL.test(i) === false ? (v + 'px') : v;

				// node.style[i] = typeof v === 'number' && !isNonDimensional(i) ? (v + 'px') : v;

				// if (typeof v==='number' && (DIMENSION_PROPS[i] === true || (DIMENSION_PROPS[i] = IS_NON_DIMENSIONAL.test(i)===false))) {
				// 	v += 'px';
				// }
				// node.style[i] = v;
			}
		}
	}
	else if (name[0]==='o' && name[1]==='n') {
		let listenerName = name[2].toLowerCase() + name.substring(3);
		node.removeEventListener(listenerName, oldValue);
		node.addEventListener(listenerName, value);
	}
	else if (value==null) {
		delete node[name];
	}
	else {
		node[name] = value;
	}
}