const esbuild = require('esbuild')
const config = {
    external: Object.keys(Object.keys(require('./package.json').dependencies)),
    entryPoints: ['./index.ts'],
    outfile: 'dist/index.js',
    bundle: true,
    platform: 'node',
    sourcemap: true,
    plugins: [{
      name: 'rebuild-notify',
      setup(build) {
        build.onEnd(result => {
          console.log(`build ended with ${result.errors.length} errors`);
          // HERE: somehow restart the server from here, e.g., by sending a signal that you trap and react to inside the server.
        })
      },
    }],
  };
  
  
  const run = async () => {
    const ctx = await esbuild.context(config);
    await ctx.watch();
  };
  
  run();