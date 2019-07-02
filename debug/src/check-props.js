const ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED';

let loggedTypeFailures = {};

export function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
	Object.keys(typeSpecs).forEach((typeSpecName) => {
		let error;
		try {
			error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
		}
		catch (e) {
			error = e;
		}
		if (error && !(error.message in loggedTypeFailures)) {
			loggedTypeFailures[error.message] = true;
			console.error(`Failed ${location} type: ${error.message}${getStack && getStack() || ''}`);
		}
	});
}
