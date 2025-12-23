// Role registry - import all roles to register them
export * from './base';

// Import roles to trigger registration
import './villageois';
import './loup-garou';
import './voyante';

// Re-export for convenience
export { default as villageoisHandler } from './villageois';
export { default as loupGarouHandler } from './loup-garou';
export { default as voyanteHandler } from './voyante';
