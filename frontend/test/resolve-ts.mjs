// Lets `node --test` load the app's TypeScript modules, which import each
// other without file extensions (the way Vite expects).
import { register } from 'node:module';

register(
  'data:text/javascript,' +
    encodeURIComponent(`
export async function resolve(spec, ctx, next) {
  try {
    return await next(spec, ctx);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND' || !/^\\.{1,2}\\//.test(spec) || /\\.[cm]?[jt]sx?$/.test(spec)) throw e;
    return next(spec + '.ts', ctx);
  }
}`),
);
