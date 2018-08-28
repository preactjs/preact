# Tests skipped to get CI to pass

- Components
	- Fragment
		- ✖ should just render children for fragments
		- ✖ should render nested Fragments
- Lifecycle methods
	- ✖ should call nested new lifecycle methods in the right order
	- static getDerivedStateFromProps
		- ✖ should NOT mutate state on mount, only create new versions
	- \#shouldComponentUpdate
		- ✖ should be passed next props and state
	- Lifecycle DOM Timing
		- ✖ should be invoked when dom does (DidMount, WillUnmount) or does not (WillMount, DidUnmount) exist
- refs (***`SKIPPED`***)
- render
	- ✖ should merge new elements when called twice
	- ✖ should skip non-preact elements

