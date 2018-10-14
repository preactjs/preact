# Tests skipped to get CI to pass

- Fragment
	- ✖ should preserve state of children with 1 level nesting
	- ✔ should preserve state between top level fragment and array (see comment in test)
	- ✖ should not preserve state between array nested in fragment and double nested array
	- ✖ should preserve state between double nested fragment and double nested array
	- ✖ should not preserve state of children when the keys are different
	- ✖ should not preserve state between unkeyed and keyed fragment
	- ✖ should reorder Fragment children
- render
	- ✖ should skip non-preact elements

Also:

- Extend Fragment preserving state tests to track unmounting lifecycle callbacks to verify
  components are properly unmounted. I think all 'should not preserve' tests are the ones
  that will have unmount operations.
