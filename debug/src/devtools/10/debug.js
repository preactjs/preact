import { parseTable, flushTable } from './string-table';
import {
	ADD_VNODE,
	UPDATE_VNODE_TIMINGS,
	REMOVE_VNODE,
	REORDER_CHILDREN,
	ADD_ROOT,
	FUNCTION_COMPONENT,
	HTML_ELEMENT
} from './constants';

// The code in this file is only used in unit tests or to make debugging
// the devtools adapter easier. It's not used by the integration itself
// and will thus be tree-shaken away.

/**
 * Convert
 * @param {number[]} data
 * @returns {import('./types').ParsedMsg}
 */
export function parseCommitMessage(data) {
	const rootId = data[0];

	// String table
	let i = 1;
	const len = data[i++];
	const strings = parseTable(data.slice(1, len + 2));
	let mounts = [];
	let unmounts = [];
	let timings = [];
	let reorders = [];

	i = len > 0 ? len + 2 : i;

	for (; i < data.length; i++) {
		switch (data[i]) {
			case ADD_VNODE: {
				const id = data[i + 1];
				const name = strings[data[i + 5] - 1];
				const parentId = data[i + 3];
				/* istanbul ignore next */
				const key = data[i + 6] > 0 ? strings[i + 6 - 1] : '';
				mounts.push({ id, name, key, parentId });
				i += 6;
				break;
			}
			case UPDATE_VNODE_TIMINGS:
				timings.push({ id: data[i + 1], duration: data[i + 2] });
				i += 2;
				break;
			case REMOVE_VNODE: {
				const unmountLen = data[i + 1];
				i += 2;
				const len = i + unmountLen;
				for (; i < len; i++) {
					unmounts.push(data[i]);
				}
				break;
			}
			case REORDER_CHILDREN: {
				reorders.push({
					id: data[i + 1],
					children: data.slice(i + 3, i + 3 + data[i + 2])
				});
				i += 3 + data[i + 2];
				break;
			}
		}
	}

	return {
		rootId,
		mounts,
		unmounts,
		timings,
		reorders
	};
}

/**
 *
 * @param {import("./types").ParsedMsg} msg
 */
export function formatForTest(msg) {
	let out = [];
	out.push('rootId: ' + msg.rootId);
	msg.mounts.forEach(m => {
		/* istanbul ignore next */
		const key = m.key ? '#' + m.key : '';
		out.push(`Add ${m.id} <${m.name}${key}> to parent ${m.parentId}`);
	});
	msg.timings.forEach(t => {
		out.push(`Update timings ${t.id}`);
	});
	msg.reorders.forEach(r => {
		out.push(`Reorder ${r.id} [${r.children.join(', ')}]`);
	});
	msg.unmounts.forEach(u => {
		out.push(`Remove ${u}`);
	});

	return out;
}

/**
 *
 * @param {number[]} data
 */
export function toSnapshot(data) {
	const parsed = parseCommitMessage(data);
	return formatForTest(parsed);
}

/**
 *
 * @param  {string[]} strs
 */
export function toStringTable(...strs) {
	const init = /** @type {*} */ (strs.map((x, i) => [x, i]));
	return flushTable(new Map(init));
}

/**
 *
 * @param {string[]} events
 * @returns {number[]}
 */
/* istanbul ignore next */
export function fromSnapshot(events) {
	const out = [];
	let operations = [];
	let strings = [];
	let unmounts = [];

	if (/^rootId:/.test(events[0])) {
		const id = +events[0].slice(events[0].indexOf(':') + 1);
		out.push(id);
		operations.push(ADD_ROOT, id);
	} else {
		throw new Error('rootId must be first event');
	}

	for (let i = 1; i < events.length; i++) {
		const ev = events[i];
		if (/^Add/.test(ev)) {
			const m = ev.match(/Add\s+(\d+)\s+<([#]?\w+)>\s+to\sparent\s(\d+)/);
			if (m) {
				let idx = strings.indexOf(m[2]);
				if (idx == -1) {
					idx = strings.push(m[2]);
				}

				operations.push(
					ADD_VNODE,
					+m[1],
					m[2][0] !== m[2][0].toLowerCase() ? FUNCTION_COMPONENT : HTML_ELEMENT,
					+m[3],
					9999,
					idx,
					0
				);
			} else {
				throw new Error('no match: ' + ev);
			}
		} else if (/^Update\stimings/.test(ev)) {
			const m = ev.match(/Update\stimings\s(\d+)\s+duration\s+(\d+)/);
			if (m) {
				const id = +m[1];
				const duration = +m[2];
				operations.push(UPDATE_VNODE_TIMINGS, id, duration);
			} else {
				throw new Error('no match: ' + ev);
			}
		} else if (/^Remove/.test(ev)) {
			const m = ev.match(/Remove\s+(\d+)/);
			if (m) {
				const id = +m[1];
				unmounts.push(id);
			} else {
				throw new Error('no match: ' + ev);
			}
		} else if (/^Reorder/.test(ev)) {
			const m = ev.match(/Reorder\s+(\d+)\s+([[].*[\]])/);
			if (m) {
				const id = +m[1];
				const children = JSON.parse(m[2]);
				operations.push(REORDER_CHILDREN, id, children.length, ...children);
			} else {
				throw new Error('no match: ' + ev);
			}
		}
	}

	out.push(...flushTable(new Map(strings.map((x, i) => [x, i]))));
	if (unmounts.length > 0) {
		out.push(REMOVE_VNODE, unmounts.length, ...unmounts);
	}
	out.push(...operations);

	return out;
}

/**
 *
 * @param {number[]} data
 */
/* istanbul ignore next */
export function printCommit(data) {
	/* eslint-disable no-console */
	console.group('commit', data);
	try {
		console.log('root id: ', data[0]);
		let i = 1;

		// String table
		const len = data[i++];
		const strings = [];
		if (len > 0) {
			for (; i < len + 1; i++) {
				const strLen = data[i];
				const start = i + 1;
				const end = i + strLen + 1;
				const str = String.fromCodePoint(...data.slice(start, end));
				strings.push(str);
				i += strLen;
			}
			i += 2;
			console.log('strings: ', strings);
		} else {
			console.log('strings: none');
		}

		for (; i < data.length; i++) {
			switch (data[i]) {
				case ADD_VNODE: {
					const id = data[i + 1];
					const name = strings[data[i + 5] - 1];
					const key = data[i + 6] > 0 ? ` key="${strings[i + 6 - 1]}" ` : '';
					const parentId = data[i + 3];
					console.log(
						`Add %c${id} %c<${name}${key}>%c to parent %c${parentId}`,
						'color: yellow',
						'color: violet',
						'color: inherit',
						'color: green'
					);
					i += 6;
					break;
				}
				case REMOVE_VNODE: {
					const unmounts = data[i + 1];
					i += 2;
					const len = i + unmounts;
					console.log(`total unmounts: ${unmounts}`);
					for (; i < len; i++) {
						console.log(`  Remove: %c${data[i]}`, 'color: red');
					}
					break;
				}
				case REORDER_CHILDREN: {
					const id = data[i + 1];
					const children = data.slice(i + 3, i + 3 + data[i + 2]);
					console.log(`Reorder: ${id}, [${children.join(', ')}]`);
					break;
				}
			}
		}
	} catch (err) {
		console.error(err);
	}
	console.groupEnd();
	/* eslint-enable no-console */
}
