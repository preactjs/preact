const ENCODED_ENTITIES = /["&<]/;

/** @param {string} str */
export function encodeEntities(str) {
	// Skip all work for strings with no entities needing encoding:
	return ENCODED_ENTITIES.test(str)
		? str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
		: str;
}
