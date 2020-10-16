// DOM properties that should NOT have "px" added when numeric
export const IS_NON_DIMENSIONAL = /acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i;

export function encodeEntities(s) {
	if (typeof s !== 'string') s = String(s);
	let out = '';
	for (let i = 0; i < s.length; i++) {
		let ch = s[i];
		// prettier-ignore
		switch (ch) {
			case '<': out += '&lt;'; break;
			case '>': out += '&gt;'; break;
			case '"': out += '&quot;'; break;
			case '&': out += '&amp;'; break;
			default: out += ch;
		}
	}
	return out;
}

export let indent = (s, char) =>
	String(s).replace(/(\n+)/g, '$1' + (char || '\t'));

export let isLargeString = (s, length, ignoreLines) =>
	String(s).length > (length || 40) ||
	(!ignoreLines && String(s).indexOf('\n') !== -1) ||
	String(s).indexOf('<') !== -1;

const JS_TO_CSS = {};

// Convert an Object style to a CSSText string
export function styleObjToCss(s) {
	let str = '';
	for (let prop in s) {
		let val = s[prop];
		if (val != null) {
			if (str) str += ' ';
			// str += jsToCss(prop);
			str +=
				prop[0] == '-'
					? prop
					: JS_TO_CSS[prop] ||
					  (JS_TO_CSS[prop] = prop.replace(/([A-Z])/g, '-$1').toLowerCase());
			str += ': ';
			str += val;
			if (typeof val === 'number' && IS_NON_DIMENSIONAL.test(prop) === false) {
				str += 'px';
			}
			str += ';';
		}
	}
	return str || undefined;
}

/**
 * Copy all properties from `props` onto `obj`.
 * @param {object} obj Object onto which properties should be copied.
 * @param {object} props Object from which to copy properties.
 * @returns {object}
 * @private
 */
export function assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return obj;
}

/**
 * Get flattened children from the children prop
 * @param {Array} accumulator
 * @param {any} children A `props.children` opaque object.
 * @returns {Array} accumulator
 * @private
 */
export function getChildren(accumulator, children) {
	if (Array.isArray(children)) {
		children.reduce(getChildren, accumulator);
	} else if (children != null && children !== false) {
		accumulator.push(children);
	}
	return accumulator;
}
