import { empty, isString, isFunction, delve } from './util';

/** Create an Event handler function that sets a given state property.
 *	@param {Component} component	The component whose state should be updated
 *	@param {string} key				A dot-notated key path to update in the component's state
 *	@param {string} eventPath		A dot-notated key path to the value that should be retrieved from the Event or component
 *	@returns {function} linkedStateHandler
 *	@private
 */
export function createLinkedState(component, key, eventPath) {
	let path = key.split('.'),
		p0 = path[0],
		len = path.length;
	return function(e) {
		let t = this,
			s = component.state,
			obj = s,
			v, i;
		if (isString(eventPath)) {
			v = delve(e, eventPath);
			if (empty(v) && (t=t._component)) {
				v = delve(t, eventPath);
			}
		}
		else {
			v = (t.nodeName+t.type).match(/^input(checkbox|radio)$/i) ? t.checked : t.value;
		}
		if (isFunction(v)) v = v.call(t);
		if (len>1) {
			for (i=0; i<len-1; i++) {
				obj = obj[path[i]] || (obj[path[i]] = {});
			}
			obj[path[i]] = v;
			v = s[p0];
		}
		component.setState({ [p0]: v });
	};
}
