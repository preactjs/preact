# Tests skipped to get CI to pass

- Fragment
	- ✖ should preserve state of children with 1 level nesting
	- ✖ should not preserve state between array nested in fragment and double nested array
	- ✖ should preserve state between double nested fragment and double nested array
	- ✖ should not preserve state of children when the keys are different
	- ✖ should not preserve state between unkeyed and keyed fragment
	- ✖ should support moving Fragments between beginning and end
	- ✖ should support conditional beginning and end Fragments
	- ✖ should support nested conditional beginning and end Fragments
	- ✖ should preserve state with reordering in multiple levels with mixed # of Fragment siblings
	- ✖ should preserve state with reordering in multiple levels with lots of Fragment siblings
- keys
	- ✖ should not preserve state when the keys are different
	- ✖ should not preserve state between unkeyed and keyed component

Also:

- Extend Fragment preserving state tests to track unmounting lifecycle callbacks to verify
  components are properly unmounted. I think all 'should not preserve' tests are the ones
  that will have unmount operations.
