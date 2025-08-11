# Verve

A TypeScript domain modeling library that helps you build secure business layers with **field-level authorization**, **business rule validation**, and **context-aware access control**.

## Why Verve?

Building robust domain models means more than just defining fields. You need to:

- ✅ **Enforce business rules** at the field level
- ✅ **Control who can read/write** specific fields based on context  
- ✅ **Authorize method calls** based on user roles and permissions
- ✅ **Validate business invariants** automatically
- ✅ **Prevent unauthorized access** to sensitive data

Verve makes this **declarative** and **type-safe**.

## Installation

```bash
npm install verve
```

## Use Cases

- **🏦 Financial Applications** - Secure account data, transaction authorization
- **🏥 Healthcare Systems** - HIPAA-compliant patient data access  
- **👥 Multi-tenant SaaS** - User isolation and role-based permissions
- **📊 Admin Dashboards** - Role-based field visibility and editing
- **🔐 Enterprise Apps** - Complex authorization workflows

## Philosophy of Verve

Verve is built on four core principles that guide every design decision:

### 🚨 **No Silent Errors**
We believe errors should be **loud and immediate**. When something goes wrong, Verve throws exceptions as soon as possible rather than allowing invalid states to propagate through your application or worse, corrupt your data. This means:

- **Field access validation** - Accessing uninitialized fields throws immediately
- **Authorization failures** - Permission violations throw clear, actionable errors
- **Business rule violations** - Validation failures are caught at the point of assignment or can be lazily evaluated at any point
- **Type safety** - Invalid operations are prevented at compile-time when possible

```typescript
const user = User.from({ name: 'John' })   // No email provided

user.name       // ✅ 'John' - field is initialized
user.email      // ❌ Throws - field is uninitialized
```

### 🎯 **Centralized Business Rules**
Rather than spreading business logic throughout your application layers, Verve keeps domain rules **transparent and in one place** - your model definitions. This means:

- **Field-level validation** - Business rule(s) applicable on single field
- **Authorization logic** - Access control is declared alongside field definitions  
- **Business invariants** - Cross-field validation ensures domain consistency
- **Single source of truth** - No hunting through controllers, services, and middleware

```typescript
@model({
  // Business rule: Salary constraints based on level
  salary: number().validate([
    (value, model) => {
      if (model.level === 'junior') return value <= 80_000
      if (model.level === 'senior') return value >= 100_000
      return value > 0
    }
  ])
  // Authorization: Only HR can read salary
  .readable((context) => context.auth.department === 'HR'),
  
  level: text()
})
class Employee extends Model.Typed<'Employee'>() {}
```

### 🔐 **Privacy is King**
Data privacy and security are not afterthoughts - they're **fundamental to how Verve works**. Every field access is checked and validated:

- **Field-level authorization** - Control exactly who can read/write each field
- **Context-aware permissions** - Access rules adapt based on user roles and relationships
- **Secure by default** - Sensitive fields can be hidden unless explicitly authorized
- **Method authorization** - Business operations require proper permissions

```typescript
@model({
  // Public information
  name: text(),
  
  // Sensitive data - never readable by default
  ssn: text().readable(false),
  
  // Context-sensitive access
  salary: number().readable((context, employee) => 
    context.auth.id === employee.id || context.auth.role === Role.HR
  )
})
class Employee extends Model.Typed<'Employee'>() {}
```

### ✨ **Safe Partial Models**
Verve provides **crystal-clear semantics** for field states, eliminating confusion between `null` and `undefined`:

- **`undefined`** - Field is uninitialized and will throw on access
- **`null`** - Field is intentionally empty (nullable fields only)

This enables safe partial model hydration where you can work with incomplete data while maintaining strict safety guarantees:

```typescript
// Partial hydration from API - only some fields provided
const user = User.from({ id: '123', name: 'John' })

user.name        // ✅ 'John' - field is initialized
user.email       // ❌ Throws - field is uninitialized
user.isActive    // ❌ Throws - field is uninitialized

// Check field state safely via model method
user.hasPresent('email')    // false - field 'email' is uninitialized
user.hasPresent('name')     // true - field 'name' has value

// Validate model fields against their validators safely
const errors = user.validate()    // VerveErrorList
if (errors.isEmpty()) {
  // You're good to go
}

// Nullable vs uninitialized
user.set({ bio: null })      // ✅ Explicitly set to null (if nullable)
user.set({ email: null })    // ❌ Throws since field is not nullable (IDE should also complain)
```

