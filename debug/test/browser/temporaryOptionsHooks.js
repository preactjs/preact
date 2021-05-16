import { initDebug, uninstallDebug } from 'preact/debug';

export function withTemporaryOptions() {
	before(() => {
		initDebug();
	});
	after(() => {
		uninstallDebug();
	});
}
