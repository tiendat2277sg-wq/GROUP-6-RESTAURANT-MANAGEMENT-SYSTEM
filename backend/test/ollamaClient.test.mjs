import test from 'node:test';
import assert from 'node:assert/strict';
import { ollamaModel, toJsonSchema } from '../src/services/ollamaClient.js';

test('ollamaModel returns default model or configured env value', () => {
  const model = ollamaModel();
  assert.equal(typeof model, 'string');
  assert.ok(model.length > 0);
});

test('toJsonSchema transforms Gemini uppercase types to lowercase JSON schema types', () => {
  const geminiSchema = {
    type: 'OBJECT',
    properties: {
      report_type: {
        type: 'STRING',
        description: 'Type of report',
        enum: ['revenue_detail', 'top_dishes']
      },
      count: {
        type: 'NUMBER',
        description: 'Dish count'
      },
      is_active: {
        type: 'BOOLEAN'
      },
      items: {
        type: 'ARRAY',
        items: {
          type: 'STRING'
        }
      }
    },
    required: ['report_type']
  };

  const converted = toJsonSchema(geminiSchema);

  assert.equal(converted.type, 'object');
  assert.equal(converted.properties.report_type.type, 'string');
  assert.equal(converted.properties.count.type, 'number');
  assert.equal(converted.properties.is_active.type, 'boolean');
  assert.equal(converted.properties.items.type, 'array');
  assert.equal(converted.properties.items.items.type, 'string');
  assert.deepEqual(converted.properties.report_type.enum, ['revenue_detail', 'top_dishes']);
  assert.deepEqual(converted.required, ['report_type']);
});

test('toJsonSchema skips nullable property safely', () => {
  const schemaWithNullable = {
    type: 'STRING',
    nullable: true
  };

  const converted = toJsonSchema(schemaWithNullable);
  assert.equal(converted.type, 'string');
  assert.equal(converted.nullable, undefined);
});
