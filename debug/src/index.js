import { initDebug, uninstallDebug } from './debug';
import 'preact/devtools';

initDebug();

export { initDebug, uninstallDebug };
export { resetPropWarnings } from './check-props';
