import { useState } from 'react';
import { Plus, Trash2, FileJson, ArrowRight, ArrowLeft, File } from 'lucide-react';
import type { APIEndpoint, SchemaDefinition, SchemaProperty, ResponseType, BinaryContentType } from '../../types/nodes';

interface SchemaEditorProps {
  endpoints: APIEndpoint[];
  selectedEndpointId: string | null;
  onSelectEndpoint: (endpointId: string) => void;
  onUpdateEndpoint: (endpointId: string, updates: Partial<APIEndpoint>) => void;
}

type SchemaType = 'request' | 'response';

const PROPERTY_TYPES = ['string', 'number', 'boolean', 'object', 'array'] as const;
const PROPERTY_FORMATS = ['', 'email', 'date-time', 'date', 'uuid', 'uri', 'hostname'] as const;

const CONTENT_TYPE_CATEGORIES = [
  {
    label: 'General',
    types: [
      { value: 'application/octet-stream', label: 'Binary (application/octet-stream)' },
      { value: 'text/plain', label: 'Plain Text (text/plain)' },
      { value: 'text/csv', label: 'CSV (text/csv)' },
    ],
  },
  {
    label: 'Documents',
    types: [
      { value: 'application/pdf', label: 'PDF (application/pdf)' },
      { value: 'application/zip', label: 'ZIP Archive (application/zip)' },
    ],
  },
  {
    label: 'Images',
    types: [
      { value: 'image/png', label: 'PNG Image (image/png)' },
      { value: 'image/jpeg', label: 'JPEG Image (image/jpeg)' },
      { value: 'image/gif', label: 'GIF Image (image/gif)' },
      { value: 'image/webp', label: 'WebP Image (image/webp)' },
      { value: 'image/svg+xml', label: 'SVG Image (image/svg+xml)' },
    ],
  },
  {
    label: 'Audio/Video',
    types: [
      { value: 'audio/mpeg', label: 'MP3 Audio (audio/mpeg)' },
      { value: 'audio/wav', label: 'WAV Audio (audio/wav)' },
      { value: 'video/mp4', label: 'MP4 Video (video/mp4)' },
      { value: 'video/webm', label: 'WebM Video (video/webm)' },
    ],
  },
];

