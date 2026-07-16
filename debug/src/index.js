import { initDebug } from './debug';
import 'preact/devtools';

initDebug();

export { resetPropWarnings } from './check-props';

export {
	captureOwnerStack,
	getCurrentVNode,
	getDisplayName,
	getOwnerStack,
	setupComponentStack
} from './component-stack';
