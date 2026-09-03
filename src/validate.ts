import Ajv2020 from 'ajv/dist/2020.js';
import type { PPPage } from './model/types.js';
import pageSchema from '../schema/page.schema.json' with { type: 'json' };
import referenceSchema from '../schema/reference.schema.json' with { type: 'json' };
import conceptSchema from '../schema/concept.schema.json' with { type: 'json' };
import plantSchema from '../schema/plant.schema.json' with { type: 'json' };

const ajv = new Ajv2020({ allErrors: true, strict: false });
ajv.addSchema(referenceSchema, 'reference.schema.json');
ajv.addSchema(conceptSchema, 'concept.schema.json');
ajv.addSchema(plantSchema, 'plant.schema.json');
const validate = ajv.compile(pageSchema);
export function validatePage(page: PPPage): void { if (!validate(page)) throw new Error(`Schema validation failed: ${ajv.errorsText(validate.errors)}`); }
