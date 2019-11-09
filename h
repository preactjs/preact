warning: LF will be replaced by CRLF in src/diff/index.js.
The file will have its original line endings in your working directory.
[1mdiff --git a/src/diff/index.js b/src/diff/index.js[m
[1mindex 3902554a..e4a146d0 100644[m
[1m--- a/src/diff/index.js[m
[1m+++ b/src/diff/index.js[m
[36m@@ -74,11 +74,10 @@[m [mexport function diff([m
 [m
 				c.props = newProps;[m
 				if (!c.state) c.state = {};[m
[31m-				if (!c.__data) c.__data = {};[m
[32m+[m				[32mif (!c.__data) c.__data = { _dirty: true, _renderCallbacks: [] };[m
 				c.context = cctx;[m
 				c._context = context;[m
 				isNew = c._dirty = true;[m
[31m-				c.__data._renderCallbacks = [];[m
 			}[m
 [m
 			const { __data: compData } = c;[m
