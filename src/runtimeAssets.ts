import urls from 'virtual:runtime-assets';
/** Every prepared runtime asset is addressed by its recorded content hash. */
export const runtimeAsset = (path: string) => urls[path] ?? path;
