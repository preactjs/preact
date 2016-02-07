/** Retains a pool of Components for re-use, keyed on component name.
 *	Note: since component names are not unique or even necessarily available, these are primarily a form of sharding.
 *	@private
 */
let components = {};


export function collectComponent(component) {
	let name = component.constructor.name,
		list = components[name];
	if (list) list.push(component);
	else components[name] = [component];
}


export function createComponent(ctor, props, context) {
	let list = components[ctor.name];
	if (list && list.length) {
		for (let i=list.length; i--; ) {
			if (list[i].constructor===ctor) {
				return list.splice(i, 1)[0];
			}
		}
	}
	return new ctor(props, context);
}
