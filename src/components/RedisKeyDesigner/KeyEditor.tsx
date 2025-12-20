import { useState } from 'react';
import { Plus, Trash2, FileJson, Clock } from 'lucide-react';
import type { RedisKey, SchemaDefinition, SchemaProperty } from '../../types/nodes';

interface KeyEditorProps {
  redisKey: RedisKey;
  onUpdate: (updates: Partial<RedisKey>) => void;
}

const VALUE_TYPES: { value: RedisKey['valueType']; label: string; description: string }[] = [
  { value: 'string', label: 'String', description: 'Simple string value' },
  { value: 'counter', label: 'Counter', description: 'Integer for INCR/DECR' },
  { value: 'json', label: 'JSON', description: 'JSON object or array' },
  { value: 'list', label: 'List', description: 'Ordered list of values' },
  { value: 'set', label: 'Set', description: 'Unordered set of unique values' },
  { value: 'hash', label: 'Hash', description: 'Hash map of field-value pairs' },
  { value: 'sortedSet', label: 'Sorted Set', description: 'Set with score-based ordering' },
];

const PROPERTY_TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;
const PROPERTY_FORMATS = ['', 'email', 'date-time', 'date', 'uuid', 'uri'] as const;

export function KeyEditor({ redisKey, onUpdate }: KeyEditorProps) {
  const [newPropName, setNewPropName] = useState('');

  const showSchemaEditor = ['json', 'list', 'hash'].includes(redisKey.valueType);

  const initializeSchema = () => {
    if (redisKey.valueType === 'list') {
      onUpdate({
        valueSchema: {
          type: 'array',
          items: { type: 'string', properties: {} },
        },
      });
    } else {
      onUpdate({
        valueSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      });
    }
  };

  const updateSchema = (schema: SchemaDefinition | undefined) => {
    onUpdate({ valueSchema: schema });
  };

  const addProperty = (name: string) => {
    if (!redisKey.valueSchema) return;

    const newProperty: SchemaProperty = { type: 'string' };

    if (redisKey.valueSchema.type === 'array' && redisKey.valueSchema.items) {
      // For arrays, add to items.properties
      updateSchema({
        ...redisKey.valueSchema,
        items: {
          ...redisKey.valueSchema.items,
          properties: {
            ...redisKey.valueSchema.items.properties,
            [name]: newProperty,
          },
        },
      });
    } else {
      // For objects, add to properties
      updateSchema({
        ...redisKey.valueSchema,
        properties: {
          ...redisKey.valueSchema.properties,
          [name]: newProperty,
        },
      });
    }
  };

  const updateProperty = (name: string, updates: Partial<SchemaProperty>) => {
    if (!redisKey.valueSchema) return;

    if (redisKey.valueSchema.type === 'array' && redisKey.valueSchema.items) {
      const existingProp = redisKey.valueSchema.items.properties?.[name] || { type: 'string' as const };
      updateSchema({
        ...redisKey.valueSchema,
        items: {
          ...redisKey.valueSchema.items,
          properties: {
            ...redisKey.valueSchema.items.properties,
            [name]: { ...existingProp, ...updates },
          },
        },
      });
    } else {
      const existingProp = redisKey.valueSchema.properties?.[name] || { type: 'string' as const };
      updateSchema({
        ...redisKey.valueSchema,
        properties: {
          ...redisKey.valueSchema.properties,
          [name]: { ...existingProp, ...updates },
        },
      });
    }
  };

  const removeProperty = (name: string) => {
    if (!redisKey.valueSchema) return;

    if (redisKey.valueSchema.type === 'array' && redisKey.valueSchema.items?.properties) {
      const { [name]: _itemRemoved, ...rest } = redisKey.valueSchema.items.properties;
      void _itemRemoved; // Intentionally unused - we're removing this property
      updateSchema({
        ...redisKey.valueSchema,
        items: {
          ...redisKey.valueSchema.items,
          properties: rest,
        },
      });
    } else if (redisKey.valueSchema.properties) {
      const { [name]: _propRemoved, ...rest } = redisKey.valueSchema.properties;
      void _propRemoved; // Intentionally unused - we're removing this property
      updateSchema({
        ...redisKey.valueSchema,
        properties: rest,
        required: redisKey.valueSchema.required?.filter((r) => r !== name),
      });
    }
  };

  const handleAddProperty = () => {
    if (newPropName.trim()) {
      addProperty(newPropName.trim());
      setNewPropName('');
    }
  };

  const getProperties = (): Record<string, SchemaProperty> => {
    if (!redisKey.valueSchema) return {};
    if (redisKey.valueSchema.type === 'array' && redisKey.valueSchema.items) {
      return redisKey.valueSchema.items.properties || {};
    }
    return redisKey.valueSchema.properties || {};
  };

  const properties = Object.entries(getProperties());

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-6">
        {/* Key Pattern */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Key Pattern</label>
          <input
            type="text"
            value={redisKey.pattern}
            onChange={(e) => onUpdate({ pattern: e.target.value })}
            placeholder="e.g., trending:puzzles or user:{user_id}:session"
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5
                       text-gray-900 font-mono text-sm focus:border-red-500 focus:ring-1
                       focus:ring-red-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Use {'{placeholder}'} for dynamic parts, e.g., user:{'{user_id}'}:profile
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={redisKey.description || ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="What is this key used for?"
            rows={2}
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5
                       text-gray-900 text-sm focus:border-red-500 focus:ring-1
                       focus:ring-red-500 focus:outline-none resize-none"
          />
        </div>

        {/* Value Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Value Type</label>
          <div className="grid grid-cols-3 gap-2">
            {VALUE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => {
                  onUpdate({ valueType: type.value, valueSchema: undefined });
                }}
                className={`
                  p-3 rounded-lg border text-left transition-colors
                  ${
                    redisKey.valueType === type.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="text-sm font-medium">{type.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* TTL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <div className="flex items-center gap-2">
              <Clock size={14} />
              TTL (seconds)
            </div>
          </label>
          <input
            type="number"
            value={redisKey.ttl || ''}
            onChange={(e) => onUpdate({ ttl: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="No expiration"
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2.5
                       text-gray-900 text-sm focus:border-red-500 focus:ring-1
                       focus:ring-red-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            Leave empty for keys that don't expire
          </p>
        </div>

        {/* Value Schema (for JSON, List, Hash) */}
        {showSchemaEditor && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-medium text-gray-700">Value Schema</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {redisKey.valueType === 'list'
                    ? 'Define the schema for items in the list'
                    : redisKey.valueType === 'hash'
                    ? 'Define the fields in the hash'
                    : 'Define the JSON structure'}
                </p>
              </div>
              {redisKey.valueSchema && (
                <button
                  onClick={() => updateSchema(undefined)}
                  className="text-xs text-gray-500 hover:text-red-500 transition-colors"
                >
                  Clear Schema
                </button>
              )}
            </div>

            {redisKey.valueSchema ? (
              <div className="space-y-4">
                {/* Add property */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPropName}
                    onChange={(e) => setNewPropName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddProperty()}
                    placeholder="Property name..."
                    className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2
                               text-gray-900 text-sm focus:border-red-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddProperty}
                    disabled={!newPropName.trim()}
                    className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-400
                               disabled:bg-gray-200 disabled:cursor-not-allowed
                               text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>

                {/* Properties list */}
                {properties.length > 0 ? (
                  <div className="space-y-2">
                    {/* Header row */}
                    <div className="grid grid-cols-[1fr_100px_100px_40px] gap-2 px-3 py-2
                                    bg-gray-100 rounded-lg text-xs text-gray-500 font-medium">
                      <div>Name</div>
                      <div>Type</div>
                      <div>Format</div>
                      <div></div>
                    </div>

                    {/* Property rows */}
                    {properties.map(([name, prop]) => (
                      <div
                        key={name}
                        className="grid grid-cols-[1fr_100px_100px_40px] gap-2 items-center
                                   bg-gray-50 rounded-lg px-3 py-2"
                      >
                        <span className="text-sm text-gray-800 font-mono">{name}</span>

                        <select
                          value={prop.type}
                          onChange={(e) =>
                            updateProperty(name, { type: e.target.value as SchemaProperty['type'] })
                          }
                          className="bg-gray-200 border-none rounded px-2 py-1 text-sm text-gray-900"
                        >
                          {PROPERTY_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>

                        <select
                          value={prop.format || ''}
                          onChange={(e) => updateProperty(name, { format: e.target.value || undefined })}
                          className="bg-gray-200 border-none rounded px-2 py-1 text-sm text-gray-900"
                        >
                          {PROPERTY_FORMATS.map((format) => (
                            <option key={format} value={format}>
                              {format || 'none'}
                            </option>
                          ))}
                        </select>

                        <button
                          onClick={() => removeProperty(name)}
                          className="p-1 text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No properties defined. Add some above.
                  </div>
                )}

                {/* Schema Preview */}
                <div className="mt-4">
                  <h4 className="text-xs text-gray-500 mb-2">Schema Preview</h4>
                  <pre className="bg-gray-100 rounded-lg p-3 text-xs text-gray-700 font-mono overflow-auto max-h-32">
                    {JSON.stringify(redisKey.valueSchema, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 border border-dashed border-gray-300 rounded-lg">
                <FileJson size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No schema defined</p>
                <button
                  onClick={initializeSchema}
                  className="mt-3 px-4 py-2 bg-red-500 hover:bg-red-400 text-white
                             rounded-lg text-sm font-medium transition-colors"
                >
                  Create Schema
                </button>
              </div>
            )}
          </div>
        )}

        {/* Example Value Preview */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Example</h3>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm space-y-1">
            {redisKey.valueType === 'counter' ? (
              <div className="text-gray-400">
                <span className="text-red-400">INCR</span>{' '}
                <span className="text-green-400">"{redisKey.pattern}"</span>
                <span className="text-gray-500"> {'//'} returns 1, 2, 3...</span>
              </div>
            ) : (
              <div className="text-gray-400">
                <span className="text-red-400">{getExampleCommand(redisKey.valueType)}</span>{' '}
                <span className="text-green-400">"{redisKey.pattern}"</span>{' '}
                <span className="text-blue-300">{getExampleValue(redisKey)}</span>
                {redisKey.ttl && (
                  <>
                    {' '}
                    <span className="text-red-400">EX</span>{' '}
                    <span className="text-yellow-300">{redisKey.ttl}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getExampleCommand(valueType: RedisKey['valueType']): string {
  switch (valueType) {
    case 'string':
    case 'counter':
    case 'json':
      return 'SET';
    case 'list':
      return 'RPUSH';
    case 'set':
      return 'SADD';
    case 'hash':
      return 'HSET';
    case 'sortedSet':
      return 'ZADD';
    default:
      return 'SET';
  }
}

function getExampleValue(redisKey: RedisKey): string {
  switch (redisKey.valueType) {
    case 'string':
      return '"value"';
    case 'counter':
      return '42';
    case 'json': {
      if (redisKey.valueSchema?.properties) {
        const example: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(redisKey.valueSchema.properties)) {
          example[key] = getExampleForType(prop.type);
        }
        return JSON.stringify(example);
      }
      return '{"key": "value"}';
    }
    case 'list':
      if (redisKey.valueSchema?.items?.properties) {
        const itemExample: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(redisKey.valueSchema.items.properties)) {
          itemExample[key] = getExampleForType(prop.type);
        }
        return JSON.stringify([itemExample, '...']);
      }
      return '["item1", "item2"]';
    case 'set':
      return '{"member1", "member2"}';
    case 'hash':
      return '{field1: "value1", field2: "value2"}';
    case 'sortedSet':
      return '{score1: member1, score2: member2}';
    default:
      return '"value"';
  }
}

function getExampleForType(type: string): unknown {
  switch (type) {
    case 'number':
      return 123;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return 'string';
  }
}
