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


export function createComponent(Ctor, props, context) {
	let list = components[Ctor.name],
		len = list && list.length,
		inst = new Ctor(props, context),
		c;
	for (let i=0; i<len; i++) {
		c = list[i];
		if (c.constructor===Ctor) {
			list.splice(i, 1);
			inst.nextBase = c.base;
			break;
		}
	}
	return inst;
}
