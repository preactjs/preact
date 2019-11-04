import { createElement, options } from 'preact';
import { assign } from '../../src/util';
import { clearLog, getLog } from './logCall';
import { teardown as testUtilTeardown } from 'preact/test-utils';

/** @jsx createElement */

export function supportsPassiveEvents() {
	let supported = false;
	try {
		let options = {
			get passive() {
				supported = true;
				return undefined;
			}
		};

		window.addEventListener('test', options, options);
		window.removeEventListener('test', options, options);
	} catch (err) {
		supported = false;
	}
	return supported;
}

export function supportsDataList() {
	return (
		'list' in document.createElement('input') &&
		Boolean(
			document.createElement('datalist') && 'HTMLDataListElement' in window
		)
	);
}

const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

function encodeEntities(str) {
	return str.replace(/&/g, '&amp;');
}

/**
 * Normalize svg paths spacing. Some browsers insert spaces around letters,
 * others do not.
 * @param {string} str
 * @returns {string}
 */
function normalizePath(str) {
	let len = str.length;
	let out = '';
	for (let i = 0; i < len; i++) {
		const char = str[i];
		if (/[A-Za-z]/.test(char)) {
			if (i == 0) out += char + ' ';
			else
				out += (str[i - 1] == ' ' ? '' : ' ') + char + (i < len - 1 ? ' ' : '');
		} else if (char == '-' && str[i - 1] !== ' ') out += ' ' + char;
		else out += char;
	}

	return out.replace(/\s\s+/g, ' ').replace(/z/g, 'Z');
}

export function serializeHtml(node) {
	let str = '';
	let child = node.firstChild;
	while (child) {
		str += serializeDomTree(child);
		child = child.nextSibling;
	}
	return str;
}

/**
 * Serialize a DOM tree.
 * Uses deterministic sorting where necessary to ensure consistent tests.
 * @param {Element|Node} node	The root node to serialize
 * @returns {string} html
 */
function serializeDomTree(node) {
	if (node.nodeType === 3) {
		return encodeEntities(node.data);
	} else if (node.nodeType === 8) {
		return '<!--' + encodeEntities(node.data) + '-->';
	} else if (node.nodeType === 1 || node.nodeType === 9) {
		let str = '<' + node.localName;
		const attrs = [];
		for (let i = 0; i < node.attributes.length; i++) {
			attrs.push(node.attributes[i].name);
		}
		attrs.sort();
		for (let i = 0; i < attrs.length; i++) {
			const name = attrs[i];
			let value = node.getAttribute(name);
			if (value == null) continue;
			if (!value && name === 'class') continue;
			str += ' ' + name;
			value = encodeEntities(value);

			// normalize svg <path d="value">
			if (node.localName === 'path' && name === 'd') {
				value = normalizePath(value);
			}
			str += '="' + value + '"';
		}
		str += '>';
		if (!VOID_ELEMENTS.test(node.localName)) {
			let child = node.firstChild;
			while (child) {
				str += serializeDomTree(child);
				child = child.nextSibling;
			}
			str += '</' + node.localName + '>';
		}
		return str;
	}
}

/**
 * Normalize event creation in browsers
 * @param {string} name
 * @returns {Event}
 */
export function createEvent(name) {
	// Modern browsers
	if (typeof Event === 'function') {
		return new Event(name);
	}

	// IE 11...
	let event = document.createEvent('Event');
	event.initEvent(name, true, true);
	return event;
}

/**
 * Sort a cssText alphabetically.
 * @param {string} cssText
 */
export function sortCss(cssText) {
	return (
		cssText
			.split(';')
			.filter(Boolean)
			.map(s => s.replace(/^\s+|\s+$/g, '').replace(/(\s*:\s*)/g, ': '))
			.sort((a, b) => {
				// CSS Variables are typically positioned at the start
				if (a[0] === '-') {
					// If both are a variable we just compare them
					if (b[0] === '-') return a.localeCompare(b);
					return -1;
				}
				// b is a css var
				if (b[0] === '-') return 1;

				return a.localeCompare(b);
			})
			.join('; ') + ';'
	);
}

/**
 * Setup the test environment
 * @returns {HTMLDivElement}
 */
export function setupScratch() {
	const scratch = document.createElement('div');
	scratch.id = 'scratch';
	(document.body || document.documentElement).appendChild(scratch);
	return scratch;
}

let oldOptions = null;
export function clearOptions() {
	oldOptions = assign({}, options);
	delete options.vnode;
	delete options.diffed;
	delete options.unmount;
	delete options._diff;
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	if (scratch) {
		scratch.parentNode.removeChild(scratch);
	}

	if (oldOptions != null) {
		assign(options, oldOptions);
		oldOptions = null;
	}

	testUtilTeardown();

	if (getLog().length > 0) {
		clearLog();
	}
}

const Foo = () => 'd';
export const getMixedArray = () =>
	// Make it a function so each test gets a new copy of the array
	[0, 'a', 'b', <span>c</span>, <Foo />, null, undefined, false, ['e', 'f'], 1];
export const mixedArrayHTML = '0ab<span>c</span>def1';

/**
 * Reset obj to empty to keep reference
 * @param {object} obj
 */
export function clear(obj) {
	Object.keys(obj).forEach(key => delete obj[key]);
}

/**
 * Hacky normalization of attribute order across browsers.
 * @param {string} html
 */
export function sortAttributes(html) {
	return html.replace(
		/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi,
		(s, pre, attrs, after) => {
			let list = attrs
				.match(/\s[a-z0-9:_.-]+=".*?"/gi)
				.sort((a, b) => (a > b ? 1 : -1));
			if (~after.indexOf('/')) after = '></' + pre + '>';
			return '<' + pre + list.join('') + after;
		}
	);
}

export const spyAll = obj =>
	Object.keys(obj).forEach(key => sinon.spy(obj, key));
export const resetAllSpies = obj =>
	Object.keys(obj).forEach(key => {
		if (obj[key].args) {
			obj[key].resetHistory();
		}
	});
