import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const lightningDir = path.join(projectRoot, 'node_modules', 'lightningcss', 'node')
const magicStringDir = path.join(projectRoot, 'node_modules', 'magic-string', 'dist')

const ensureLightningStub = () => {
  const mjsEntry = path.join(lightningDir, 'index.mjs')
  const cjsEntry = path.join(lightningDir, 'index.js')

  const esmStub = [
    "import { Buffer } from 'node:buffer'",
    'export const Features = {',
    '  Nesting: 1 << 0,',
    '  MediaQueries: 1 << 1,',
    '  LogicalProperties: 1 << 2,',
    '  DirSelector: 1 << 3,',
    '  LightDark: 1 << 4,',
    '}',
    'export const transform = (options = {}) => {',
    "  const code = options.code ?? '';",
    '  const normalized = Buffer.isBuffer(code) ? code : Buffer.from(String(code))',
    '  return { code: normalized, map: null, warnings: [] }',
    '}',
    '',
  ].join('\n')

  const cjsStub = [
    "const { Buffer } = require('node:buffer')",
    'const Features = {',
    '  Nesting: 1 << 0,',
    '  MediaQueries: 1 << 1,',
    '  LogicalProperties: 1 << 2,',
    '  DirSelector: 1 << 3,',
    '  LightDark: 1 << 4,',
    '}',
    'const transform = function (options = {}) {',
    "  const code = options.code ?? '';",
    '  const normalized = Buffer.isBuffer(code) ? code : Buffer.from(String(code))',
    '  return { code: normalized, map: null, warnings: [] }',
    '};',
    'exports.Features = Features;',
    'exports.transform = transform;',
    '};',
    '',
  ].join('\n')

  mkdirSync(lightningDir, { recursive: true })
  writeFileSync(mjsEntry, esmStub)
  writeFileSync(cjsEntry, cjsStub)
}

const ensureMagicStringStub = () => {
  const esEntry = path.join(magicStringDir, 'magic-string.es.mjs')
  const cjsEntry = path.join(magicStringDir, 'magic-string.cjs')

  const esmStub = [
    'export default class MagicString {',
    '  constructor(value = "") {',
    '    this.value = value;',
    '  }',
    '  append(str = "") {',
    '    this.value += String(str);',
    '    return this;',
    '  }',
    '  toString() {',
    '    return this.value;',
    '  }',
    '}',
    '',
  ].join('\n')

  const cjsStub = [
    'class MagicString {',
    '  constructor(value = "") {',
    '    this.value = value;',
    '  }',
    '  append(str = "") {',
    '    this.value += String(str);',
    '    return this;',
    '  }',
    '  toString() {',
    '    return this.value;',
    '  }',
    '}',
    '',
    'module.exports = MagicString;',
    '',
  ].join('\n')

  mkdirSync(magicStringDir, { recursive: true })
  writeFileSync(esEntry, esmStub)
  writeFileSync(cjsEntry, cjsStub)
}

ensureLightningStub()
ensureMagicStringStub()
process.env.TAILWIND_DISABLE_LIGHTNINGCSS = process.env.TAILWIND_DISABLE_LIGHTNINGCSS ?? '1'

const tailwind = (await import('@tailwindcss/vite')).default

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwind(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
})
