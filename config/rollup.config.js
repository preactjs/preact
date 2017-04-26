import fs from "fs";
import memory from "rollup-plugin-memory";
import buble from "rollup-plugin-buble";
import nodeResolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";

let pkg = JSON.parse(fs.readFileSync("./package.json"));

let external = Object.keys(pkg.peerDependencies || {}).concat(Object.keys(pkg.dependencies || {}));

let format = process.env.FORMAT === "es" ? "es" : "umd";

export default {
  entry: "src/preact.js",
  sourceMap: true,
  exports: format === "es" ? null : "default",
  dest: format === "es" ? pkg.module : pkg.main,
  format,
  external,
  useStrict: false,
  plugins: [
    format === "umd" &&
      memory({
        path: "src/preact.js",
        contents: "export { default } from './preact';"
      }),
    buble({
      objectAssign: "extend",
      namedFunctionExpressions: false
    }),
    nodeResolve({
      jsnext: true,
      main: true,
      skip: external
    }),
    commonjs({
      include: "node_modules/**",
      exclude: "**/*.css"
    })
  ].filter(Boolean)
};
