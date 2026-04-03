import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import pkg from './package.json' with { type: 'json' }

/** Replace __SW_VERSION__ in dist/sw.js with the package version. */
function swVersionPlugin(): Plugin {
  return {
    name: 'sw-version-stamp',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(__dirname, 'dist/sw.js')
      try {
        const content = readFileSync(swPath, 'utf-8')
        writeFileSync(swPath, content.replace(/__SW_VERSION__/g, pkg.version))
      } catch { /* sw.js may not exist in library builds */ }
    },
  }
}

/** Write dist/version.json with version and webBuild timestamp. */
function versionJsonPlugin(): Plugin {
  return {
    name: 'version-json-generator',
    apply: 'build',
    closeBundle() {
      const outPath = resolve(__dirname, 'dist/version.json')
      const lastNativePath = resolve(__dirname, '.last-native-version')
      let minNativeVersion = pkg.version
      if (existsSync(lastNativePath)) {
        minNativeVersion = readFileSync(lastNativePath, 'utf-8').trim()
      }
      const data = {
        version: pkg.version,
        webBuild: new Date().toISOString(),
        minNativeVersion,
      }
      writeFileSync(outPath, JSON.stringify(data) + '\n')
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), swVersionPlugin(), versionJsonPlugin()],
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
