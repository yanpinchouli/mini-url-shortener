import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import prettierPlugin from 'eslint-plugin-prettier/recommended'

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierPlugin
)
