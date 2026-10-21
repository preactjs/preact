const { useMemo } = require('preact/hooks');

const $empty = Symbol.for('react.memo_cache_sentinel');

exports.c = function c(size) {
	return useMemo(() => Array(size).fill($empty), []);
};
