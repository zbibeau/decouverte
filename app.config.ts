/* eslint-disable import/no-unresolved */
import { defineConfig } from '@solidjs/start/config';
import legacy from '@vitejs/plugin-legacy';
import { cpSync, mkdirSync, rmSync } from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import imagemin from 'unplugin-imagemin/vite';
import { join } from 'vinxi/lib/path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createImageminPlugin(beforeBundle: boolean) {
  return imagemin({
    mode: 'sharp',
    beforeBundle,
  });
}

const app = defineConfig({
  ssr: true,
  server: {
    preset: process.env.BUILD === 'static' ? 'static' : undefined,
  },
  vite: {
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'shared'),
      },
    },
    optimizeDeps: {
      include: ['rosetty'],
    },
    plugins: [
      legacy({
        targets: ['defaults', 'not IE 11'],
      }),
      createImageminPlugin(true),
    ],
  },
});

/**
 * Configuration to optimize pictures in public folder
 */

//@ts-ignore
let publicFilesHandler: any[];

//@ts-ignore
app.hooks.hook('app:build:nitro:assets:copy:start', ({ nitro }) => {
  // temporarily remove public files handler to prevent nitro from copying files.
  publicFilesHandler = nitro.options.publicAssets.shift();
});

//@ts-ignore
app.hooks.hook('app:build:nitro:assets:copy:end', async ({ nitro }) => {
  // add public files handler back to the top
  nitro.options.publicAssets.unshift(publicFilesHandler);
  const publicBuildDir = join(nitro.options.buildDir, 'public');
  rmSync(publicBuildDir, { recursive: true, force: true });
  mkdirSync(publicBuildDir, { recursive: true });
  cpSync('public', publicBuildDir, { recursive: true, force: true });
  const plugin = createImageminPlugin(false);
  //@ts-ignore
  await plugin.configResolved({
    publicDir: 'public',
    build: {
      assetsDir: 'assets',
      outDir: nitro.options.buildDir,
    },
  });
  //@ts-ignore
  await plugin.closeBundle.handler();
  cpSync(publicBuildDir, nitro.options.output.publicDir, { recursive: true, force: true });
});

export default app;
