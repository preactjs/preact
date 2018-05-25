/** Global options
 *	@public
 *	@namespace options {Object}
 */
export default {

	/**
	 * If `true`, `prop` changes trigger synchronous component updates.
	 * @name syncComponentUpdates
	 * @type {boolean}
	 * @default true
	 */
	//syncComponentUpdates: true,

	/**
	 * Processes all created VNodes.
	 * @param {VNode} vnode	A newly-created VNode to normalize/process
	 */
	//vnode(vnode) { }

	/**
	 * Compares two Components
	 * @param {Component} component1 First Component to compare
	 * @param {Component} component2 Second Component to compare
	 * @returns Boolean, true if components are equal
   */
	areComponentsEqual(component1, component2) {
		// default implementation is 4x times faster than optional object property access
		return component1 === component2;
	}

	/** Hook invoked after a component is mounted. */
	// afterMount(component) { }

	/** Hook invoked after the DOM is updated with a component's latest render. */
	// afterUpdate(component) { }

	/** Hook invoked immediately before a component is unmounted. */
	// beforeUnmount(component) { }
};
