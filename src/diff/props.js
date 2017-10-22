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

function setProperty(node, name, value, oldValue) {
	if (name==='style') {
		for (let i in oldValue) if (!(i in value)) node.style[i] = '';
		for (let i in value) node.style[i] = value[i];
	}
	else if (value==null) {
		delete node[name];
	}
	else {
		node[name] = value;
	}
}