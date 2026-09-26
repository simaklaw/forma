/**
 * Local entry for pnpm monorepo.
 * expo/AppEntry.js does `import App from '../../App'`, which only works when
 * expo is nested under apps/mobile/node_modules. With hoisted/root node_modules
 * that relative path points outside the app — use this file instead.
 */
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