These principles ensure your domain models are **secure, predictable, and maintainable** while providing excellent developer experience through clear error messages and type safety.

## Practical Example

```typescript
import { Model, model, can, text, id, number, bool, option } from 'verve'

enum Role {
  USER = 'user',
  ADMIN = 'admin'
}

@model({
  id: id(),
  email: text().validate.only([(value) => value.includes('@')]),
  
  // Only readable by the user themselves or admins
  ssn: text().readable((context, user) => 
    context.auth.id === user.id || context.auth.role === Role.ADMIN
  ),
  
  // Only writable by admins 
  role: option(Role).writable((context) => 
    context.auth.role === Role.ADMIN
  ),
  
  // Business rule: age must be over 18
  age: number().validate.only([(value) => value >= 18]),
  
  // Never readable (passwords should never be exposed to anyone)
  password: text().readable(false),
  
  isActive: bool().default(true)
})
class User extends Model.Typed<'User'>() {
  
  // Only the user themselves can generate their credit report
  @can((context, user) => context.auth.id === user.id)
  generateCreditReport() {
    // Logic to generate credit report…
  }
  
  // Users can close their own account, admins can close any account
  @can((context, user) => 
    context.auth.id === user.id || context.auth.role === Role.ADMIN
  )
  closeAccount(reason: string) {
    // Logic to archive and close account, notify user…
  }
}
```

## Quick Start

Let's build your first Verve model step by step:

### 1. Define a Basic Model

```typescript
import { Model, model, text, id, number, bool, date } from 'verve'

@model({
  id: id(),
  name: text(),
  email: text(),
  age: number().nullable,
  isActive: bool().default(true),
  createdAt: date().generate(() => new Date())
})
class User extends Model.Typed<any>() {}
```

### 2. Update TS Configuration

Configure your `tsconfig.json` to tell TypeScript where to find the types that will be generated. **You only need to do this once** - no need to repeat this step for future models:

```json
{
  "compilerOptions": {
    // ... your existing options
  },
  "include": [
    "src/**/*",
    ".verve/models.d.ts"
  ]
}
```

### 3. Generate Types

Run the Verve CLI to generate TypeScript types from your model schema:

```bash
npx verve
```

This automatically updates your model class:

```typescript
// Before: Model.Typed<any>()
class User extends Model.Typed<any>() {}

// After: Model.Typed<'User'>()  
class User extends Model.Typed<'User'>() {}
```

### 4. Keep Types in Sync

Verve generates types from your actual schema definitions, but you should ensure these stay up to date. Consider adding a pre-commit hook or CI step:

```bash
# Add to package.json scripts
"scripts": {
  "pre-commit": "npx verve && git add ."
}
```

This way your IDE will always have accurate type information and won't complain about missing or outdated types.

## Core Features

### 🔐 Field-Level Authorization

Control exactly who can read or write each field:

```typescript
@model({
  // Public field - everyone can read/write
  name: text(),
  
  // Read-only for everyone except admins
  salary: number()
    .readable(true)
    .writable((context) => context.auth.role === Role.ADMIN),
  
  // Only readable by the owner or HR
  personalNotes: text().readable((context, employee) => 
    context.auth.id === employee.id || 
    context.auth.department === 'HR'
  ),
  
  // Never readable (sensitive data)
  encryptedData: text().readable(false)
})
class Employee extends Model.Typed<'Employee'>() {}
```

### ✅ Business Rule Validation

Enforce business rules and domain invariants automatically:

```typescript
@model({  
  // Single-field business rule validation
  age: number().validate([
    (value) => value >= 18 && value <= 120
  ]),

  // Single-field validation with multiple validators
  email: text().validate([
    (value) => value.includes('@'),
    (value) => value.endsWith('placeholder.com')
  ]),
  
  // Cross-field validation (using other model fields)
  salary: number().validate([
    (value, model) => {
      // Junior employees can't earn more than $80k
      if (model.level === 'junior') return value <= 80_000;
      // Senior employees must earn at least $100k
      if (model.level === 'senior') return value >= 100_000;
      return value > 0;
    }
  ]),
  
  level: option(['junior', 'mid', 'senior']),
  
  // Context-aware validation (using current user context)
  confidentialRating: number().validate([
    (value, model, context) => {
      // Only HR can set ratings above 8
      if (value > 8) return context.auth.department === 'HR';
      // Managers can set ratings 1-8
      if (value >= 1) return context.auth.role === 'manager' || context.auth.department === 'HR';
      return false;
    }
  ])
})
class Employee extends Model.Typed<'Employee'>() {}
```

