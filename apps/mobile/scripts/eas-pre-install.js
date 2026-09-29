/**
 * EAS runs this before its immutable pnpm install. Keep the committed manifest
 * intact for every profile so it continues to match pnpm-lock.yaml.
 */
if (process.env.EAS_BUILD === 'true') {
  console.log('[eas-pre-install] keeping committed dependencies for immutable install');
}
