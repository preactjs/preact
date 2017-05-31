// ES2015 APIs used by developer tools integration
import 'core-js/es6/map';
import 'core-js/fn/array/fill';
import 'core-js/fn/array/from';
import 'core-js/fn/object/assign';

// We add the ES5 adapter because src / test are converted to ES5 and native
// custom elements uses native ES2015. Unfortunately. This needs to be done
// sync so tests that assert this functionality will have the ES5 shim loaded
// by the time they run.
if (window.customElements) {
	document.write('<script src="https://unpkg.com/@webcomponents/webcomponentsjs@1.0.1/custom-elements-es5-adapter.js"></script>');
}
