# NOTES

* Normalize VNode structure
	* _children contains an array of VNode children to render for Components, Fragments, and DOM elements
	* It is no longer just a cahce for `props.children`.
	* `props.children` is input into the render function. `_children` is the return value of that render function. You can think of DOM elements as Components that just return `props.children` from `render` (i.e. what Fragments do). Component's render function take `props.children` as an input but may or may not return it from `render` - just cause VNodes are layed out in an order in JSX does not mean that is the VNode they will result in. A Component could completely change it. The actual VNode children of a Component VNode is the render result.
* Always call `diffChildren` -> `diff` -> `diffChildren` -> ... repeat ...
	* Everything is Fragment now.
	* This makes it technically possible to make `diff` a single function! Could save a decent amount of bytes by reusing variables.
	* One place find and match oldVNode and newVNode: `diffChildren`
	* One place to mount and unmount DOM: `diffChildren` (could inline?)

* Perhaps in a later branch consider moving more internal fields from Component to VNode to make VNode structure the master structure for our Virtual DOM

## Breaking change

* Component refs aren't re-invoked after each render
