import Ajv from 'ajv';
import type { PPPage } from './model/types.js';
import pageSchema from '../schema/page.schema.json' with { type: 'json' };

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(pageSchema);
export function validatePage(page: PPPage): void {
  if (!validate(page)) throw new Error(`Schema validation failed: ${ajv.errorsText(validate.errors)}`);
}
