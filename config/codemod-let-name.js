/**
 * Restores var names transformed by babel's let block scoping
 */
export default (file, api) => {
	let j = api.jscodeshift;
	let code = j(file.source);

	code.findVariableDeclarators().filter(d => /^_i/.test(d.value.id.name)).renameTo('i');
	code.findVariableDeclarators('_key').renameTo('key');

	return code.toSource({ quote: 'single' });
};
