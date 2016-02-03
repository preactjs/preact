import { empty, delve } from './util';

/** Create an Event handler function that sets a given state property.
 *	@param {Component} component	The component whose state should be updated
 *	@param {string} key				A dot-notated key path to update in the component's state
 *	@param {string} eventPath		A dot-notated key path to the value that should be retrieved from the Event or component
 *	@returns {function} linkedStateHandler
 *	@private
 */
export function createLinkedState(component, key, eventPath) {
	let path = key.split('.'),
		p0 = path[0];
	return function(e) {
		let t = this,
			s = component.state,
			obj = s,
			v, i;
		if (typeof eventPath==='string') {
			v = delve(e, eventPath);
			if (empty(v) && (t=t._component)) {
				v = delve(t, eventPath);
			}
		}
		else {
			v = (t.nodeName+t.type).match(/^input(checkbox|radio)$/i) ? t.checked : t.value;
		}
		if (typeof v==='function') v = v.call(t);
		for (i=0; i<path.length-1; i++) {
			obj = obj[path[i]] || {};
		}
		obj[path[i]] = v;
		component.setState({ [p0]: s[p0] });
	};
}
