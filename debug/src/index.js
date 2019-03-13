if (process.env.NODE_ENV==='development') {
	require('./debug').initDebug();
	require('./devtools').initDevTools();
}
