import { getDisplayName } from './vnode';

export function getType(data) {
	switch (typeof data) {
		case 'string': return 'string';
		case 'function': return 'function';
		case 'number': return 'number';
		case 'boolean': return 'boolean';
		case 'symbol': return 'symbol';
		case 'object': {
			if (data==null) return null;
			if (data.type!==undefined && data._parent!==undefined) return 'vnode';
			if (typeof data.getMonth=='function') return 'date';
			if (Array.isArray(data)) return 'array';
			if (data instanceof HTMLElement) return 'html';
			if (data instanceof Set) return 'set';
			if (data instanceof Map) return 'map';
			return 'object';
		}
		default:
			return null;
	}
}

// Limit for pretty-printing
let LEVEL_LIMIT = 6;

/**
 * Pretty-Print any value in the devtool's very specific format
 * @param {*} data The data to clean
 * @param {Array<import('../internal').Path>} cleaned Array of cleaned paths
 * @param {import('../internal').Path} path Current path in the data structure
 * @param {number} level The maximum depth to clean
 */
export function prettify(data, cleaned, path, level) {
	let type = getType(data);

	switch (type) {
		case 'function':
			cleaned.push(path);
			return {
				name: data.name,
				type: 'function'
			};
		case 'string':
			return data.length <= 500 ? data : data.slice(0, 500) + '...';
		case 'symbol':
			cleaned.push(path);
			return {
				inspectable: false,
				name: data.toString(),
				type: 'symbol'
			};
		case 'array':
		case 'typed_array':
			if (level > LEVEL_LIMIT) {
				cleaned.push(path);
				return {
					inspectable: true,
					name: data.constructor.name,
					type,
					size: data.length,
					readonly: type==='typed_array'
				};
			}

			return data.map((x, i) => prettify(x, cleaned, path.concat([i]), level + 1));
		case 'object': {
			if (level > LEVEL_LIMIT) {
				cleaned.push(path);
				return {
					inspectable: true,
					name: 'Object',
					type: 'object'
				};
			}

			let res = {};
			for (let name in data) {
				res[name] = prettify(
					data[name],
					cleaned,
					path.concat([name]),
					level + 1
				);
			}
			return res;
		}
		case 'vnode':
			cleaned.push(path);
			return {
				inspectable: false,
				name: getDisplayName(data),
				type: 'react_element'
			};
		case 'date':
			cleaned.push(path);
			return {
				inspectable: false,
				name: data.toString(),
				type: 'date'
			};
		default:
			return data;
	}
}

export function cleanForBridge(data) {
	if (data==null) return null;
	let cleaned = [];
	return {
		data: prettify(data, cleaned, [], 0),
		cleaned
	};
}
