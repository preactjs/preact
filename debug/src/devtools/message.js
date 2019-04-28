import { TREE_OPERATION_REMOVE, TREE_OPERATION_ADD, ElementTypeClass, ElementTypeRoot, ElementTypeOtherOrUnknown, ElementTypeFunction } from './constants';

/**
 * Convert a message to the devtools into a human readable format
 * @param {Uint32Array | number[]} msg The message that will be sent to the extension
 */
export function parseMessage(msg) {
	let allStrLengths = msg[2];
	let pos = 2;
	let strings = [];
	let strMap = new Map();
	let id = 0;
	for (let i = 0; i < allStrLengths; i++) {
		let len = msg[i+3];
		let chars = msg.slice(i+4, i+4+len);
		let str = '';
		chars.forEach(x => str += String.fromCodePoint(x));
		strMap.set(id + 1, str);
		strings.push(str);
		i += len;
		id++;
	}

	pos += allStrLengths;

	if (msg[++pos]!==TREE_OPERATION_REMOVE) {
		throw new Error(`String table must be followed by TREE_OPERATION_REMOVE`);
	}

	let unmounts = [];
	let expectedUnmounts = msg[++pos];
	for (let i = 0; i < expectedUnmounts; i++) {
		unmounts.push(msg[pos + i + 1]);
	}
	pos += expectedUnmounts + 1;

	let operations = [];
	for (let i = 0; pos + i < msg.length; i++) {
		switch (msg[pos+i]) {
			case TREE_OPERATION_ADD: {
				let kind = parseElementType(msg[pos+i+2]);
				let id = msg[pos+i+1];

				if (msg[pos+i+2]==ElementTypeRoot) {
					operations.push({
						type: 'ADD',
						id,
						kind,
						supportsProfiling: msg[pos+i+3]===1,
						hasOwnerMetadata: !!msg[pos+i+4]
					});
					i+=4;
				}
				else {
					operations.push({
						type: 'ADD',
						id,
						kind,
						parentId: msg[pos+i+3],
						owner: msg[pos+i+4],
						name: strMap.get(msg[pos+i+5]),
						key: msg[pos+i+6]!==0 ? strMap.get(msg[pos+i+6]) : null
					});
					i+=6;
				}
				continue;
			}
			case TREE_OPERATION_REMOVE:
				operations.push({
					type: 'REMOVE',
					items: msg[pos+i+1],
					id: msg[pos+i+2]
				});
				i+=2;
				continue;
			default:
				throw new Error('TODO: Not implemented');
		}
	}

	return {
		rendererId: msg[0],
		rootVNodeId: msg[1],
		stringTable: {
			length: allStrLengths,
			items: strings
		},
		unmounts,
		operations
	};
}

export function parseElementType(n) {
	switch (n) {
		case ElementTypeClass:
			return 'ClassComponent';
		case ElementTypeFunction:
			return 'FunctionalComponent';
		case ElementTypeOtherOrUnknown:
			return 'OtherOrUnkown';
		case ElementTypeRoot:
			return 'Root';
		default:
			throw new Error('TODO: Implement' + n);
	}
}
