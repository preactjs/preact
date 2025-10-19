/**
 * String utility functions for Preact
 * Helper functions for common string operations
 */

/**
 * Capitalize the first letter of a string
 * @param {string} str The string to capitalize
 * @returns {string} The capitalized string
 */
export function capitalize(str) {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Convert a string to camelCase
 * @param {string} str The string to convert
 * @returns {string} The camelCase string
 */
export function camelCase(str) {
	return str
		.replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
		.replace(/^(.)/, (_, char) => char.toLowerCase());
}

/**
 * Convert a string to kebab-case
 * @param {string} str The string to convert
 * @returns {string} The kebab-case string
 */
export function kebabCase(str) {
	return str
		.replace(/([a-z])([A-Z])/g, '$1-$2')
		.replace(/[\s_]+/g, '-')
		.toLowerCase();
}

/**
 * Convert a string to snake_case
 * @param {string} str The string to convert
 * @returns {string} The snake_case string
 */
export function snakeCase(str) {
	return str
		.replace(/([a-z])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase();
}

/**
 * Truncate a string to a specified length
 * @param {string} str The string to truncate
 * @param {number} length The maximum length
 * @param {string} [suffix='...'] The suffix to add when truncated
 * @returns {string} The truncated string
 */
export function truncate(str, length, suffix = '...') {
	if (str.length <= length) return str;
	return str.slice(0, length - suffix.length) + suffix;
}

/**
 * Escape HTML special characters
 * @param {string} str The string to escape
 * @returns {string} The escaped string
 */
export function escapeHtml(str) {
	const htmlEscapes = {
		'&': '&amp;',
		'<': '&lt;',
		'>': '&gt;',
		'"': '&quot;',
		"'": '&#39;'
	};
	
	return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Unescape HTML special characters
 * @param {string} str The string to unescape
 * @returns {string} The unescaped string
 */
export function unescapeHtml(str) {
	const htmlUnescapes = {
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&#39;': "'"
	};
	
	return str.replace(/&(?:amp|lt|gt|quot|#39);/g, entity => htmlUnescapes[entity]);
}

/**
 * Remove all whitespace from a string
 * @param {string} str The string to trim
 * @returns {string} The string without whitespace
 */
export function removeWhitespace(str) {
	return str.replace(/\s+/g, '');
}

/**
 * Convert a string to title case
 * @param {string} str The string to convert
 * @returns {string} The title case string
 */
export function titleCase(str) {
	return str
		.toLowerCase()
		.split(' ')
		.map(word => capitalize(word))
		.join(' ');
}

/**
 * Check if a string starts with a given substring
 * @param {string} str The string to check
 * @param {string} searchString The substring to search for
 * @returns {boolean} True if str starts with searchString
 */
export function startsWith(str, searchString) {
	return str.indexOf(searchString) === 0;
}

/**
 * Check if a string ends with a given substring
 * @param {string} str The string to check
 * @param {string} searchString The substring to search for
 * @returns {boolean} True if str ends with searchString
 */
export function endsWith(str, searchString) {
	return str.indexOf(searchString, str.length - searchString.length) !== -1;
}

/**
 * Pad a string to a certain length with a character
 * @param {string} str The string to pad
 * @param {number} length The target length
 * @param {string} [char=' '] The character to pad with
 * @param {boolean} [atStart=false] Whether to pad at the start
 * @returns {string} The padded string
 */
export function pad(str, length, char = ' ', atStart = false) {
	const padding = char.repeat(Math.max(0, length - str.length));
	return atStart ? padding + str : str + padding;
}

/**
 * Generate a random string of specified length
 * @param {number} length The length of the string
 * @param {string} [chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] Characters to use
 * @returns {string} The random string
 */
export function randomString(
	length,
	chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
) {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Check if a string is empty or contains only whitespace
 * @param {string} str The string to check
 * @returns {boolean} True if string is empty or whitespace
 */
export function isBlank(str) {
	return !str || /^\s*$/.test(str);
}

/**
 * Count the occurrences of a substring in a string
 * @param {string} str The string to search in
 * @param {string} searchString The substring to count
 * @returns {number} The number of occurrences
 */
export function countOccurrences(str, searchString) {
	if (searchString.length === 0) return 0;
	
	let count = 0;
	let position = 0;
	
	while ((position = str.indexOf(searchString, position)) !== -1) {
		count++;
		position += searchString.length;
	}
	
	return count;
}