Single-field validation handles basic constraints, cross-field validation enforces complex business rules between fields, and context-aware validation adapts rules based on who's making the change.

```typescript
@model({ 
  // Business invariant: discount cannot exceed price
  discount: number().validate([
    (value, model) => value <= model.price,
    (value) => value >= 0
  ]),
  
  price: number().validate([
    (value) => value > 0,
    (value) => Number.isFinite(value)
  ])
})
class Product extends Model.Typed<'Product'>() {}
```

Business invariants ensure your domain rules are always enforced, automatically **catching violations before they can corrupt your data**.

### 🎯 Method Authorization

Secure your domain methods:

```typescript
class BankAccount extends Model.Typed<'BankAccount'>() {
  
  // Only account owner can check balance
  @can((context, account) => context.auth.id === account.ownerId)
  getBalance() {
    return this.balance;
  }
  
  // Only admins can freeze accounts
  @can((context) => context.auth.role === Role.ADMIN)
  freeze() {
    this.isActive = false;
  }
  
  // Complex authorization logic
  @can((context, account) => {
    const isOwner = context.auth.id === account.ownerId;
    const isManager = context.auth.role === Role.MANAGER;
    const isSameBank = context.auth.bankId === account.bankId;
    
    return isOwner || (isManager && isSameBank);
  })
  transfer(amount: number, targetAccount: string) {
    // Transfer logic
  }
}
```

### 🏗️ Context-Aware Security

Set context for secure, request-scoped authorization:

#### Node.js Server

```typescript
import { Context } from 'verve'
import express from 'express'

// Set up proper request isolation for Node.js apps
Context.useAsyncLocalStorage()

const app = express()

// Middleware to extract user context from request  
app.use((req, res, next) => {
  const userContext = {
    auth: {
      id: req.user?.id,
      role: req.user?.role,
      department: req.user?.department
    }
  }
  
  // Context automatically scoped to this request
  Context.run(userContext, () => {
    next()
  })
})

// Your route handlers
app.get('/profile/:userId', (req, res) => {
  // Context automatically available, no context bleeding between requests
  const user = User.make({ id: req.params.userId, email: 'john@example.com' })
  
  try {
    const sensitiveData = user.ssn // ❌ Unauthorized access
    res.json({ ssn: sensitiveData })
  } catch (error) {
    res.status(403).json({ error: 'Unauthorized' })
  }
  
  res.json({ email: user.email }) // ✅ Public field
})
```

#### Browser Environment

Browser automatically uses global storage, no additional setup needed. If you want to be explicit:

```typescript
import { Context } from 'verve'

// Set context when user logs in
function handleLogin(user) {
  Context.set({
    auth: {
      id: user.id,
      role: user.role,
      permissions: user.permissions
    }
  })
}

// Clear context when user logs out
function handleLogout() {
  Context.reset()
}

// Context persists across your SPA until reset
const user = User.make({ email: 'john@example.com' })
console.log(user.email) // Uses current logged-in user context
```

#### Any Node.js Framework

```typescript
// Set up once at app startup
Context.useAsyncLocalStorage()

// Works with Fastify, Koa, NestJS, or any Node.js app
Context.run(userContext, () => {
  // All Verve operations use this context
  const model = MyModel.from(data)
  model.someAuthorizedMethod()
});
```

**Why different adapters?**
- **Node.js servers**: Need `AsyncLocalStorage` to prevent context leaking between concurrent requests
- **Browsers/SPAs**: Global storage works fine since there's only one user per browser tab

## Field Types

Verve supports rich field types with default/generated values and validation:

```typescript
@model({
  // Example of lazy validator
  name: text().validate.lazy([(v) => v.length < 20]),

  // By default all validators are eager
  email: text().validate([(v) => v.includes('@')]),
  
  // Numeric field with business rules
  price: number().validate([(v) => v > 0]),
  
  // Boolean field with defaults
  isActive: bool().default(true),
  
  // Date field with automatically generated date
  createdAt: date().generate(() => new Date()),
  
  // Enum field
  status: option(Status).default(Status.PENDING),
  
  // Array field
  tags: list<string>().default([]),
  
  // Object field
  metadata: record<{ theme: string; lang: string }>()
    .default({ theme: 'light', lang: 'en' })
})
class MyModel extends Model.Typed<'MyModel'>() {}
```

### Basic Types

