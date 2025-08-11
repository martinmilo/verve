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

interface ImportInfo {
  modulePath: string;
  importedTypes: string[];
  isDefault?: boolean;
  alias?: string;
  originFilePath?: string; // Store the original file path for orphaned imports
  originalStatement?: string; // Store the original import statement
}

interface ModelInfo {
  name: string;
  fields: FieldInfo[];
  sourceCode?: string; // Store original source code for type parsing
  filePath?: string; // Store the file path for import resolution
  imports?: ImportInfo[]; // Store external type imports
}

class ModelTypeGenerator {
  private models: ModelInfo[] = [];
  private processedFiles = new Set<string>();
  private orphanedImports: ImportInfo[] = []; // Imports from files where we couldn't extract models

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

  async generateTypes(): Promise<string> {
    await this.scanDirectory(this.rootPath);
    const content = await this.writeTypesFile();
    await this.updateModelClasses();
    return content;
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
          // Check if file has problematic absolute imports
          if (this.hasAbsoluteImports(sourceCode)) {
            // Create a temporary file with absolute imports commented out
            const tempSourceCode = this.commentOutAbsoluteImports(sourceCode);
            const tempFilePath = filePath.replace(/\.ts$/, '.temp.ts'); // Keep .ts extension for ts-node
            
            try {
              await fs.promises.writeFile(tempFilePath, tempSourceCode, 'utf-8');
              
              // Clear the require cache
              delete require.cache[require.resolve(path.resolve(tempFilePath))];
              
              const module = require(path.resolve(tempFilePath));
              await this.extractModelsFromModule(module, path.basename(filePath), sourceCode, filePath);
              
              // Clean up temp file
              await fs.promises.unlink(tempFilePath);
            } catch (tempError) {
              // Clean up temp file if it exists
              try {
                await fs.promises.unlink(tempFilePath);
              } catch {}
              
              console.warn(`Warning: Could not require TypeScript file ${filePath} (even with temp file):`, tempError);
              this.extractImportsOnly(sourceCode, filePath);
            }
          } else {
            // No problematic imports, proceed normally
            delete require.cache[require.resolve(path.resolve(filePath))];
            
            const module = require(path.resolve(filePath));
            await this.extractModelsFromModule(module, path.basename(filePath), sourceCode, filePath);
          }
        } catch (requireError) {
          console.warn(`Warning: Could not require TypeScript file ${filePath}:`, requireError);
          // Even if we can't require the module, we can still extract imports from source code
          // This is useful when models have unresolvable imports but we still want to copy the type imports
          this.extractImportsOnly(sourceCode, filePath);
        }
      } else {
        // Handle JavaScript files with dynamic import
        const absolutePath = path.resolve(filePath);
        const fileUrl = pathToFileURL(absolutePath).href;
        await this.importAndExtractModels(fileUrl, path.basename(filePath), sourceCode, filePath);
      }
    } catch (error) {
      console.warn(`Warning: Could not process file ${filePath}:`, error);
    }
  }

  private async extractModelsFromModule(module: any, fileName: string, sourceCode?: string, filePath?: string): Promise<void> {
    try {
      // Look for exported classes that have a schema property (indicating they're models)
      for (const [exportName, exportValue] of Object.entries(module)) {
        if (this.isModelClass(exportValue)) {
          const modelInfo = this.extractModelInfo(exportValue as any, exportName, sourceCode, filePath);
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

  private async importAndExtractModels(fileUrl: string, fileName: string, sourceCode?: string, filePath?: string): Promise<void> {
    try {
      const module = await import(fileUrl);
      await this.extractModelsFromModule(module, fileName, sourceCode, filePath);
    } catch (error) {
      // Silently ignore import errors as not all files may be importable
    }
  }

  private hasAbsoluteImports(sourceCode: string): boolean {
    // Check for imports that are not relative (don't start with . or /)
    // but exclude 'verve' imports which should work
    const importPattern = /import\s+[^;]+\s+from\s*['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importPattern.exec(sourceCode)) !== null) {
      const importPath = match[1];
      // Skip verve imports and relative/absolute file paths
      if (importPath === 'verve' || importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('node_modules')) {
        continue;
      }
      
      // This is a problematic absolute import
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        return true;
      }
    }
    
    return false;
  }

  private commentOutAbsoluteImports(sourceCode: string): string {
    // First, extract what types are being imported from absolute imports
    const importedTypes = new Map<string, string>();
    
    const absoluteImportPattern = /^(\s*import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from\s*['"](?![\.\/])[^'"]+['"]\s*;?\s*)$/gm;
    let match;
    
    while ((match = absoluteImportPattern.exec(sourceCode)) !== null) {
      if (match[2]) {
        // Named imports: { Type1, Type2 }
        const namedImports = match[2].split(',').map(s => s.trim());
        namedImports.forEach(imp => {
          const cleanName = imp.split(' as ')[0].trim();
          importedTypes.set(cleanName, 'string'); // Default placeholder type
        });
      } else if (match[3]) {
        // Namespace import: * as Namespace
        importedTypes.set(match[3], '{}');
      } else if (match[4]) {
        // Default import
        importedTypes.set(match[4], 'string');
      }
    }
    
    // Comment out absolute imports and replace with placeholders, but keep 'verve' imports
    let result = sourceCode.replace(/^(\s*import\s+[^;]+\s+from\s*['"]([^'"]+)['"]\s*;?\s*)$/gm, (match, fullMatch, importPath) => {
      // Don't comment out verve imports or relative imports
      if (importPath === 'verve' || importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('node_modules')) {
        return match; // Keep as-is
      }
      
      // Comment out the problematic absolute import and add placeholder declarations right after
      const commentedImport = `// ${match.trim()}`;
      
      // Extract types from this specific import to create placeholders
      const specificImportMatch = match.match(/import\s+(?:\{([^}]+)\}|\*\s+as\s+(\w+)|(\w+))\s+from/);
      if (specificImportMatch) {
        const placeholders: string[] = [];
        
        if (specificImportMatch[1]) {
          // Named imports
          const namedImports = specificImportMatch[1].split(',').map(s => s.trim());
          namedImports.forEach(imp => {
            const cleanName = imp.split(' as ')[0].trim();
            placeholders.push(`const ${cleanName} = "placeholder" as any;`);
          });
        } else if (specificImportMatch[2]) {
          // Namespace import
          placeholders.push(`const ${specificImportMatch[2]} = {} as any;`);
        } else if (specificImportMatch[3]) {
          // Default import
          placeholders.push(`const ${specificImportMatch[3]} = "placeholder" as any;`);
        }
        
        return commentedImport + '\n' + placeholders.join('\n');
      }
      
      return commentedImport;
    });
    
    return result;
  }

  private extractImportsOnly(sourceCode: string, filePath: string): void {
    // Extract imports from files where we couldn't load the module
    // but still want to capture external type imports for the generated file
    if (sourceCode.includes('@model')) {
      const imports = this.extractImports(sourceCode, filePath);
      if (imports.length > 0) {
        // Mark these imports with their origin file path for proper resolution
        const importsWithOrigin = imports.map(imp => ({ ...imp, originFilePath: filePath }));
        this.orphanedImports.push(...importsWithOrigin);
        console.log(`Extracted ${imports.length} import(s) from ${path.basename(filePath)} (module load failed)`);
      }
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

  private extractModelInfo(ModelClass: any, className: string, sourceCode?: string, filePath?: string): ModelInfo | null {
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

      // Extract imports from source code
      const imports = sourceCode ? this.extractImports(sourceCode, filePath) : [];

      return { name: className, fields, sourceCode, filePath, imports };
    } catch (error) {
      console.warn(`Warning: Could not extract model info for ${className}:`, error);
      return null;
    }
  }

  private extractImports(sourceCode: string, filePath?: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    
    // Extract all import statements as raw strings, preserving original syntax
    const importPattern = /^(\s*import\s+[^;]+\s+from\s*['"][^'"]+['"]\s*;?\s*)$/gm;
    let match;
    
    while ((match = importPattern.exec(sourceCode)) !== null) {
      const fullImportStatement = match[1].trim();
      
      // Parse the import to extract module path and imported types
      const moduleMatch = fullImportStatement.match(/from\s*['"]([^'"]+)['"]/);
      if (!moduleMatch) continue;
      
      const modulePath = moduleMatch[1];
      
      // Extract imported types for filtering
      const importedTypes: string[] = [];
      
      // Named imports: { Type1, Type2 }
      const namedMatch = fullImportStatement.match(/import\s*\{\s*([^}]+)\s*\}/);
      if (namedMatch) {
        const namedImports = namedMatch[1].split(',').map(item => {
          const trimmed = item.trim();
          // Handle alias: 'Type as Alias'
          return trimmed.includes(' as ') ? trimmed.split(' as ')[1].trim() : trimmed;
        });
        importedTypes.push(...namedImports);
      }
      
      // Default import: import Type from
      const defaultMatch = fullImportStatement.match(/import\s+(\w+)\s+from/);
      if (defaultMatch && !namedMatch && !fullImportStatement.includes('* as')) {
        importedTypes.push(defaultMatch[1]);
      }
      
      // Namespace import: import * as Namespace
      const namespaceMatch = fullImportStatement.match(/import\s*\*\s*as\s+(\w+)/);
      if (namespaceMatch) {
        importedTypes.push(namespaceMatch[1]);
      }
      
      imports.push({
        modulePath,
        importedTypes,
        isDefault: !!defaultMatch && !namedMatch && !namespaceMatch,
        alias: namespaceMatch ? namespaceMatch[1] : undefined,
        originalStatement: fullImportStatement // Store the original import statement
      });
    }

    return this.filterRelevantImports(imports, filePath);
  }

  private filterRelevantImports(imports: ImportInfo[], filePath?: string): ImportInfo[] {
    return imports.filter(importInfo => {
      // Skip imports from the verve library itself
      if (importInfo.modulePath === 'verve' || 
          importInfo.modulePath.includes('../../../src') || 
          importInfo.modulePath.startsWith('../src')) {
        return false;
      }

      // Skip utility functions and non-type imports
      const filteredTypes = importInfo.importedTypes.filter(typeName => {
        const lowerName = typeName.toLowerCase();
        if (lowerName.includes('date') && !typeName.match(/^[A-Z]/)) {
          return false; // Skip utility functions like nowDate
        }
        
        // Include types that start with uppercase (likely types/enums/interfaces)
        return /^[A-Z]/.test(typeName);
      });

      // Only include this import if it has remaining types after filtering
      if (filteredTypes.length === 0) {
        return false;
      }
      
      // Update the import with filtered types, but preserve original statement
      importInfo.importedTypes = filteredTypes;

      // Include if it's from type-related paths or has uppercase types (enums, interfaces, etc.)
      const isTypeRelatedPath = importInfo.modulePath.includes('/enums/') || 
                               importInfo.modulePath.includes('/types/') ||
                               importInfo.modulePath.includes('/interfaces/') ||
                               path.basename(importInfo.modulePath, path.extname(importInfo.modulePath)) === 'types';
      
      return isTypeRelatedPath || filteredTypes.length > 0;
    });
  }

  private resolveImportPath(importPath: string, fromFile: string, toFile: string): string {
    // If it's already a relative path, resolve it relative to fromFile and then make it relative to toFile
    if (importPath.startsWith('.')) {
      const absoluteImportPath = path.resolve(path.dirname(fromFile), importPath);
      const relativeToTarget = path.relative(path.dirname(toFile), absoluteImportPath);
      return relativeToTarget.startsWith('.') ? relativeToTarget : `./${relativeToTarget}`;
    }
    
    // For absolute module paths (like 'lodash'), return as-is
    return importPath;
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
        
        // Check if the enum is defined in the same file
        if (sourceCode.includes(`enum ${enumName}`)) {
          return enumName;
        }
        
        // Check for various import patterns and return the enum name if found
        if (this.isEnumImported(enumName, sourceCode)) {
          return enumName;
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  private isEnumImported(enumName: string, sourceCode: string): boolean {
    // Check for various import patterns:
    // 1. Named import: import { EnumName } from '...'
    // 2. Named import with alias: import { SomeEnum as EnumName } from '...'
    // 3. Default import: import EnumName from '...'
    // 4. Namespace import: import * as Namespace from '...' (then used as Namespace.EnumName)
    
    const importPatterns = [
      // Named import: import { EnumName } from '...'
      new RegExp(`import\\s*\\{[^}]*\\b${enumName}\\b[^}]*\\}\\s*from\\s*['"][^'"]+['"]`, 'i'),
      // Named import with alias: import { SomeEnum as EnumName } from '...'
      new RegExp(`import\\s*\\{[^}]*\\w+\\s+as\\s+${enumName}\\b[^}]*\\}\\s*from\\s*['"][^'"]+['"]`, 'i'),
      // Default import: import EnumName from '...'
      new RegExp(`import\\s+${enumName}\\s+from\\s*['"][^'"]+['"]`, 'i'),
      // Check if it's part of a namespace import (less common but possible)
      new RegExp(`import\\s*\\*\\s*as\\s+\\w+\\s+from\\s*['"][^'"]+['"].*${enumName}`, 'i')
    ];
    
    for (const importPattern of importPatterns) {
      if (importPattern.test(sourceCode)) {
        return true;
      }
    }
    
    // Enhanced fallback: check for any import that includes the enum name
    // This handles cases where the import might be formatted differently or spread across multiple lines
    const generalImportPattern = new RegExp(`import[^;]*${enumName}[^;]*from\\s*['"][^'"]*['"]`, 'i');
    if (generalImportPattern.test(sourceCode)) {
      return true;
    }
    
    // Check for multiline imports (common in prettier-formatted code)
    const multilineImportPattern = new RegExp(
      `import\\s*\\{[^}]*${enumName}[^}]*\\}\\s*from[^;]*;`,
      'gs' // global and dotall flags to match across lines
    );
    if (multilineImportPattern.test(sourceCode)) {
      return true;
    }
    
    return false;
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

  private collectImports(typesFile: string): ImportInfo[] {
    const importMap = new Map<string, ImportInfo>();
    
    // Get all model names to exclude them from imports
    const modelNames = new Set(this.models.map(model => model.name));
    
    // Process imports from successfully loaded models
    for (const model of this.models) {
      if (model.imports && model.filePath) {
        for (const importInfo of model.imports) {
          this.addImportToMap(importInfo, model.filePath, typesFile, modelNames, importMap);
        }
      }
    }
    
    // Process orphaned imports from failed model loads
    for (const importInfo of this.orphanedImports) {
      // Use the stored origin file path for proper import resolution
      const filePath = importInfo.originFilePath || this.rootPath;
      this.addImportToMap(importInfo, filePath, typesFile, modelNames, importMap);
    }
    
    return Array.from(importMap.values());
  }

  private addImportToMap(
    importInfo: ImportInfo, 
    fromFilePath: string, 
    typesFile: string, 
    modelNames: Set<string>, 
    importMap: Map<string, ImportInfo>
  ): void {
    // Filter out model names from imported types
    const filteredTypes = importInfo.importedTypes.filter(typeName => !modelNames.has(typeName));
    
    // Skip this import if no types remain after filtering
    if (filteredTypes.length === 0) {
      return;
    }
    
    // Resolve the import path relative to the generated types file
    const resolvedPath = this.resolveImportPath(importInfo.modulePath, fromFilePath, typesFile);
    
    // Create a unique key for deduplication
    const key = `${resolvedPath}:${importInfo.isDefault ? 'default' : 'named'}`;
    
    const filteredImportInfo = { ...importInfo, importedTypes: filteredTypes, modulePath: resolvedPath };
    
    if (importMap.has(key)) {
      // Merge imported types
      const existing = importMap.get(key)!;
      const mergedTypes = [...new Set([...existing.importedTypes, ...filteredImportInfo.importedTypes])];
      importMap.set(key, { ...existing, importedTypes: mergedTypes });
    } else {
      importMap.set(key, filteredImportInfo);
    }
  }

  private async writeTypesFile(): Promise<string> {
    const typesDir = path.join(this.rootPath, '.verve');
    const typesFile = path.join(typesDir, 'models.d.ts');

    // Ensure directory exists
    await fs.promises.mkdir(typesDir, { recursive: true });

    let content = `// ------------------------------------------------------
// THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
// ------------------------------------------------------
`;

    // Collect and deduplicate imports
    const allImports = this.collectImports(typesFile);
    
    // Add import statements using original syntax
    if (allImports.length > 0) {
      for (const importInfo of allImports) {
        if (importInfo.originalStatement) {
          // Use the original import statement with resolved path
          const originalWithResolvedPath = importInfo.originalStatement.replace(
            /from\s*['"][^'"]+['"]/,
            `from '${importInfo.modulePath}'`
          );
          // Ensure we don't add double semicolons
          const cleanStatement = originalWithResolvedPath.endsWith(';') 
            ? originalWithResolvedPath 
            : originalWithResolvedPath + ';';
          content += cleanStatement + '\n';
        } else {
          // Fallback to reconstructed import (shouldn't happen with new logic)
          if (importInfo.isDefault) {
            content += `import ${importInfo.importedTypes[0]} from '${importInfo.modulePath}';\n`;
          } else if (importInfo.alias) {
            content += `import * as ${importInfo.alias} from '${importInfo.modulePath}';\n`;
          } else {
            content += `import { ${importInfo.importedTypes.join(', ')} } from '${importInfo.modulePath}';\n`;
          }
        }
      }
      content += '\n';
    }

    for (const model of this.models) {
      content += `export type ${model.name} = VerveModels['${model.name}'];\n`;
    }
    
    content += '\n';
    
    // Extract and include enum definitions
    const enumDefinitions = this.extractEnumDefinitions();
    if (enumDefinitions.length > 0) {
      content += enumDefinitions.join('\n') + '\n\n';
    }
    
    content += `declare global {\n`;
    content += `  interface VerveModels {\n`;

    for (const model of this.models) {
      content += `    ${model.name}: {\n`;
      
      // Generate field types
      for (const field of model.fields) {
        content += `      ${field.name}: ${field.type};\n`;
      }

      content += `    };\n`;
    }

    content += `  }\n`;
    content += `}\n`;

    content += `\nexport {};\n`;

    await fs.promises.writeFile(typesFile, content, 'utf-8');
    console.log(`Generated types written to: ${typesFile}`);

    return content;
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
