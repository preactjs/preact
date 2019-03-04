import { createElement as h, Component, options } from '../../src';
import { assign } from '../../src/util';
import { clearLog, getLog } from './logCall';

/** @jsx h */


const VOID_ELEMENTS = /^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/;

const el = document.createElement('div');
const innerHtmlDef = Object.getOwnPropertyDescriptor(el.ownerDocument.defaultView.Element.prototype, 'innerHTML');
function encodeEntities(str) {
	el.textContent = str;
	return innerHtmlDef.get.call(el);
}

/**
 * Serialize a DOM tree.
 * Uses deterministic sorting where necessary to ensure consistent tests.
 * @param {Element|Node} node	The root node to serialize
 * @returns {String} html
 */
function serializeDomTree(node) {
	if (node.nodeType === 3) {
		return encodeEntities(node.data);
	}
	else if (node.nodeType === 8) {
		return '<!--' + encodeEntities(node.data) + '-->';
	}
	else if (node.nodeType === 1 || node.nodeType === 9) {
		let str = '<' + node.localName;
		const attrs = [];
		for (let i=0; i<node.attributes.length; i++) {
			attrs.push(node.attributes[i].name);
		}
		attrs.sort();
		for (let i=0; i<attrs.length; i++) {
			const name = attrs[i];
			const value = node.getAttribute(name);
			if (value == null) continue;
			if (!value && name==='class') continue;
			str += ' ' + name;
			str += '="' + encodeEntities(value) + '"';
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

function getInnerHTML() {
	let str = '';
	let child = this.firstChild;
	while (child) {
		str += serializeDomTree(child);
		child = child.nextSibling;
	}
	return str;
}

function setupDeterministicInnerHTML(element) {
	const doc = element.ownerDocument || window.document;
	const elementProto = doc.defaultView.Element.prototype;
	let def = Object.getOwnPropertyDescriptor(elementProto, 'innerHTML');
	if (def.get !== getInnerHTML) {
		def = Object.assign({}, def, { get: getInnerHTML });
		Object.defineProperty(elementProto, 'innerHTML', def);
	}
}

/**
 * Setup the test environment
 * @returns {HTMLDivElement}
 */
export function setupScratch() {
	const scratch = document.createElement('div');
	scratch.id = 'scratch';
	(document.body || document.documentElement).appendChild(scratch);
	setupDeterministicInnerHTML(scratch);
	return scratch;
}

let oldOptions = null;
export function clearOptions() {
	oldOptions = assign({}, options);
	delete options.vnode;
	delete options.diff;
	delete options.diffed;
	delete options.commit;
	delete options.unmount;
}

/**
 * Teardown test environment and reset preact's internal state
 * @param {HTMLDivElement} scratch
 */
export function teardown(scratch) {
	scratch.parentNode.removeChild(scratch);

	if (oldOptions != null) {
		assign(options, oldOptions);
		oldOptions = null;
	}

	if (Component.__test__drainQueue) {
		// Flush any pending updates leftover by test
		Component.__test__drainQueue();
		delete Component.__test__drainQueue;
	}

	if (typeof Component.__test__previousDebounce !== 'undefined') {
		options.debounceRendering = Component.__test__previousDebounce;
		delete Component.__test__previousDebounce;
	}

	if (getLog().length > 0) {
		clearLog();
	}
}

const Foo = () => 'd';
export const getMixedArray = () => (
	// Make it a function so each test gets a new copy of the array
	[0, 'a', 'b', <span>c</span>, <Foo />, null, undefined, false, ['e', 'f'], 1]
);
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
	return html.replace(/<([a-z0-9-]+)((?:\s[a-z0-9:_.-]+=".*?")+)((?:\s*\/)?>)/gi, (s, pre, attrs, after) => {
		let list = attrs.match(/\s[a-z0-9:_.-]+=".*?"/gi).sort( (a, b) => a>b ? 1 : -1 );
		if (~after.indexOf('/')) after = '></'+pre+'>';
		return '<' + pre + list.join('') + after;
	});
}