```typescript
// ID field - for unique identifiers (usually strings)
id()

// Text field - for strings
text()

// Number field - for integers and floats  
number()

// Boolean field - for true/false values
bool()

// Date field - for Date objects
date()
```

### Complex Types

```typescript
// Option field - for enums and constrained values
option(['draft', 'published', 'archived'])
option(StatusEnum)

// List field - for arrays
list<string>()              // Array of strings
list<User>()               // Array of User models

// Record field - for objects
record<{ name: string; age: number }>()
```

### Field Modifiers

Each field type supports different modifiers based on its capabilities:

#### ID Field

```typescript
id()
  .generate(() => crypto.randomUUID())  // Generate ID when creating new models
  .validate([(id) => id.length > 0])    // Validate ID format

// Note: ID fields are only writable when model.isNew() - automatically enforced
```

#### Text Field

```typescript
text()
  .nullable                             // Allow null values
  .default('Hello World')               // Static default value
  .generate(() => crypto.randomUUID())  // Generate value on model creation
  .validate([(value) => value.length > 3])  // Validation rules
  .validate.only([(value) => value.includes('@')])  // Ignore global validators, use only these
  .validate.lazy([(value) => value.length < 1000])  // Lazy validation (not run immediately)
  .readable((context, model) => context.auth.role === 'admin')  // Read authorization
  .writable((context, model) => context.auth.id === model.ownerId)  // Write authorization
```

#### Number Field

```typescript
number()
  .nullable                             // Allow null values
  .default(0)                          // Static default value
  .generate(() => Math.random())        // Dynamic generated value
  .validate([(value) => value > 0])    // Validation rules
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.department === 'finance')
```

#### Boolean Field

```typescript
bool()
  .nullable                             // Allow null values
  .default(true)                       // Static default value
  .validate([(value) => value === true])  // Validation rules
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.id === model.ownerId)
```

#### Date Field

```typescript
date()
  .nullable                             // Allow null values
  .generate(() => new Date())          // Generate value on model creation
  .validate([(value) => value > new Date('2000-01-01')])  // Validation rules
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.id === model.ownerId)

// Note: Date fields don't support .default() - use .generate() instead
```

#### Option Field

```typescript
option(['draft', 'published', 'archived'])
  .nullable                             // Allow null values
  .default('draft')                    // Static default value
  .validate([(value) => value !== 'archived'])  // Additional validation
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.role === 'editor')
```

#### List Field

```typescript
list<string>()
  .nullable                             // Allow null values
  .default([])                         // Static default value
  .default(() => ['default', 'items']) // Dynamic default value
  .generate(() => [crypto.randomUUID()]) // Generate value on model creation
  .validate([(items) => items.length <= 10])  // Validation rules
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.id === model.ownerId)
```

#### Record Field

```typescript
record<{ name: string; age: number }>()
  .nullable                             // Allow null values
  .default({ name: 'Anonymous', age: 0 })  // Static default value
  .default(() => ({ name: 'User', age: new Date().getFullYear() - 2000 }))  // Dynamic default
  .generate(() => ({ id: crypto.randomUUID(), timestamp: Date.now() }))  // Generate on creation
  .validate([(obj) => obj.name && obj.name.length > 0])  // Validation rules
  .readable((context, model) => context.auth.role === 'admin')
  .writable((context, model) => context.auth.id === model.ownerId)
```

## Global Field Configuration

Set up global behaviors that apply to all fields of a specific type across your entire application:

### Global Generators

```typescript
import { IdField, TextField, DateField } from 'verve'

// Set global ID generation for all id() fields
IdField.setGlobalGenerator(() => crypto.randomUUID())

// Set global timestamp generation for all date() fields  
DateField.setGlobalGenerator(() => new Date())

// Now all models automatically use these generators
@model({
  id: id(),           // Uses crypto.randomUUID() by default
  createdAt: date()   // Uses new Date() by default
})
class User extends Model.Typed<'User'>() {}
```

### Global Validators

```typescript
// Set global validation for all text() fields
TextField.setGlobalValidator((value) => {
  if (typeof value !== 'string') return false
  return value.trim().length > 0 // No empty strings allowed
})

// Set global validation for all date() fields
DateField.setGlobalValidator((value) => {
  const minDate = new Date('1970-01-01')
  const maxDate = new Date('2100-12-31')
  return value >= minDate && value <= maxDate
});

// Global validators run on ALL fields of that type
@model({
  name: text(),       // Must pass TextField global validator
  email: text(),      // Must pass TextField global validator  
  birthDate: date()   // Must pass DateField global validator
})
class User extends Model.Typed<'User'>() {}
```

