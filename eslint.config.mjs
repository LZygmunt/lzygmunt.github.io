// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import pluginImport from 'eslint-plugin-import'

export default withNuxt(
  // Your custom configs here
  {
    plugins: {
      import: pluginImport,
    },
    rules: {
      'arrow-body-style': ['error'],
      'vue/attribute-hyphenation': ['error', 'never'],
      'vue/v-on-event-hyphenation': ['error', 'never'],
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '?(@)+(vue*|vite*)',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '#/**',
              group: 'internal',
              position: 'after',
            },
          ],
          pathGroupsExcludedImportTypes: ['vue'],
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
          'newlines-between': 'always',
        },
      ],
    },
  }
)
