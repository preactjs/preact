export function printVNode(vnode) {
	let v = '';
	if (vnode == null) {
		v = null;
	} else if (vnode.type == null) {
		v = '#text';
	} else if (typeof vnode.type === 'string') {
		const key = vnode.key ? ` key="${vnode.key}"` : '';
		v = `<${vnode.type}${key} />`;
	}
	return v;
}
