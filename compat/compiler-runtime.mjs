import { useMemo } from 'preact/hooks';

const $empty = Symbol.for('react.memo_cache_sentinel');

export function c(size) {
	return useMemo(() => Array(size).fill($empty), []);
}
