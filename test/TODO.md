# Tests skipped to get CI to pass

- Fragment
	- ✖ should not preserve state between array nested in fragment and double nested array
	- ✖ should preserve state between double nested fragment and double nested array
- hydrate
	- ✖ should override incorrect pre-existing DOM with VNodes passed into render

Also:

- Extend Fragment preserving state tests to track unmounting lifecycle callbacks to verify
  components are properly unmounted. I think all 'should not preserve' tests are the ones
  that will have unmount operations.

## Seeds

Seeds to investigate:

- 05774
	- act > should flush pending and initial effects
	- act > should flush pending effects
	- act > should flush series of hooks
- 24847
	- act > should flush pending effects
	- act > should flush pending and initial effects
- 90571
	- act > should flush series of hooks
