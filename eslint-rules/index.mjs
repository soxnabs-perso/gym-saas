/**
 * Local ESLint rules, shared by the backend and frontend configs.
 */

/**
 * Matches comments intended for tools rather than documentation. These directives must continue to work otherwise
 * rules could no longer be suppressed. 
 */
const TOOL_DIRECTIVE = /^\s*(eslint|globals?|exported|istanbul|c8|v8|prettier|@ts-|jshint|jslint)\b/;

/**
 * Allows documentation comments only.
 * A `/** ... *\/` block is allowed anywhere while a `//` line comment or a plain `/* ... *\/` block is not
 */
const docCommentsOnly = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Allow only JSDoc-style documentation comments',
    },
    messages: {
      line:
        'Only documentation comments are allowed. Turn this into a /** ... */ block if it is worth keeping ' +
          'otherwise delete it.',
      block:
        'Only documentation comments are allowed. Open the block with /** to mark it as documentation.',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (comment.type === 'Shebang') continue;
          if (comment.value.startsWith('!')) continue;
          if (TOOL_DIRECTIVE.test(comment.value)) continue;

          /** A JSDoc block is `/**` which espree reports as a value starting with `*`. */
          if (comment.type === 'Block' && comment.value.startsWith('*')) continue;

          context.report({
            loc: comment.loc,
            messageId: comment.type === 'Line' ? 'line' : 'block',
          });
        }
      },
    };
  },
};

const plugin = {
  rules: {
    'doc-comments-only': docCommentsOnly,
  },
};

/**
 * This flat config doesn't specify a `files` property so it applies to every file linted by the importing config. 
 * Spread it before any package-specific config so individual packages can override rules where needed.
 * Language options and globals remain package-specific: the backend targets Node.js while the frontend targets the 
 * browser and enables JSX parsing.
 */
export const sharedConfig = {
  plugins: {
    local: plugin,
  },
  rules: {
    'local/doc-comments-only': 'error',

    'max-len': [
      'error',
      {
        code: 120,
        ignoreUrls: true,
        ignoreRegExpLiterals: true,
      },
    ],

    'no-unused-vars': [
      'error',
      {
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],

    eqeqeq: ['error', 'smart'],
  },
};

export default plugin;
