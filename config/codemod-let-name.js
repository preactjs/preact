/**
 * Restores var names transformed by babel's let block scoping
 */
export default (file, api) => {
	let j = api.jscodeshift;
	let code = j(file.source);

	// @TODO unsafe, but without it we gain 20b gzipped: https://www.diffchecker.com/bVrOJWTO
	code.findVariableDeclarators().filter(d => /^_i/.test(d.value.id.name)).renameTo('i');
	code.findVariableDeclarators('_key').renameTo('key');

	return code.toSource({ quote: 'single' });
};
