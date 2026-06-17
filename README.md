<!-- eslint-disable markdown/no-multiple-h1 -->

# NodeStorageManager and NodeStorage

[![npm version](https://img.shields.io/npm/v/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
[![npm downloads](https://img.shields.io/npm/dt/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
![Node.js CI](https://github.com/Luligu/node-persist-manager/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/node-persist-manager/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/node-persist-manager/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/node-persist-manager)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/styled_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

NodeStorage is a lightweight, file-based storage management system for Node.js, built on top of `node-persist`. It allows for easy and intuitive handling of persistent key-value storage directly within your Node.js applications. This system is ideal for small to medium-sized projects requiring simple data persistence without the overhead of a database system.

If you like this project and find it useful, please consider giving it a star on [GitHub](https://github.com/Luligu/node-persist-manager) and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## Features

- Simple and intuitive API for data storage and retrieval.
- Asynchronous data handling.
- Customizable storage directories for isolated storage contexts.
- Built-in logging capabilities for monitoring storage initialization and operations.
- Comprehensive test suite using Jest to ensure reliability and performance.
- Detailed documentation with JSDoc for better developer experience.

## Getting Started

### Prerequisites

- Node.js installed on your machine.
- Basic knowledge of TypeScript and Node.js.

### Installation

To get started with NodeStorage in your package

```bash
npm install node-persist-manager
```

### TypeScript & ESM Support

This package is written in **TypeScript** and distributed as an **ECMAScript module (ESM)**. You should use `import` statements to use it in your project:

```typescript
import { NodeStorageManager, NodeStorage } from 'node-persist-manager';
```

- If you are using CommonJS, consider using dynamic `import()` or transpiling your code to ESM.
- Type definitions are included out of the box for TypeScript users.

# Usage

## Initializing NodeStorageManager:

Create an instance of NodeStorageManager to manage your storage instances.

```typescript
import { NodeStorageManager, NodeStorage } from 'node-persist-manager';
```

```typescript
const storageManager = new NodeStorageManager({
  dir: 'path/to/storage/directory', // Optional: Customize the storage directory.
  logging: true, // Optional: Enable logging.
});
```

## Creating a Storage Instance:

Use the manager to create a new storage context.

```typescript
const myStorage = await storageManager.createStorage('myStorageName');
```

Using the Storage:

## Set a value:

```typescript
await myStorage.set('myKey', 'myValue');
```

## Get a value:

```typescript
const value = await myStorage.get('myKey');
console.log(value); // Outputs: 'myValue'
```

## Remove a value:

```typescript
await myStorage.remove('myKey');
```

## Clear the storage:

```typescript
await myStorage.clear();
```

# API Reference

## NodeStorageManager methods:

- async createStorage(storageName: string): Promise&lt;NodeStorage&gt;

- async removeStorage(storageName: string): Promise&lt;boolean&gt;

- async logStorage(): Promise&lt;void&gt;

- async getStorageNames(): Promise&lt;NodeStorageName[]&gt;

- async logStorage(): Promise&lt;void&gt;

## NodeStorage methods:

- async set<T = any>(key: NodeStorageKey, value: T): Promise&lt;void&gt;

- async get<T = any>(key: NodeStorageKey, defaultValue?: T): Promise&lt;T&gt;

- async remove(key: NodeStorageKey): Promise&lt;void&gt;

- async clear(): Promise&lt;void&gt;

- async logStorage(): Promise&lt;void&gt;

# Repository setup

> **Note:** This repository uses a new toolchain. It replaces the traditional TypeScript / ESLint / Prettier / Jest stack with a faster, lighter setup.

- **No `typescript` package** — replaced by [TypeScript Native](https://github.com/microsoft/typescript-go). The `typescript` package is kept only as a publish-time dependency while tsgo is still in preview.
- **No ESLint, no Prettier** — replaced by the [oxc](https://oxc.rs) stack: [oxlint](https://oxc.rs/docs/guide/usage/linter.html) for linting and [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) for formatting.
- **No Jest** — replaced by [Vitest](https://vitest.dev), which is much faster and natively supports ESM without extra configuration.
- **Far fewer development dependencies** — the number of installed packages drops from **~600** to **~80**. A clean install is much faster.
- **Much faster linting and formatting** — oxlint and oxfmt run in a fraction of the time required by the ESLint / Prettier pipeline.
- **Much faster builds** — tsgo compiles the project in a fraction of the time required by the standard `tsc` build.
- **Editor support** — uses the VS Code extensions for tsgo and oxc to get the same experience in the editor.

# Contributing

Contributions to NodeStorage are welcome.

# License

This project is licensed under the MIT License - see the LICENSE file for details.

# Acknowledgments

Thanks to node-persist for providing the underlying storage mechanism.
