import options from './options';


/** Invoke a hook on the `options` export. */
export function optionsHook(name, a) {
	if (options[name]) return options[name](a);
}
