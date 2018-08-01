// DOM properties that should NOT have "px" added when numeric
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|ows|mnc|ntw|ine[ch]|zoo|^ord/i;

export const objectKeys = Object.keys || (obj => {
	let keys = [];
	for (let i in obj) if (obj.hasOwnProperty(i)) keys.push(i);
	return keys;
});

export let encodeEntities = s => String(s)
	.replace(/&/g, '&amp;')
	.replace(/</g, '&lt;')
	.replace(/>/g, '&gt;')
	.replace(/"/g, '&quot;');

export let indent = (s, char) => String(s).replace(/(\n+)/g, '$1' + (char || '\t'));

export let isLargeString = (s, length, ignoreLines) => (String(s).length>(length || 40) || (!ignoreLines && String(s).indexOf('\n')!==-1) || String(s).indexOf('<')!==-1);

const JS_TO_CSS = {};

// Convert an Object style to a CSSText string
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (val!=null) {
			if (str) str += ' ';
			// str += jsToCss(prop);
			str += JS_TO_CSS[prop] || (JS_TO_CSS[prop] = prop.replace(/([A-Z])/g,'-$1').toLowerCase());
			str += ': ';
			str += val;
			if (typeof val==='number' && IS_NON_DIMENSIONAL.test(prop)===false) {
				str += 'px';
			}
			str += ';';
		}
	}
	return str || undefined;
}

export function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

export function getNodeProps(vnode) {
	let defaultProps = vnode.nodeName.defaultProps,
		props = assign({}, defaultProps || vnode.attributes);
	if (defaultProps) assign(props, vnode.attributes);
	if (vnode.children) props.children = vnode.children;
	return props;
}
