/* eslint no-console:0 */

/** Find constants (identified by ALL_CAPS_DECLARATIONS), and inline them globally.
 *	This is safe because Preact *only* uses global constants.
 */
export default (file, api) => {
	let j = api.jscodeshift,
		code = j(file.source),
		constants = {},
		found = 0;

	code
		.find(j.VariableDeclaration)
		.filter(decl => {
			for (let i = decl.value.declarations.length; i--; ) {
				let node = decl.value.declarations[i],
					name = node.id && node.id.name,
					init = node.init;
				if (name && init && name.match(/^[A-Z0-9_$]+$/g) && !init.regex) {
					if (init.type === 'Literal') {
						// console.log(`Inlining constant: ${name}=${init.raw}`);
						found++;
						constants[name] = init;
						// remove declaration
						decl.value.declarations.splice(i, 1);
						// if it's the last, we'll remove the whole statement
						return !decl.value.declarations.length;
					}
				}
			}
			return false;
		})
		.remove();

	code
		.find(j.Identifier)
		.filter(
			path => path.value.name && constants.hasOwnProperty(path.value.name)
		)
		.replaceWith(path => (found++, constants[path.value.name]));

	return found ? code.toSource({ quote: 'single' }) : null;
};
