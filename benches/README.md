## TODO

* tachometer needs to resolve node_modules to new node_module directory when using packageVersion overrides
	- naively it can do this by passing the parent directory of the new tmp node_modules into the root option of koa-node-resolve
	- Might need to consider what expectations tachometer makes about where node_modules is relative to the root it is configured with 
* koa-node-resolve also needs a windows-only fix for how it handles paths. It always assumes '/' is directory separator. Particularly the path-utils.dirname function
