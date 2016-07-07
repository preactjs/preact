/** Retains a pool of Components for re-use, keyed on component name.
 *	Note: since component names are not unique or even necessarily available, these are primarily a form of sharding.
 *	@private
 */
const components = {};


export function collectComponent(component) {
	let name = component.constructor.name,
		list = components[name];
	if (list) list.push(component);
	else components[name] = [component];
}


export function createComponent(Ctor, props, context, fresh) {
	let inst = new Ctor(props, context),
		list = !fresh && components[Ctor.name];
	if (list) {
		for (let i=list.length; i--; ) {
			if (list[i].constructor===Ctor) {
				inst.nextBase = list[i].base;
				list.splice(i, 1);
				break;
			}
		}
	}
	return inst;
}
