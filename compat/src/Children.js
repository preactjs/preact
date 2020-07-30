import { toChildArray } from 'preact';

const mapFn = (children, fn) => {
	if (!children) return null;
	return toChildArray(children).map(fn);
};

// This API is completely unnecessary for Preact, so it's basically passthrough.
export const Children = {
	map: mapFn,
	forEach: mapFn,
	count(children) {
		return children ? toChildArray(children).length : 0;
	},
	only(children) {
		return toChildArray(children)[0];
	},
	toArray: toChildArray
};
