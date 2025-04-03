/* eslint-disable no-undef */
const path = require('path');

module.exports = {
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  process(src, filename) {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`;
  },
};
