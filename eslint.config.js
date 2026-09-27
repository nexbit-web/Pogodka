import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import { defineConfig, includeIgnoreFile } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: ['.svelte'],
				parser: ts.parser
			}
		}
	},
	{
		// Внутрішні посилання мають вигляд i18n.href(resolve(...)): resolve() лишається всередині
		// і додає базовий шлях, а i18n.href — мовний префікс /ru. Правило не бачить resolve()
		// крізь обгортку і позначало б кожне посилання, тож для посилань і goto його вимкнено.
		files: ['src/**'],
		rules: {
			'svelte/no-navigation-without-resolve': ['error', { ignoreLinks: true, ignoreGoto: true }]
		}
	},
	{
		// Компоненти shadcn-svelte згенеровані CLI і приймають довільний href,
		// тому вимога resolve() до них не застосовна.
		files: ['src/lib/components/ui/**'],
		rules: {
			'svelte/no-navigation-without-resolve': 'off'
		}
	}
);