### How Validators Combine

```typescript
// Global validator applies to all text fields
TextField.setGlobalValidator((value) => value.trim().length > 0);

@model({
  // ✅ Adds to global validators - BOTH will run
  name: text().validate([(value) => value.length <= 50]),
  
  // ✅ Adds to global validators - ALL will run  
  email: text()
    .validate([
      (value) => value.includes('@'),
      (value) => value.includes('.'),
    ]),

  // ❌ Ignores global validators - ONLY custom validator runs
  internalCode: text().validate.only([(value) => /^[A-Z0-9]+$/.test(value)])
})
class User extends Model.Typed<'User'>() {}

// Validation execution order:
// name: [global validator, length <= 50]
// email: [global validator, includes '@', includes '.'] 
// description: [global validator, then lazy length check]
// internalCode: [ONLY the regex validator - global ignored]
```

### Practical Use Cases

```typescript
// Security: Prevent XSS in all text fields
// Note: Use more comprehensive regex to secure your text fields
TextField.setGlobalValidator((value) => {
  return !/<script|javascript:|on\w+=/i.test(value)
})

// Business rules: All dates must be reasonable (for our application use-case)
DateField.setGlobalValidator((value) => {
  const now = new Date()
  const minDate = new Date(0) // 1970-01-01
  const maxDate = new Date('2050-01-01')
  return value >= minDate && value <= maxDate
})

// Consistency: All IDs follow same format
IdField.setGlobalGenerator(() => crypto.randomUUID())
```

**Key Benefits:**
- **Consistency** - Same behavior across all models automatically
- **Security** - Global validation catches issues everywhere
- **DRY principle** - Define common rules once, apply everywhere
- **Flexibility** - Use `.validate.only()` when you need exceptions

## Field Access Methods

Every model has various helper methods that can help you retrieve or modify field values:

### Value Access

```typescript
const user = User.make({ name: 'John', age: 30 })

// Get field value (throws if not valid/readable/initialized)
user.name                   // 'John'

// Unsafe get (returns undefined if the field is not initialized and bypasses all validators and checks)
user.unsafeGet('name')      // 'John' or undefined

// Set field value (throws if not writable)
user.set({ name: 'Jane' })

// Completely unset the value from the model's state (uninitialize)
user.unset('name')
```

### Value Checking

```typescript
// Check if field is empty/present
user.hasEmpty('name')       // true if null/undefined or empty array/object
user.hasPresent('name')     // opposite of the isEmpty method

// Check field validity
user.hasValid('name')       // true if passes all validators
user.validate('name')       // returns VerveErrorList related to 'name' field
user.validate()             // returns VerveErrorList (merged errors from all fields)
```

### Generate Value

```typescript
// Generate field value (for fields with lazy .generate())
user.generate('id')         // generates new ID
user.generate()             // generates values for all fields that can be generated
```

**Prefer field methods to set values over direct assignment:**

```typescript
// ✅ Recommended
user.set({ email: 'new@example.com', name: 'Martin' })

// ⚠️ Also works but prefer above method
user.email = 'new@example.com'
user.name = 'Martin'
```

## Model Types & Instantiation

### Model Type Definitions

```typescript
// Untyped model - minimal type safety
class User extends Model {}

// Typed model before type generation
// Use this when you need to re-generate types or don't have any generated types yet
class User extends Model.Typed<any>() {}

// Typed model with generated types
class User extends Model.Typed<'User'>() {}
```

After running `npx verve`, your models get full type safety:

```typescript
// Before: Model.Typed<any>() 
// After: Model.Typed<'User'>() - with complete type information
```

### Model Instantiation

**Critical difference between `make` and `from`:**

```typescript
// make() - Creating NEW models
// All fields passed to constructor are recorded as CHANGES
// This includes generated and default fields
// For example, lets assume the field types defines for the model:
  // id: id(),                          <-- generated
  // isActive: bool().default(false)    <-- defualt
const newUser = User.make({
  name: 'John',
  email: 'john@example.com'
})
newUser.isNew()        // true
newUser.getChanges()   // { id: '1', name: 'John', email: 'john@example.com', isActive: false }

// from() - Hydrating EXISTING models (from DB, API, etc.)
// Only subsequent mutations are recorded as CHANGES
// This would NOT execute generate and default
const existingUser = User.from({
  id: '123',
  name: 'John', 
  email: 'john@example.com'
})
existingUser.isExisting()  // true
existingUser.getChanges()  // {} - no changes yet

existingUser.set({ name: 'Jane' })
existingUser.getChanges()  // { name: 'Jane' } - only the mutation

// Manually generating fields on a model that was hydrated also fails
existingUser.generate('id') // ❌ Field cannot be generated on existing model
```

