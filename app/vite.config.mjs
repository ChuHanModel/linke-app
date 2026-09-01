import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HBUILDERX_UNI_PLUGIN = '/Applications/HBuilderX.app/Contents/HBuilderX/plugins/uniapp-cli-vite/node_modules/@dcloudio/vite-plugin-uni/dist/index.js'

async function loadUniPlugin() {
  try {
    const mod = await import('@dcloudio/vite-plugin-uni')
    return mod.default?.default || mod.default || mod
  } catch (error) {
    const mod = await import(pathToFileURL(HBUILDERX_UNI_PLUGIN).href)
    return mod.default?.default || mod.default || mod
  }
}

function getManifestVersion() {
  try {
    const manifest = JSON.parse(readFileSync(resolve(__dirname, 'manifest.json'), 'utf-8'))
    return {
      version: manifest.versionName || '1.0.0',
      versionCode: manifest.versionCode || '100'
    }
  } catch (e) {
    return { version: '1.0.0', versionCode: '100' }
  }
}

const uni = await loadUniPlugin()

export default {
  plugins: [uni()],
  resolve: {
    alias: {
      '@': __dirname
    }
  },
  define: {
    __MANIFEST_VERSION__: JSON.stringify(getManifestVersion())
  },
  esbuild: {
    // 生产构建时自动移除 console.log 和 debugger
    ...(process.env.NODE_ENV === 'production'
      ? { drop: ['debugger'], pure: ['console.log'] }
      : {})
  }
}
