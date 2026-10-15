export const assign = Object.assign;

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function shallowDiffers(a, b) {
	for (let i in a) if (i != '__source' && a[i] !== b[i]) return true;
	for (let i in b) if (i != '__source' && !(i in a)) return true;
	return false;
}

// Style keys whose numeric values stay unitless, matched case-insensitively
// after an optional webkit prefix, e.g. flexGrow, WebkitFlexGrow, --foo.
export const IS_NON_DIMENSIONAL =
	/^(w.{5})?(-|a[^g]*$|(bo|s).{4}im|box|c.*n[st]$|[fg].*[^pse]$|ini|li|ma.{5}(d|s$)|o[pr]|sca|st|ta|wido|z)/i;
