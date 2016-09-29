// DOM properties that should NOT have "px" added when numeric
export const NON_DIMENSION_PROPS = {
	boxFlex:1, boxFlexGroup:1, columnCount:1, fillOpacity:1, flex:1, flexGrow:1,
	flexPositive:1, flexShrink:1, flexNegative:1, fontWeight:1, lineClamp:1, lineHeight:1,
	opacity:1, order:1, orphans:1, strokeOpacity:1, widows:1, zIndex:1, zoom:1
};

const ESC = {
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	'&': '&amp;'
};

export const objectKeys = Object.keys || (obj => {
	let keys = [];
	for (let i in obj) if (obj.hasOwnProperty(i)) keys.push(i);
	return keys;
});

export let encodeEntities = s => String(s).replace(/[<>"&]/g, escapeChar);

let escapeChar = a => ESC[a] || a;

export let falsey = v => v==null || v===false;

export let memoize = (fn, mem={}) => v => mem[v] || (mem[v] = fn(v));

export let indent = (s, char) => String(s).replace(/(\n+)/g, '$1' + (char || '\t'));

export let isLargeString = (s, length, ignoreLines) => (String(s).length>(length || 40) || (!ignoreLines && String(s).indexOf('\n')!==-1) || String(s).indexOf('<')!==-1);

// Convert an Object style to a CSSText string
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (val!=null) {
			if (str) str += ' ';
			str += jsToCss(prop);
			str += ': ';
			str += val;
			if (typeof val==='number' && !NON_DIMENSION_PROPS[prop]) {
				str += 'px';
			}
			str += ';';
		}
	}
	return str;
}


// See https://github.com/developit/preact/blob/master/src/util.js#L61
export function hashToClassName(c) {
	let str = '';
	for (let prop in c) {
		if (c[prop]) {
			if (str) str += ' ';
			str += prop;
		}
	}
	return str;
}

// Convert a JavaScript camel-case CSS property name to a CSS property name
export let jsToCss = memoize( s => s.replace(/([A-Z])/g,'-$1').toLowerCase() );

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
