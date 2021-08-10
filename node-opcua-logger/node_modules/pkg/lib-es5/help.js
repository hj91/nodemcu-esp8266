'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = help;

var _chalk = require('chalk');

var _chalk2 = _interopRequireDefault(_chalk);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function help() {
  console.log(`
  ${_chalk2.default.bold('pkg')} [options] <input>

  ${_chalk2.default.dim('Options:')}

    -h, --help       output usage information
    -v, --version    output pkg version
    -t, --targets    comma-separated list of targets (see examples)
    -c, --config     package.json or any json file with top-level config
    --options        bake v8 options into executable to run with them on
    -o, --output     output file name or template for several files
    --out-path       path to save output one or more executables
    -d, --debug      show more information during packaging process [off]
    -b, --build      don't download prebuilt base binaries, build them
    --public         speed up and disclose the sources of top-level project

  ${_chalk2.default.dim('Examples:')}

  ${_chalk2.default.gray('–')} Makes executables for Linux, macOS and Windows
    ${_chalk2.default.cyan('$ pkg index.js')}
  ${_chalk2.default.gray('–')} Takes package.json from cwd and follows 'bin' entry
    ${_chalk2.default.cyan('$ pkg .')}
  ${_chalk2.default.gray('–')} Makes executable for particular target machine
    ${_chalk2.default.cyan('$ pkg -t node6-alpine-x64 index.js')}
  ${_chalk2.default.gray('–')} Makes executables for target machines of your choice
    ${_chalk2.default.cyan('$ pkg -t node4-linux,node6-linux,node6-win index.js')}
  ${_chalk2.default.gray('–')} Bakes '--expose-gc' into executable
    ${_chalk2.default.cyan('$ pkg --options expose-gc index.js')}

`);
}