import { toChildArray } from 'preact';

const mapFn = (children, fn, context) => {
	if (!children) return null;
	return toChildArray(children).reduce(
		(acc, value, index) => acc.concat(fn.call(context, value, index)),
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
		const normalized = toChildArray(children);
		if (normalized.length !== 1) throw 'Children.only';
		return normalized[0];
	},
	toArray: toChildArray
};
