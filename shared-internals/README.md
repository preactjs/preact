# Shared internals

This package is only intended to be used for testing frameworks or debuggers which need to access private internals of Preact. Examples for that are the devtools and adapter for the enzyme testing library. Don't use this for "normal" apps. Please use the public API for those.

Note that due to it being treated as internal, it doesn't follow the same stability guarantees as our public API. We may introduce breaking changes here at any point.
