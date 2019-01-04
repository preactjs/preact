/**
 * Serialize an object
 * @param {Object} obj
 * @return {string}
 */
function serialize(obj) {
	if (obj instanceof Text) return '#text';
	if (obj instanceof Element) return `<${obj.localName}>${obj.textContent}`;
	if (obj === document) return 'document';
	if (typeof obj === 'string') return obj;
	return Object.prototype.toString.call(obj).replace(/(^\[object |\]$)/g, '');
}

let log = {};

/**
 * Modify obj's original method to log calls and arguments on logger object
 * @template T
 * @param {T} obj
 * @param {keyof T} method
 */
export function logCall(obj, method) {
	let old = obj[method];
	obj[method] = function() {
		let c = '';
		for (let i=0; i<arguments.length; i++) {
			if (c) c += ', ';
			c += serialize(arguments[i]);
		}
		const key = `${serialize(this)}.${method}(${c})`;
		log[key] = (log[key] || 0) + 1;
		return old.apply(this, arguments);
	};
}

/**
 * Return log object
 * @return {object} log
 */
export function getLog() {
	return log;
}

/** Clear log object */
export function clearLog() {
	log = {};
}
