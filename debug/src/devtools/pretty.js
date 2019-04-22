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
			if (data._dom!==undefined) return 'vnode';
			if (typeof data.getMonth=='function') return 'date';
			if (Array.isArray(data)) return 'array';
			return 'object';
		}
		default:
			return null;
	}
}

let LEVEL_LIMIT = 6;

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
				name: data.toString(),
				type: 'symbol'
			};
		case 'array':
		case 'typed_array':
			if (level > LEVEL_LIMIT) {
				cleaned.push(path);
				return {
					name: data.constructor.name,
					type,
					meta: { length: data.length, readOnly: type=='typed_array' }
				};
			}

			return data.map((x, i) => prettify(x, cleaned, path.concat([i])), level++);
		case 'object': {
			if (level > LEVEL_LIMIT) {
				cleaned.push(path);
				return {
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
				name: getDisplayName(data),
				type: 'react_element'
			};
		case 'date':
			cleaned.push(path);
			return {
				name: data.toString(),
				type: 'date',
				meta: {
					uninspectable: true
				}
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
