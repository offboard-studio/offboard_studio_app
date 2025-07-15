// eslint.config.js
import { flatConfigs } from '@nx/eslint';

export default flatConfigs({
  projectRoot: __dirname,
  hasTypeScript: true,
  hasNest: true,
  hasJest: true,
});
