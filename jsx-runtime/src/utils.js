const ENCODED_ENTITIES = /["&<]/;

/** @param {string} str */
export function encodeEntities(str) {
	// Skip all work for strings with no entities needing encoding:
	if (str.length === 0 || ENCODED_ENTITIES.test(str) === false) return str;

	let last = 0,
		i = 0,
		out = '',
		ch = '';

	// Seek forward in str until the next entity char:
	for (; i < str.length; i++) {
		switch (str.charCodeAt(i)) {
			case 34:
				ch = '&quot;';
				break;
			case 38:
				ch = '&amp;';
				break;
			case 60:
				ch = '&lt;';
				break;
			default:
				continue;
		}
		// Append skipped/buffered characters and the encoded entity:
		if (i !== last) out += str.slice(last, i);
		out += ch;
		// Start the next seek/buffer after the entity's offset:
		last = i + 1;
	}
	if (i !== last) out += str.slice(last, i);
	return out;
}

const IS_NON_DIMENSIONAL = new Set([
	'animation-iteration-count',
	'border-image-outset',
	'border-image-slice',
	'border-image-width',
	'box-flex',
	'box-flex-group',
	'box-ordinal-group',
	'column-count',
	'fill-opacity',
	'flex',
	'flex-grow',
	'flex-negative',
	'flex-order',
	'flex-positive',
	'flex-shrink',
	'flood-opacity',
	'font-weight',
	'grid-column',
	'grid-row',
	'line-clamp',
	'line-height',
	'opacity',
	'order',
	'orphans',
	'stop-opacity',
	'stroke-dasharray',
	'stroke-dashoffset',
	'stroke-miterlimit',
	'stroke-opacity',
	'stroke-width',
	'tab-size',
	'widows',
	'z-index',
	'zoom'
]);

const JS_TO_CSS = {};
const CSS_REGEX = /[A-Z]/g;
// Convert an Object style to a CSSText string
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (val != null && val !== '') {
			const name =
				prop[0] == '-'
					? prop
					: JS_TO_CSS[prop] ||
					  (JS_TO_CSS[prop] = prop.replace(CSS_REGEX, '-$&').toLowerCase());

			let suffix = ';';
			if (
				typeof val === 'number' &&
				// Exclude custom-attributes
				!name.startsWith('--') &&
				!IS_NON_DIMENSIONAL.has(name)
			) {
				suffix = 'px;';
			}
			str = str + name + ':' + val + suffix;
		}
	}
	return str || undefined;
}
