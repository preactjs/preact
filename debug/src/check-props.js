
if (process.env.NODE_ENV !== 'production') {
  var ReactPropTypesSecret = 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED',
      loggedTypeFailures = {};
}

export function checkPropTypes(typeSpecs, values, location, componentName, getStack) {
  if (process.env.NODE_ENV !== 'production') {
    Object.keys(typeSpecs).forEach((typeSpecName) => {
      let error;
      try {
        error = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, ReactPropTypesSecret);
      } catch (e) {
        error = e;
      }
      if (error && !(error.message in loggedTypeFailures)) {
        loggedTypeFailures[error.message] = true;
        
        let errorReport = `Failed ${location} type: ${error.message}${getStack && getStack() || ''}`;
        if (typeof console !== 'undefined') {
          console.error(errorReport);
        } else {
          throw new Error(errorReport);
        }
      }
    });
  }
}
