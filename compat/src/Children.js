import { toChildArray } from 'preact';

const mapFn = (children, fn) => {
	if (!children) return null;
	return toChildArray(children).reduce(
		(acc, value, index) => acc.concat(fn(value, index)),
		[]
	);
};

// This API is completely unnecessary for Preact, so it's basically passthrough.
export const Children = {
	map: mapFn,
	forEach: mapFn,
	count(children) {
		return children ? toChildArray(children).length : 0;
	},
	only(children) {
		children = toChildArray(children);
		if (children.length !== 1) {
			throw new Error('Children.only() expects only one child.');
		}
		return children[0];
	},
	toArray: toChildArray
};
