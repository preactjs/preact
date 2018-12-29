function noop(){}

'getLastMeasurements getExclusive getInclusive getWasted getOperations printExclusive printInclusive printWasted printOperations start stop isRunning'
	.split(' ').forEach(function(key) {
		module.exports[key]=noop;
	});