export function SchemaEditor({
  endpoints,
  selectedEndpointId,
  onSelectEndpoint,
  onUpdateEndpoint,
}: SchemaEditorProps) {
  const [activeSchemaType, setActiveSchemaType] = useState<SchemaType>('request');

  const selectedEndpoint = endpoints.find((e) => e.id === selectedEndpointId);

  const currentSchema =
    activeSchemaType === 'request'
      ? selectedEndpoint?.requestSchema
      : selectedEndpoint?.responseSchema;

  const updateSchema = (schema: SchemaDefinition | undefined) => {
    if (!selectedEndpointId) return;

    if (activeSchemaType === 'request') {
      onUpdateEndpoint(selectedEndpointId, { requestSchema: schema });
    } else {
      onUpdateEndpoint(selectedEndpointId, { responseSchema: schema });
    }
  };

  const initializeSchema = () => {
    updateSchema({
      type: 'object',
      properties: {},
      required: [],
    });
  };

  const addProperty = (name: string) => {
    if (!currentSchema) return;

    const newProperty: SchemaProperty = {
      type: 'string',
    };

    updateSchema({
      ...currentSchema,
      properties: {
        ...currentSchema.properties,
        [name]: newProperty,
      },
    });
  };

  const updateProperty = (name: string, updates: Partial<SchemaProperty>) => {
    if (!currentSchema?.properties) return;

    updateSchema({
      ...currentSchema,
      properties: {
        ...currentSchema.properties,
        [name]: { ...currentSchema.properties[name], ...updates },
      },
    });
  };

  const removeProperty = (name: string) => {
    if (!currentSchema?.properties) return;

    const { [name]: _, ...rest } = currentSchema.properties;
    updateSchema({
      ...currentSchema,
      properties: rest,
      required: currentSchema.required?.filter((r) => r !== name),
    });
  };

  const toggleRequired = (name: string) => {
    if (!currentSchema) return;

    const required = currentSchema.required || [];
    const isRequired = required.includes(name);

    updateSchema({
      ...currentSchema,
      required: isRequired
        ? required.filter((r) => r !== name)
        : [...required, name],
    });
  };

  const clearSchema = () => {
    updateSchema(undefined);
  };

  return (
    <div className="flex h-full">
      {/* Endpoint list sidebar */}
      <div className="w-64 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-sm font-medium text-slate-300">Select Endpoint</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.id}
              onClick={() => onSelectEndpoint(endpoint.id)}
              className={`
                px-3 py-2 rounded-lg cursor-pointer mb-1 transition-colors
                ${
                  selectedEndpointId === endpoint.id
                    ? 'bg-blue-600/20 border border-blue-500/30'
                    : 'hover:bg-slate-700/50 border border-transparent'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <span className="text-sm text-slate-300 truncate font-mono">
                  {endpoint.path}
                </span>
              </div>
              <div className="flex gap-2 mt-1">
                {endpoint.requestSchema && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                    REQ
                  </span>
                )}
                {endpoint.responseType === 'binary' ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                    BIN
                  </span>
                ) : endpoint.responseSchema ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                    RES
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Schema editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedEndpoint ? (
          <>
            {/* Schema type tabs */}
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setActiveSchemaType('request')}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                  ${
                    activeSchemaType === 'request'
                      ? 'text-green-400 border-b-2 border-green-400 bg-slate-700/30'
                      : 'text-slate-400 hover:text-white'
                  }
                `}
              >
                <ArrowRight size={14} />
                Request Body
              </button>
              <button
                onClick={() => setActiveSchemaType('response')}
                className={`
                  flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors
                  ${
                    activeSchemaType === 'response'
                      ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-700/30'
                      : 'text-slate-400 hover:text-white'
                  }
                `}
              >
                <ArrowLeft size={14} />
                Response Body
              </button>
            </div>

            {/* Schema content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeSchemaType === 'response' ? (
                <ResponseEditor
                  endpoint={selectedEndpoint}
                  onUpdateEndpoint={(updates) => onUpdateEndpoint(selectedEndpoint.id, updates)}
                  currentSchema={currentSchema}
                  onInitializeSchema={initializeSchema}
                  onAddProperty={addProperty}
                  onUpdateProperty={updateProperty}
                  onRemoveProperty={removeProperty}
                  onToggleRequired={toggleRequired}
                  onClearSchema={clearSchema}
                />
              ) : currentSchema ? (
                <SchemaProperties
                  schema={currentSchema}
                  onAddProperty={addProperty}
                  onUpdateProperty={updateProperty}
                  onRemoveProperty={removeProperty}
                  onToggleRequired={toggleRequired}
                  onClear={clearSchema}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500">
                  <FileJson size={48} className="mb-3 opacity-50" />
                  <p>No {activeSchemaType} schema defined</p>
                  <button
                    onClick={initializeSchema}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white
                               rounded-lg text-sm font-medium transition-colors"
                  >
                    Create Schema
                  </button>
                </div>
              )}
            </div>

            {/* JSON Preview - only for request or JSON response */}
            {currentSchema && (activeSchemaType === 'request' || selectedEndpoint.responseType !== 'binary') && (
              <div className="border-t border-slate-700 p-4">
                <h4 className="text-xs text-slate-400 mb-2">JSON Schema Preview</h4>
                <pre className="bg-slate-900/50 rounded-lg p-3 text-xs text-slate-300 font-mono overflow-auto max-h-32">
                  {JSON.stringify(currentSchema, null, 2)}
                </pre>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <FileJson size={48} className="mx-auto mb-3 opacity-50" />
              <p>Select an endpoint to edit its schemas</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Response Editor - handles both JSON and Binary response types
interface ResponseEditorProps {
  endpoint: APIEndpoint;
  onUpdateEndpoint: (updates: Partial<APIEndpoint>) => void;
  currentSchema: SchemaDefinition | undefined;
  onInitializeSchema: () => void;
  onAddProperty: (name: string) => void;
  onUpdateProperty: (name: string, updates: Partial<SchemaProperty>) => void;
  onRemoveProperty: (name: string) => void;
  onToggleRequired: (name: string) => void;
  onClearSchema: () => void;
}

function ResponseEditor({
  endpoint,
  onUpdateEndpoint,
  currentSchema,
  onInitializeSchema,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onToggleRequired,
  onClearSchema,
}: ResponseEditorProps) {
  const responseType = endpoint.responseType || 'json';
  const [customContentType, setCustomContentType] = useState('');

  const handleResponseTypeChange = (type: ResponseType) => {
    onUpdateEndpoint({
      responseType: type,
      // Clear the other type's data when switching
      ...(type === 'binary'
        ? { responseSchema: undefined, responseContentType: 'application/octet-stream' }
        : { responseContentType: undefined }),
    });
  };

  const handleContentTypeChange = (contentType: string) => {
    if (contentType === 'custom') {
      // Don't update yet, wait for custom input
      return;
    }
    onUpdateEndpoint({ responseContentType: contentType as BinaryContentType });
  };

  const handleCustomContentTypeSubmit = () => {
    if (customContentType.trim()) {
      onUpdateEndpoint({ responseContentType: customContentType.trim() as BinaryContentType });
      setCustomContentType('');
    }
  };

  // Check if current content type is a custom one
  const isCustomContentType = endpoint.responseContentType &&
    !CONTENT_TYPE_CATEGORIES.some(cat =>
      cat.types.some(t => t.value === endpoint.responseContentType)
    );

  return (
    <div className="space-y-6">
      {/* Response Type Toggle */}
      <div>
        <label className="block text-xs text-slate-400 mb-2">Response Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => handleResponseTypeChange('json')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${responseType === 'json'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
            `}
          >
            <FileJson size={16} />
            JSON
          </button>
          <button
            onClick={() => handleResponseTypeChange('binary')}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${responseType === 'binary'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }
            `}
          >
            <File size={16} />
            Binary / File
          </button>
        </div>
      </div>

      {/* Content based on response type */}
      {responseType === 'binary' ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-2">Content-Type</label>
            <select
              value={isCustomContentType ? 'custom' : (endpoint.responseContentType || 'application/octet-stream')}
              onChange={(e) => handleContentTypeChange(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5
                         text-white text-sm focus:border-blue-500 focus:outline-none"
            >
              {CONTENT_TYPE_CATEGORIES.map((category) => (
                <optgroup key={category.label} label={category.label}>
                  {category.types.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Custom">
                <option value="custom">Custom content type...</option>
              </optgroup>
            </select>
          </div>

          {/* Custom content type input */}
          {(isCustomContentType || customContentType) && (
            <div>
              <label className="block text-xs text-slate-400 mb-2">Custom Content-Type</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={isCustomContentType ? endpoint.responseContentType : customContentType}
                  onChange={(e) => {
                    if (isCustomContentType) {
                      onUpdateEndpoint({ responseContentType: e.target.value as BinaryContentType });
                    } else {
                      setCustomContentType(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !isCustomContentType && handleCustomContentTypeSubmit()}
                  placeholder="e.g., application/x-custom"
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                             text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
                />
                {!isCustomContentType && (
                  <button
                    onClick={handleCustomContentTypeSubmit}
                    disabled={!customContentType.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600
                               text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Set
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Binary response preview */}
          <div className="bg-slate-900/50 rounded-lg p-4">
            <h4 className="text-xs text-slate-400 mb-2">Response Preview</h4>
            <div className="flex items-center gap-3">
              <File size={24} className="text-slate-500" />
              <div>
                <p className="text-sm text-slate-300">Binary file response</p>
                <p className="text-xs text-slate-500 font-mono">
                  Content-Type: {endpoint.responseContentType || 'application/octet-stream'}
                </p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Use this for endpoints that return files, images, or other binary data (e.g., from S3).
          </p>
        </div>
      ) : currentSchema ? (
        <SchemaProperties
          schema={currentSchema}
          onAddProperty={onAddProperty}
          onUpdateProperty={onUpdateProperty}
          onRemoveProperty={onRemoveProperty}
          onToggleRequired={onToggleRequired}
          onClear={onClearSchema}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <FileJson size={48} className="mb-3 opacity-50" />
          <p>No response schema defined</p>
          <button
            onClick={onInitializeSchema}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white
                       rounded-lg text-sm font-medium transition-colors"
          >
            Create Schema
          </button>
        </div>
      )}
    </div>
  );
}

interface SchemaPropertiesProps {
  schema: SchemaDefinition;
  onAddProperty: (name: string) => void;
  onUpdateProperty: (name: string, updates: Partial<SchemaProperty>) => void;
  onRemoveProperty: (name: string) => void;
  onToggleRequired: (name: string) => void;
  onClear: () => void;
}

function SchemaProperties({
  schema,
  onAddProperty,
  onUpdateProperty,
  onRemoveProperty,
  onToggleRequired,
  onClear,
}: SchemaPropertiesProps) {
  const [newPropName, setNewPropName] = useState('');

  const handleAddProperty = () => {
    if (newPropName.trim()) {
      onAddProperty(newPropName.trim());
      setNewPropName('');
    }
  };

  const properties = Object.entries(schema.properties || {});
  const required = schema.required || [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">
          Properties ({properties.length})
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors"
        >
          Clear Schema
        </button>
      </div>

      {/* Add property */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newPropName}
          onChange={(e) => setNewPropName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddProperty()}
          placeholder="Property name..."
          className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2
                     text-white text-sm focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleAddProperty}
          disabled={!newPropName.trim()}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-500
                     disabled:bg-slate-600 disabled:cursor-not-allowed
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
          <div className="grid grid-cols-[1fr_120px_120px_60px_40px] gap-2 px-3 py-2
                          bg-slate-700/50 rounded-lg text-xs text-slate-400 font-medium">
            <div>Name</div>
            <div>Type</div>
            <div>Format</div>
            <div className="text-center">Req.</div>
            <div></div>
          </div>

          {/* Property rows */}
          {properties.map(([name, prop]) => (
            <div
              key={name}
              className="grid grid-cols-[1fr_120px_120px_60px_40px] gap-2 items-center
                         bg-slate-700/30 rounded-lg px-3 py-2"
            >
              <span className="text-sm text-slate-200 font-mono">{name}</span>

              <select
                value={prop.type}
                onChange={(e) =>
                  onUpdateProperty(name, { type: e.target.value as SchemaProperty['type'] })
                }
                className="bg-slate-600 border-none rounded px-2 py-1 text-sm text-white"
              >
                {PROPERTY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                value={prop.format || ''}
                onChange={(e) => onUpdateProperty(name, { format: e.target.value || undefined })}
                className="bg-slate-600 border-none rounded px-2 py-1 text-sm text-white"
              >
                {PROPERTY_FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format || 'none'}
                  </option>
                ))}
              </select>

              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={required.includes(name)}
                  onChange={() => onToggleRequired(name)}
                  className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-blue-600"
                />
              </div>

              <button
                onClick={() => onRemoveProperty(name)}
                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-slate-500 text-sm">
          No properties defined. Add some above.
        </div>
      )}
    </div>
  );
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: 'text-green-400',
    POST: 'text-blue-400',
    PUT: 'text-yellow-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };
  return colors[method] || 'text-slate-400';
}