#### Model Properties

By default, all fields and their state is set on an instance of a model. Exception to this are non-readable properties.

```typescript
@model({
  name: text(),
  password: text().readable(false),   // Sensitive information, always hidden
})
class User extends Model.Typed<'User'>() {}

// Let's hydrate the model and log it
const user = User.from({ name: 'Martin', password: '123456' })
// Since password not readable, it's filtered out from the object properties
console.log(user)       // { name: 'Martin' }
// Same for when you try to JSON stringify the object
JSON.stringify(user)    // '{"name":"Martin"}'
```

You may now think how to actually get the non-readable data for create/update operations.

```typescript
// Let's say we want to create new user and after validation, we want to store it in the DB
const user = User.make({ name: 'Martin', password: '123456' })
// How to get all the fields, including non-readable password?

user.getChanges()   // { name: 'Martin', password: '123456' }

// Careful, 'getChanges' method won't give you any changes on models that were hydrated (existing) using 'from'
const user = User.from({ name: 'Martin', password: '123456' })

user.getChanges()   // {}

// But works if I mutate the password now and try to get changes
user.set({ password: '12345678' })
user.getChanges()   // { password: '12345678' }
```

## Model Instance Methods

Every model instance provides these methods:

### Change Tracking

```typescript
const user = User.from({ name: 'John', age: 30 })
user.set({ name: 'Jane', age: 31 })
user.set({ name: 'Joe' })

// Gets latest changes per field since hydration
user.getChanges()      // { name: 'Joe', age: 31 }

// Gets detailed change log with all changes
user.getChangeLog()    // Array of change objects with timestamps including all changes (not just the latest field change)

// Example after unsetting field
user.unset('name')    // This erases change log for 'name' field
user.getChanges()     // { age: 31 }
user.getChangeLog()   // Would not contain any changes on 'name' field

// Check if model is new or existing
user.isNew()          // false
user.isExisting()     // true since model was created with 'from' method (hydrating existing model)
```

### Field Selection

```typescript
// Keep only specific fields (unset others)
user.only(['name'])   // Only name remains (+ automatically all fields that used id() field type)
console.log(user)     // User { id: '123', name: 'Martin' }

// Remove specific fields 
user.except(['name'])
console.log(user)     // User { id: '123', isActive: true }

// Note: ID fields are never removed by only() or except()
```

The `make` vs `from` distinction ensures you always know exactly what data has changed.

## Advanced Usage

### Dynamic Authorization Rules

```typescript
@model({
  // Authorization based on field value
  confidentialNotes: text().readable((context, doc, value) => {
    // Only show if user has clearance level >= document level
    return context.auth.clearanceLevel >= doc.securityLevel
  }),
  
  // Time-based access
  temporaryData: text().readable((context) => {
    const now = new Date();
    const workHours = now.getHours() >= 9 && now.getHours() <= 17;
    return context.auth.role === Role.ADMIN || workHours
  })
})
class SecureDocument extends Model.Typed<'SecureDocument'>() {}
```

## Error Handling

Verve provides a comprehensive error handling system with structured error codes, customizable messages, and security-conscious error exposure.

### Error Types & Common Scenarios

Verve throws clear, actionable errors for security violations and validation failures:

```typescript
try {
  // Validation error - business rule violation
  const user = User.make({ age: 16 }) // ❌ Age must be >= 18
} catch (error) {
  console.log(error.message) // "FIELD_VALIDATOR_FAILED: Field 'age' validator 'ageValidator' failed on model 'User'"
}

try {
  // Authorization error - field not readable
  console.log(user.ssn) // ❌ Field not readable by current context
} catch (error) {
  console.log(error.message) // "FIELD_NOT_READABLE: Field 'ssn' is not readable on model 'User'"
}

try {
  // Authorization error - method not authorized
  user.promoteToAdmin() // ❌ Only admins can promote
} catch (error) {
  console.log(error.message) // "UNAUTHORIZED_METHOD_CALL: Unauthorized to call method 'promoteToAdmin'"
}

try {
  // Model instantiation error
  new User() // ❌ Direct instantiation not allowed
} catch (error) {
  console.log(error.message) // "DIRECT_INSTANTIATION_NOT_ALLOWED: Direct instantiation not allowed. Use .make() or .from() instead."
}
```

