/**
 * tag to remove leading whitespace from tagged template
 * literal.
 * @param {TemplateStringsArray}
 * @returns {string}
 */
export function dedent([str]) {
	return str
		.split('\n' + str.match(/^\n*(\s+)/)[1])
		.join('\n')
		.replace(/(^\n+|\n+\s*$)/g, '');
}
