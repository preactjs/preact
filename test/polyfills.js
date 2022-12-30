// ES2015 APIs used by developer tools integration
import 'core-js/es/map';
import 'core-js/es/promise';
import 'core-js/es/array/fill';
import 'core-js/es/array/from';
import 'core-js/es/array/find';
import 'core-js/es/array/includes';
import 'core-js/es/string/includes';
import 'core-js/es/object/assign';
import 'core-js/es/string/starts-with';
import 'core-js/es/string/code-point-at';
import 'core-js/es/string/from-code-point';
import 'core-js/es/string/repeat';
import * as kl from 'kolorist';

// Something that's loaded before this file polyfills Symbol object.
// We need to verify that it works in IE without that.
if (/Trident/.test(window.navigator.userAgent)) {
	window.Symbol = undefined;
}

// Fix Function#name on browsers that do not support it (IE).
// Taken from: https://stackoverflow.com/a/17056530/755391
if (!function f() {}.name) {
	Object.defineProperty(Function.prototype, 'name', {
		get() {
			let name = (this.toString().match(/^function\s*([^\s(]+)/) || [])[1];
			// For better performance only parse once, and then cache the
			// result through a new accessor for repeated access.
			Object.defineProperty(this, 'name', { value: name });
			return name;
		}
	});
}

/* global chai */
chai.use((chai, util) => {
	const Assertion = chai.Assertion;

	Assertion.addMethod('equalNode', function(expectedNode, message) {
		const obj = this._obj;
		message = message || 'equalNode';

		if (expectedNode == null) {
			this.assert(
				obj == null,
				`${message}: expected node to "== null" but got #{act} instead.`,
				`${message}: expected node to not "!= null".`,
				expectedNode,
				obj
			);
		} else {
			new Assertion(obj).to.be.instanceof(Node, message);
			this.assert(
				obj.tagName === expectedNode.tagName,
				`${message}: expected node to have tagName #{exp} but got #{act} instead.`,
				`${message}: expected node to not have tagName #{act}.`,
				expectedNode.tagName,
				obj.tagName
			);
			this.assert(
				obj === expectedNode,
				`${message}: expected #{this} to be #{exp} but got #{act}`,
				`${message}: expected #	{this} not to be #{exp}`,
				expectedNode,
				obj
			);
		}
	});
});

//
// The following code overwrites karma's internal logging feature to
// support a much prettier and humand readable representation of
// console logs in our terminal. This includes indentation, coloring
// and support for Map and Set objects.
//
function patchConsole(method) {
	const original = window.console[method];
	window.console[method] = (...args) => {
		// @ts-ignore
		// eslint-disable-next-line no-undef
		__karma__.log(method, ['__LOG_CUSTOM:' + serializeConsoleArgs(args)]);
		original.apply(window.console, args);
	};
}

patchConsole('log');
patchConsole('warn');
patchConsole('error');
patchConsole('info');

/**
 * @param {any[]} args
 * @returns {[string]}
 */
function serializeConsoleArgs(args) {
	const flat = args.map(arg => serialize(arg, 'flat', 0, new Set()));
	// We don't have access to the users terminal width, so we'll try to
	// format everything into one line if possible and assume a terminal
	// width of 80 chars
	if (kl.stripColors(flat.join(', ')).length <= 80) {
		return [flat.join(', ')];
	}

	const serialized = args.map(arg => serialize(arg, 'default', 0, new Set()));
	return ['\n' + serialized.join(',\n') + '\n'];
}

/**
 * @param {number} n
 * @returns {string}
 */
function applyIndent(n) {
	if (n <= 0) return '';
	return '  '.repeat(n);
}

/**
 * @param {any} value
 * @param {"flat" | "default"} mode
 * @param {number} indent
 * @param {Set<any>} seen
 * @returns {string}
 */
function serialize(value, mode, indent, seen) {
	if (seen.has(value)) {
		return kl.cyan('[Circular]');
	}

	if (value === null) {
		return kl.bold('null');
	} else if (Array.isArray(value)) {
		seen.add(value);
		const values = value.map(v => serialize(v, mode, indent + 1, seen));
		if (mode === 'flat') {
			return `[ ${values.join(', ')} ]`;
		}

		const space = applyIndent(indent);
		const pretty = values.map(v => applyIndent(indent + 1) + v).join(',\n');
		return `[\n${pretty}\n${space}]`;
	} else if (value instanceof Set) {
		const values = [];
		value.forEach(v => {
			values.push(serialize(v, mode, indent, seen));
		});

		if (mode === 'flat') {
			return `Set(${value.size}) { ${values.join(', ')} }`;
		}

		const pretty = values.map(v => applyIndent(indent + 1) + v).join(',\n');
		return `Set(${value.size}) {\n${pretty}\n${applyIndent(indent)}}`;
	} else if (value instanceof Map) {
		const values = [];
		value.forEach((v, k) => {
			values.push([
				serialize(v, 'flat', indent, seen),
				serialize(k, 'flat', indent, seen)
			]);
		});

		if (mode === 'flat') {
			const pretty = values.map(v => `${v[0]} => ${v[1]}`).join(', ');
			return `Map(${value.size}) { ${pretty} }`;
		}

		const pretty = values
			.map(v => {
				return applyIndent(indent + 1) + `${v[0]} => ${v[1]}`;
			})
			.join(', ');
		return `Map(${value.size}) {\n${pretty}\n${applyIndent(indent)}}`;
	}

	switch (typeof value) {
		case 'undefined':
			return kl.dim('undefined');

		case 'bigint':
		case 'number':
		case 'boolean':
			return kl.yellow(String(value));
		case 'string': {
			// By default node's built in logging doesn't wrap top level
			// strings with quotes
			if (indent === 0) {
				return String(value);
			}
			const quote = /[^\\]"/.test(value) ? '"' : "'";
			return kl.green(String(quote + value + quote));
		}
		case 'symbol':
			return kl.green(value.toString());
		case 'function':
			return kl.cyan(`[Function: ${value.name || 'anonymous'}]`);
	}

	if (value instanceof Element) {
		return value.outerHTML;
	}
	if (value instanceof Error) {
		return value.stack;
	}

	seen.add(value);

	const props = Object.keys(value).map(key => {
		// Skip calling getters
		const desc = Object.getOwnPropertyDescriptor(value, key);
		if (typeof desc.get === 'function') {
			return `get ${key}()`;
		}

		const v = serialize(value[key], mode, indent + 1, seen);
		return `${key}: ${v}`;
	});

	if (props.length === 0) {
		return '{}';
	} else if (mode === 'flat') {
		const pretty = props.join(', ');
		return `{ ${pretty} }`;
	}

	const pretty = props.map(p => applyIndent(indent + 1) + p).join(',\n');
	return `{\n${pretty}\n${applyIndent(indent)}}`;
}

// Use these lines to test pretty formatting:
//
// const obj = { foo: 123 };
// obj.obj = obj;
// console.log(obj);
// console.log([1, 2]);
// console.log(new Set([1, 2]));
// console.log(new Map([[1, 2]]));
// console.log({
// 	foo: { bar: 123, bob: { a: 1 } }
// });
// console.log(
// 	'hey',
// 	null,
// 	undefined,
// 	[1, 2, ['a']],
// 	() => {},
// 	{
// 		type: 'div',
// 		props: {},
// 		key: undefined,
// 		ref: undefined,
// 		__k: null,
// 		__: null,
// 		__b: 0,
// 		__e: null,
// 		__d: undefined,
// 		__c: null,
// 		__h: null,
// 		constructor: undefined,
// 		__v: 1
// 	},
// 	{
// 		foo: { bar: 123, bob: { a: 1, b: new Set([1, 2]), c: new Map([[1, 2]]) } }
// 	},
// 	new Set([1, 2]),
// 	new Map([[1, 2]])
// );
// console.log(document.createElement('div'));