### Error Checking & Handling

Use the `VerveError` class to check for specific error types:

```typescript
import { VerveError, ErrorCode } from 'verve'

const errors = user.validate('ssn')    // Returns VerveErrorList

// Check presence of the errors
if (errors.isPresent()) {
  // Do something with these errors, throw or log, prevent further logic to be executed

  // You can also check for specific error
  if (errors.contains(ErrorCode.FIELD_VALIDATOR_FAILED)) {
    // Invalid value provided
  }

  if (errors.contains(ErrorCode.FIELD_NOT_READABLE)) {
    // Unauthorized access
  }
}

// Check if errors list is empty
if (errors.isEmpty()) {
  // No errors, good to go
}
```

**You can also use validate method on the model to validate all fields:**

```typescript
import { VerveError, ErrorCode } from 'verve'

const errors = user.validate()    // Returns VerveErrorList

// This might contain validation errors for all fields that failed
if (errors.isEmpty()) {
  // Execute your logic
}
```

### Custom Error Messages

Override default error messages for better user experience or localization:

```typescript
import { ErrorRegistry, ErrorCode } from 'verve'

// Register custom error messages
ErrorRegistry.register({
  [ErrorCode.FIELD_NOT_READABLE]: 'You do not have permission to view this information.',
  [ErrorCode.FIELD_NOT_WRITABLE]: 'This field cannot be modified.',
  [ErrorCode.FIELD_VALIDATOR_FAILED]: 'The value you entered is not valid.',
  [ErrorCode.UNAUTHORIZED_METHOD_CALL]: 'You are not authorized to perform this action.',
  [ErrorCode.FIELD_NOT_NULLABLE]: 'This field is required and cannot be empty.'
})

// Now all errors use your custom messages
try {
  user.ssn // ❌ Not readable
} catch (error) {
  console.log(error.message) 
  // "FIELD_NOT_READABLE: You do not have permission to view this information."
}
```

### Message Templating

Error messages support dynamic templating with field and model information:

```typescript
// Some of the default messages use {{field}}, {{model}}, and other contextual data
ErrorRegistry.register({
  [ErrorCode.FIELD_VALIDATOR_FAILED]: "Field '{{field}}' validator '{{validator}}' failed on model '{{model}}'",
  [ErrorCode.FIELD_NOT_READABLE]: "Field '{{field}}' is not readable on model '{{model}}'",
  [ErrorCode.ASSOCIATION_INCOMPLETE]: 'You must call .to(...) after .associate({{from}})',
})

// Templates are automatically populated with context
try {
  user.set({ age: -5 }) // ❌ Validation fails
} catch (error) {
  console.log(error.message)
  // "FIELD_VALIDATOR_FAILED: The value for 'age' is invalid on model User"
}
```

### Production-Safe Error Hiding

Hide error codes in production to prevent information leakage:

```typescript
import { ErrorRegistry } from 'verve'

// In production, hide error codes from end users
if (process.env.NODE_ENV === 'production') {
  ErrorRegistry.hideCodes()
}

// Now errors only show user-friendly messages without codes
try {
  user.creditScore // ❌ Not readable
} catch (error) {
  console.log(error.message)
  
  // Development: "FIELD_NOT_READABLE: Field 'creditScore' is not readable on model 'User'"
  // Production:  "Field 'creditScore' is not readable on model 'User'"
}
```

Or differentiate between  production and development errors completely:

```typescript
import { ErrorRegistry } from 'verve'

// In production, hide error codes from end users
if (process.env.NODE_ENV === 'production') {
  ErrorRegistry.register({
    [ErrorCode.FIELD_NOT_READABLE]: "You're not authorized to read '{{field}}'",
  })
  ErrorRegistry.hideCodes()
}

// Now errors only show user-friendly messages without codes or model information
try {
  user.creditScore // ❌ Not readable
} catch (error) {
  console.log(error.message)
  
  // Development: "FIELD_NOT_READABLE: Field 'creditScore' is not readable on model 'User'"
  // Production:  "You're not authorized to read 'creditScore'"
}
```

