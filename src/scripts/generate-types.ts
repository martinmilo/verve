#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { pathToFileURL } from 'url';

interface FieldInfo {
  name: string;
  type: string;
  fieldType: string;
  nullable: boolean;
  isArray: boolean;
  isRecord: boolean;
  recordType?: string;
  enumType?: string;
  defaultValue?: any;
}

interface ModelInfo {
  name: string;
  fields: FieldInfo[];
  sourceCode?: string; // Store original source code for type parsing
}

class ModelTypeGenerator {
  private models: ModelInfo[] = [];
  private processedFiles = new Set<string>();

  constructor(private rootPath: string) {
    // Register ts-node for TypeScript compilation
    try {
      require('ts-node').register({
        transpileOnly: true,
        compilerOptions: {
          module: 'commonjs',
          target: 'es2017',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      });
    } catch (error) {
      console.warn('Warning: Could not register ts-node. TypeScript files may not be processed.');
    }
  }

  async generateTypes(): Promise<void> {
    await this.scanDirectory(this.rootPath);
    await this.writeTypesFile();
    await this.updateModelClasses();
  }

  private async scanDirectory(dirPath: string): Promise<void> {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await this.scanDirectory(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
        await this.parseFile(fullPath);
      }
    }
  }

  private async parseFile(filePath: string): Promise<void> {
    if (this.processedFiles.has(filePath)) return;
    this.processedFiles.add(filePath);

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      
      // Quick check if file contains @model decorators
      if (!content.includes('@model')) {
        return;
      }

      await this.extractModelsFromFile(filePath);
    } catch (error) {
      console.warn(`Warning: Could not process file ${filePath}:`, error);
    }
  }

  private async extractModelsFromFile(filePath: string): Promise<void> {
    try {
      const sourceCode = await fs.promises.readFile(filePath, 'utf-8');
      
      if (filePath.endsWith('.ts')) {
        // Use direct require with ts-node for TypeScript files
        try {
          // Clear the require cache to ensure fresh imports
          delete require.cache[require.resolve(path.resolve(filePath))];
          
          const module = require(path.resolve(filePath));
          await this.extractModelsFromModule(module, path.basename(filePath), sourceCode);
        } catch (requireError) {
          console.warn(`Warning: Could not require TypeScript file ${filePath}:`, requireError);
        }
      } else {
        // Handle JavaScript files with dynamic import
        const absolutePath = path.resolve(filePath);
        const fileUrl = pathToFileURL(absolutePath).href;
        await this.importAndExtractModels(fileUrl, path.basename(filePath), sourceCode);
      }
    } catch (error) {
      console.warn(`Warning: Could not process file ${filePath}:`, error);
    }
  }

  private async extractModelsFromModule(module: any, fileName: string, sourceCode?: string): Promise<void> {
    try {
      // Look for exported classes that have a schema property (indicating they're models)
      for (const [exportName, exportValue] of Object.entries(module)) {
        if (this.isModelClass(exportValue)) {
          const modelInfo = this.extractModelInfo(exportValue as any, exportName, sourceCode);
          if (modelInfo) {
            this.models.push(modelInfo);
            console.log(`Found model: ${exportName} in ${fileName}`);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to process module from ${fileName}:`, error);
    }
  }

  private async importAndExtractModels(fileUrl: string, fileName: string, sourceCode?: string): Promise<void> {
    try {
      const module = await import(fileUrl);
      await this.extractModelsFromModule(module, fileName, sourceCode);
    } catch (error) {
      // Silently ignore import errors as not all files may be importable
    }
  }

  private isModelClass(value: any): boolean {
    return (
      typeof value === 'function' &&
      value.prototype &&
      value.schema &&
      typeof value.schema === 'object'
    );
  }

  private extractModelInfo(ModelClass: any, className: string, sourceCode?: string): ModelInfo | null {
    try {
      const schema = ModelClass.schema;
      const fields: FieldInfo[] = [];

      for (const [fieldName, fieldBuilder] of Object.entries(schema)) {
        if (fieldBuilder && typeof fieldBuilder === 'object' && 'Field' in fieldBuilder) {
          const field = this.extractFieldInfo(fieldName, fieldBuilder as any, sourceCode, className);
          if (field) {
            fields.push(field);
          }
        }
      }

      return { name: className, fields, sourceCode };
    } catch (error) {
      console.warn(`Warning: Could not extract model info for ${className}:`, error);
      return null;
    }
  }

  private getTargetTypeFromBuilder(fieldBuilder: any): string | null {
    try {
      // Look for the target type stored with the BUILDER_TARGET_TYPE symbol
      // Since symbols are not enumerable, we need to check all symbol properties
      const symbols = Object.getOwnPropertySymbols(fieldBuilder);
      for (const symbol of symbols) {
        // Check if this symbol looks like our BUILDER_TARGET_TYPE
        const symbolDescription = symbol.toString();
        if (symbolDescription.includes('BuilderTargetType')) {
          return fieldBuilder[symbol];
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractFieldInfo(fieldName: string, fieldBuilder: any, sourceCode?: string, className?: string): FieldInfo | null {
    try {
      const Field = fieldBuilder.Field;
      const options = fieldBuilder.options || {};
      
      // Get the target type from the field builder
      // The symbol is stored as a property on the fieldBuilder object
      const targetType = this.getTargetTypeFromBuilder(fieldBuilder);
      
      const field: FieldInfo = {
        name: fieldName,
        type: '',
        fieldType: Field.name,
        nullable: options.nullable || false,
        isArray: false,
        isRecord: false,
        defaultValue: options.default
      };

      // Determine TypeScript type based on field class
      switch (Field.name) {
        case 'IdField':
          field.type = 'string';
          break;
        case 'TextField':
          field.type = 'string';
          break;
        case 'NumberField':
          field.type = 'number';
          break;
        case 'BoolField':
          field.type = 'boolean';
          break;
        case 'DateField':
          field.type = 'Date';
          break;
        case 'ListField':
          field.isArray = true;
          // Use target type if available
          if (targetType) {
            field.type = `${targetType}[]`;
          } else {
            // Extract generic type from source code if available
            const genericType = this.extractListGenericFromSource(fieldName, sourceCode, className);
            if (genericType) {
              field.type = `${genericType}[]`;
            } else if (options.default && Array.isArray(options.default)) {
              // Infer from default value
              const elementType = this.inferTypeFromValue(options.default[0]);
              field.type = `${elementType}[]`;
            } else {
              field.type = 'unknown[]';
            }
          }
          break;
        case 'RecordField':
          field.isRecord = true;
          // Use target type if available
          if (targetType) {
            field.type = targetType;
            field.recordType = targetType;
          } else {
            // Extract generic type from source code if available
            const genericType = this.extractRecordGenericFromSource(fieldName, sourceCode, className);
            field.type = genericType || 'Record<string, any>';
            field.recordType = genericType || 'Record<string, any>';
          }
          break;
        case 'OptionField':
          // Extract enum type from source code if available
          const enumType = this.extractEnumTypeFromSource(fieldName, sourceCode, className);
          field.type = enumType || 'string';
          field.enumType = enumType || undefined;
          break;
        default:
          field.type = 'unknown';
      }

      // Add null to type if nullable
      if (field.nullable && !field.isArray) {
        field.type += ' | null';
      }

      return field;
    } catch (error) {
      console.warn(`Warning: Could not extract field info for ${fieldName}:`, error);
      return null;
    }
  }

  private inferTypeFromValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    
    const type = typeof value;
    if (type === 'object') {
      if (Array.isArray(value)) return 'unknown[]';
      if (value instanceof Date) return 'Date';
      return 'object';
    }
    return type;
  }

  private extractEnumTypeFromSource(fieldName: string, sourceCode?: string, className?: string): string | null {
    if (!sourceCode || !className) return null;
    
    try {
      // Look for pattern like: fieldName: option(EnumName)
      const pattern = new RegExp(`${fieldName}:\\s*option\\(\\s*(\\w+)\\s*\\)`);
      const match = sourceCode.match(pattern);
      
      if (match) {
        const enumName = match[1];
        // Check if the enum is imported or defined in the same file
        if (sourceCode.includes(`enum ${enumName}`) || sourceCode.includes(`import.*${enumName}`)) {
          return enumName;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractRecordGenericFromSource(fieldName: string, sourceCode?: string, className?: string): string | null {
    if (!sourceCode || !className) return null;
    
    try {
      // Look for pattern like: fieldName: record<{ type: definition }>()
      const pattern = new RegExp(`${fieldName}:\\s*record\\s*<\\s*([^>]+)\\s*>\\s*\\(`);
      const match = sourceCode.match(pattern);
      
      if (match) {
        return match[1].trim();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractListGenericFromSource(fieldName: string, sourceCode?: string, className?: string): string | null {
    if (!sourceCode || !className) return null;
    
    try {
      // Look for pattern like: fieldName: list<ElementType>()
      const pattern = new RegExp(`${fieldName}:\\s*list\\s*<\\s*([^>]+)\\s*>\\s*\\(`);
      const match = sourceCode.match(pattern);
      
      if (match) {
        return match[1].trim();
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private extractEnumDefinitions(): string[] {
    const enumDefinitions: string[] = [];
    const foundEnums = new Set<string>();
    
    for (const model of this.models) {
      if (!model.sourceCode) continue;
      
      // Find enum definitions in the source code
      const enumRegex = /export\s+enum\s+(\w+)\s*\{([^}]+)\}/g;
      let match;
      
      while ((match = enumRegex.exec(model.sourceCode)) !== null) {
        const enumName = match[1];
        if (!foundEnums.has(enumName)) {
          foundEnums.add(enumName);
          const enumContent = match[2];
          enumDefinitions.push(`export enum ${enumName} {${enumContent}}`);
        }
      }
    }
    
    return enumDefinitions;
  }

  private async writeTypesFile(): Promise<void> {
    const typesDir = path.join(this.rootPath, '.verve');
    const typesFile = path.join(typesDir, 'models.d.ts');

    // Ensure directory exists
    await fs.promises.mkdir(typesDir, { recursive: true });

    let content = `export interface BoundField<T> {
  get(): T;
  unsafeGet(): T | undefined;
  set(value: T): void;
  unset(): void;
  is(value: T): boolean;
  isEmpty(): boolean;
  isPresent(): boolean;
  isValid(): boolean;
  generate(): void;
  compute(): T;
  validate(): VerveErrorList;
  isReadable(): boolean;
  isWritable(): boolean;
}\n\nexport enum ErrorCode {
  // Authorization errors
  UNAUTHORIZED_METHOD_CALL = 'UNAUTHORIZED_METHOD_CALL',
  
  // Model instantiation errors
  DIRECT_INSTANTIATION_NOT_ALLOWED = 'DIRECT_INSTANTIATION_NOT_ALLOWED',
  
  // Field access errors
  FIELD_NOT_READABLE = 'FIELD_NOT_READABLE',
  FIELD_NOT_INITIALIZED = 'FIELD_NOT_INITIALIZED',
  FIELD_NOT_WRITABLE = 'FIELD_NOT_WRITABLE',
  FIELD_IS_COMPUTED = 'FIELD_IS_COMPUTED',
  FIELD_SET_ERROR = 'FIELD_SET_ERROR',
  FIELD_UNSET_ERROR = 'FIELD_UNSET_ERROR',
  FIELD_NO_GENERATOR = 'FIELD_NO_GENERATOR',
  FIELD_ALREADY_GENERATED = 'FIELD_ALREADY_GENERATED',
  FIELD_CANNOT_GENERATE_EXISTING = 'FIELD_CANNOT_GENERATE_EXISTING',
  FIELD_NO_COMPUTE = 'FIELD_NO_COMPUTE',
  
  // Field validator errors
  FIELD_NOT_NULLABLE = 'FIELD_NOT_NULLABLE',
  FIELD_VALIDATOR_FAILED = 'FIELD_VALIDATOR_FAILED',
  FIELD_VALIDATORS_FAILED = 'FIELD_VALIDATORS_FAILED',

  // Association errors
  ASSOCIATION_INCOMPLETE = 'ASSOCIATION_INCOMPLETE',
  ASSOCIATION_INVALID = 'ASSOCIATION_INVALID',
  ASSOCIATION_VALIDATOR_NOT_FOUND = 'ASSOCIATION_VALIDATOR_NOT_FOUND',
  
  // Model errors
  ID_FIELD_CANNOT_BE_EXCLUDED = 'ID_FIELD_CANNOT_BE_EXCLUDED',
  MODEL_FIELD_VALIDATION_FAILED = 'MODEL_FIELD_VALIDATION_FAILED',
  
  // Context errors
  ASYNC_LOCAL_STORAGE_REQUIRES_NODEJS = 'ASYNC_LOCAL_STORAGE_REQUIRES_NODEJS',
  CONTEXT_USE_RUN_METHOD = 'CONTEXT_USE_RUN_METHOD',
  CONTEXT_AUTO_RESET = 'CONTEXT_AUTO_RESET',
  ASYNC_LOCAL_STORAGE_SETUP_FAILED = 'ASYNC_LOCAL_STORAGE_SETUP_FAILED',
  CONTEXT_ADAPTER_REQUIRED = 'CONTEXT_ADAPTER_REQUIRED',
};\n\nexport interface VerveErrorList {
  count(): number;
  add(code: ErrorCode, ...args: any[]): void;
  merge(errors: VerveErrorList): void;
  contains(code: ErrorCode): boolean;
  isEmpty(): boolean;
  isPresent(): boolean;
  toErrorMessages(): string[];
  toErrorMessagesWithCode(): string[];
}\n\n`;
    
    // Extract and include enum definitions
    const enumDefinitions = this.extractEnumDefinitions();
    if (enumDefinitions.length > 0) {
      content += enumDefinitions.join('\n') + '\n\n';
    }
    
    content += `declare global {\n`;
    content += `  interface VerveModels {\n`;

    for (const model of this.models) {
      content += `    ${model.name}: {\n`;
      content += `      // Fields\n`;
      
      // Generate field types
      for (const field of model.fields) {
        content += `      ${field.name}: ${field.type};\n`;
      }

      content += `\n      // Field instances\n`;
      
      // Generate field instance types
      for (const field of model.fields) {
        // Use the actual field value type for BoundField generic
        content += `      $${field.name}: BoundField<${field.type}>;\n`;
      }

      content += `    };\n`;
    }

    content += `  }\n`;
    content += `}\n`;

    content += `\nexport {};\n`;

    await fs.promises.writeFile(typesFile, content, 'utf-8');
    console.log(`Generated types written to: ${typesFile}`);
  }

  private async updateModelClasses(): Promise<void> {
    for (const filePath of this.processedFiles) {
      try {
        let content = await fs.promises.readFile(filePath, 'utf-8');
        let modified = false;

        for (const model of this.models) {
          // Look for class definitions that extend Model.Typed<any>()
          const anyPattern = new RegExp(
            `(class\\s+${model.name}\\s+extends\\s+Model\\.Typed)<any>\\(\\)`,
            'g'
          );
          
          if (anyPattern.test(content)) {
            content = content.replace(anyPattern, `$1<'${model.name}'>()`);
            modified = true;
            console.log(`Updated ${model.name} class in ${path.relative(this.rootPath, filePath)}`);
          }
        }

        if (modified) {
          await fs.promises.writeFile(filePath, content, 'utf-8');
        }
      } catch (error) {
        console.warn(`Warning: Could not update file ${filePath}:`, error);
      }
    }
  }
}

// Programmatic API
export async function generateTypes(targetPath?: string): Promise<void> {
  const scanPath = targetPath || process.cwd();
  
  if (!fs.existsSync(scanPath)) {
    throw new Error(`Path "${scanPath}" does not exist.`);
  }

  const generator = new ModelTypeGenerator(scanPath);
  await generator.generateTypes();
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const targetPath = args[0] || process.cwd();

  console.log(`Scanning for models in: ${targetPath}`);
  
  try {
    await generateTypes(targetPath);
    console.log('Type generation completed successfully!');
  } catch (error) {
    console.error('Error during type generation:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { ModelTypeGenerator };
