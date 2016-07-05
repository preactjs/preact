/* eslint-disable */

/** Find constants (identified by ALL_CAPS_DECLARATIONS), and inline them globally.
 *	This is safe because Preact *only* uses global constants.
 */
module.exports = function(file, api, options) {
	var j = api.jscodeshift,
		code = j(file.source),
		constants = {},
		found = 0;

	code.find(j.VariableDeclaration)
		.filter(function(decl) {
			for (var i=decl.value.declarations.length; i--; ) {
				var node = decl.value.declarations[i],
					name = node.id && node.id.name,
					init = node.init;
				if (name && init && name.match(/^[A-Z0-9_$]+$/g)) {
					if (init.type==='Literal') {
						console.log('Inlining constant: '+name+'='+init.raw);
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

	code.find(j.Identifier)
		.filter(function(path) {
			return path.value.name && constants.hasOwnProperty(path.value.name);
		})
		.replaceWith(function(path) {
			found++;
			return constants[path.value.name];
		});

	return found ? code.toSource({ quote: 'single' }) : null;
};
