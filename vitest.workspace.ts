import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
	'packages/contracts',
	'packages/game',
	'packages/content',
	'packages/ui',
	'apps/web',
]);
