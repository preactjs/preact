export function prettify(data, cleaned, path, level) {
	let type;

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
		case 'object': {
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