### Error Logging & Monitoring
```typescript
import { VerveError, ErrorCode } from 'verve'

function logError(error: unknown) {
  if (error instanceof VerveError) {
    logVerveError(error)
    return
  }
  // Rest of your error logging logic
}

function logVerveError(error: VerveError) {
  // Log security violations for monitoring
  if (error.is(ErrorCode.UNAUTHORIZED_METHOD_CALL) || 
      error.is(ErrorCode.FIELD_NOT_READABLE)) {
    logger.warn('Security violation:', {
      error: error.message,
      user: context.auth.id,
      timestamp: new Date().toISOString()
    })
  }
  
  // Log validation failures for data quality monitoring
  if (error.is(ErrorCode.FIELD_VALIDATOR_FAILED)) {
    logger.info('Validation failure:', {
      error: error.message,
      user: context.auth.id
    })
  }
}
```

The error system ensures your application fails securely with actionable feedback while maintaining security in production environments.

## TypeScript Integration

Full type safety with excellent IDE support:

```typescript
const user = User.make({ email: 'test@example.com' })

// ✅ TypeScript knows these field types
user.email        // string
user.age          // number | null  
user.isActive     // boolean

// ✅ Method parameters are typed
user.set({ email: 'new@example.com' })    // ✅ string
user.set({ age: 25 })                     // ✅ number

user.set({ age: 'Hello' })                // ❌ TypeScript error
user.set({ random: 'Something' })         // ❌ TypeScript error
```

## Best Practices

### 1. **Defense in Depth**
```typescript
// Layer multiple security checks
@model({
  creditScore: number()
    .readable((context, user) => context.auth.id === user.id)  // Only owner
    .validate.only([(score) => score >= 300 && score <= 850]) // Valid range
})
class CreditReport extends Model.Typed<'CreditReport'>() {
  
  @can((context, report) => 
    context.auth.id === report.userId &&           // Must be owner
    context.auth.verified === true                 // Must be verified
  )
  requestIncrease() { /* ... */ }
}
```

### 2. **Centralized Rules**
```typescript
// Define reusable authorization rules
const SecurityRules = {
  isOwner: (context: any, model: any) => context.auth.id === model.ownerId,
  isAdmin: (context: any) => context.auth.role === Role.ADMIN,
  isOwnerOrAdmin: (context: any, model: any) => 
    SecurityRules.isOwner(context, model) || SecurityRules.isAdmin(context)
}

@model({
  privateData: text().readable(SecurityRules.isOwnerOrAdmin)
})
class SecureModel extends Model.Typed<'SecureModel'>() {}
```

### 3. **Fail Secure**
```typescript
// Always default to secure (no access)
@model({
  sensitiveField: text().readable(false), // Default: no access
  
  // Only grant specific permissions
  publicField: text().readable(true)
})
class SecureByDefault extends Model.Typed<'SecureByDefault'>() {}
```

## Roadmap

We're continuously improving Verve to make domain modeling even more powerful and developer-friendly. Here's what's coming:

### 🎯 Custom Validator Errors
- **Field-level custom errors** - Define specific error messages for validation failures
- **Contextual error formatting** - Error messages that adapt based on user context and permissions

```typescript
// Not implemented yet, just an idea 🚨
text().validate([
  (value) => value.length > 3,
  { message: 'Name must be at least 4 characters long' }
])
```

### 🔧 Custom Field Types
- **Type-specific utilities** - Field helpers tailored to each field type's unique needs
- **Advanced validation helpers** - Common validation patterns as reusable helpers
- **Field transformation utilities** - Built-in formatters and sanitizers

```typescript
// Not implemented yet, just an idea 🚨
email()                     // Text field with built-in email validation
currency()                  // Currency formatting and validation
```
Or by enhancing base fields types:

```typescript
// Not implemented yet, just an idea 🚨
date().businessDays()       // Business day calculations
list().unique()             // Ensure array items are unique
```

### 🔗 In-Memory Association Loading
- **Automatic association hydration** - Load related models from in-memory storage
- **Lazy loading strategies** - Load associations on-demand for performance
- **Circular reference handling** - Safe handling of complex model relationships

```typescript
// Not implemented yet, just an idea 🚨
@model({
  posts: list('Post').loadFrom('memory'),  // Auto-load from in-memory store
  profile: record('Profile').lazy()        // Load on first access
})
class User extends Model.Typed<'User'>() {}
```

### 🚀 Additional Features
- **Advanced caching strategies** - Built-in caching for computed fields and associations
- **Performance optimizations** - Zero-cost abstractions and faster field access
- **Developer tooling** - Better IDE support and debugging utilities

**Want to contribute or suggest features?** We'd love to hear from you! Please open an issue to discuss new ideas.

## License

MIT 