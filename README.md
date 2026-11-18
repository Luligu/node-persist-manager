# NodeStorageManager and NodeStorage

[![npm version](https://img.shields.io/npm/v/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
[![npm downloads](https://img.shields.io/npm/dt/node-persist-manager.svg)](https://www.npmjs.com/package/node-persist-manager)
![Node.js CI](https://github.com/Luligu/node-persist-manager/actions/workflows/build.yml/badge.svg)
![CodeQL](https://github.com/Luligu/node-persist-manager/actions/workflows/codeql.yml/badge.svg)
[![codecov](https://codecov.io/gh/Luligu/node-persist-manager/branch/main/graph/badge.svg)](https://codecov.io/gh/Luligu/node-persist-manager)
[![tested with Vitest](https://img.shields.io/badge/tested_with-Vitest-6E9F18.svg?logo=vitest&logoColor=white)](https://vitest.dev)
[![styled with Oxc](https://img.shields.io/badge/styled_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/formatter.html)
[![linted with Oxc](https://img.shields.io/badge/linted_with-Oxc-9BE4E0.svg?logo=oxc&logoColor=white)](https://oxc.rs/docs/guide/usage/linter.html)
[![TypeScript Native](https://img.shields.io/badge/TypeScript_Native-3178C6?logo=typescript&logoColor=white)](https://github.com/microsoft/typescript-go)
[![ESM](https://img.shields.io/badge/ESM-Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org/)

---

NodeStorage is a lightweight storage management system for Node.js and Bun, built on top of the SQLite embedded in the runtime: `node:sqlite` on Node.js and `bun:sqlite` on Bun. It allows for easy and intuitive handling of persistent key-value storage directly within your applications, with no dependencies. This system is ideal for small to medium-sized projects requiring simple data persistence without the overhead of a database server.

If you like this project and find it useful, please consider giving it a star on [GitHub](https://github.com/Luligu/node-persist-manager) and sponsoring it.

<a href="https://www.buymeacoffee.com/luligugithub"><img src="https://matterbridge.io/assets/bmc-button.svg" alt="Buy me a coffee" width="120"></a>

## Features

- Simple and intuitive API for data storage and retrieval.
- Asynchronous data handling.
- Customizable storage directories for isolated storage contexts.
- Built-in logging capabilities for monitoring storage initialization and operations.
- No dependencies: uses `node:sqlite` on Node.js and `bun:sqlite` on Bun.
- Automatic import of the data stored by the previous `node-persist` based versions.
- Comprehensive test suite using Vitest to ensure reliability and performance.
- Detailed documentation with JSDoc for better developer experience.

## Getting Started

### Prerequisites

- Node.js 22.13 or later (or Bun) installed on your machine.
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

## BigInt values:

BigInts are supported by default, including nested objects and arrays:

```typescript
await myStorage.set('counter', 9007199254740993n);
const counter = await myStorage.get<bigint>('counter');
```

The default serialization callbacks use `__node_persist__:bigint:<digits>` strings to preserve BigInt precision. Literal strings starting with `__node_persist__:` are escaped with `__node_persist__:string:` and restored on read.

Custom `stringify` and `parse` callbacks must be provided together through `NodeStorageManager` options and use compatible encodings. Providing only one throws a `TypeError`. When both are omitted or undefined, the default pair is used. To use standard JSON behavior, pass `{ stringify: JSON.stringify, parse: JSON.parse }`.

Existing JSON files remain readable, but old literal strings matching the reserved BigInt or string markers are interpreted by the new parser.

> [!WARNING]
> **Downgrade risk:** Versions without this serializer read stored BigInts as prefixed strings and leave escaped strings encoded. Applications expecting BigInts or the original strings may fail or behave incorrectly. Back up your storage before upgrading; before downgrading, restore a compatible backup or migrate the data to a format the older version supports.

## Circular references:

> [!WARNING]
> Circular references are not supported by the default serializer. `storage.set()` rejects with a `TypeError` before writing the value. Await the operation and handle the rejection to avoid an unhandled promise rejection.

```typescript
const circular: { self?: unknown } = {};
circular.self = circular;

try {
  await myStorage.set('circular', circular);
} catch (error) {
  console.error('Unable to store circular data:', error);
}
```

## Remove a value:

```typescript
await myStorage.remove('myKey');
```

## Clear the storage:

```typescript
await myStorage.clear();
```

## Storage format

Each storage is a SQLite database named `storage.sqlite`, created in its own directory:

- the NodeStorageManager database is in `dir` (default `node_storage` in the current working directory);
- each NodeStorage database is in `dir/.<storageName>`.

The databases use the WAL journal with synchronous `NORMAL`, the recommended settings for performance: a power loss can lose the last writes but never corrupts the database. `keys()`, `values()` and `data()` return the items in insertion order.

### Migration from node-persist

When a database is created, the files stored by `node-persist` (previous versions of this package) in the same directory are imported automatically. The `node-persist` files are left in place, so you can downgrade if needed, and they are not imported again.

### Options

The constructor accepts the same options of `node-persist`:

- `dir`, `logging`, `ttl`, `expiredInterval`, `stringify`, `parse` and `forgiveParseErrors` are supported;
- `writeQueue`, `writeQueueIntervalMs`, `writeQueueWriteOnlyLast` and `encoding` are accepted and ignored: SQLite writes are immediate and always utf8.

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

# Acknowledgments

Thanks to node-persist for providing the storage mechanism of the previous versions.

## Development guide

Refer to the Matterbridge [Development guide](https://matterbridge.io/README-DEV.html) for other guidelines.

## Repository toolchain

See [TOOLCHAIN.md](./TOOLCHAIN.md) for compilers, linting, formatting, testing, and editor support.

## Shared agent instructions

See [SHARED-AGENTS.md](./SHARED-AGENTS.md) for shared guidance, rules, skills, and configuration for coding agents.

See [.agents/README.md](./.agents/README.md) for the shared instructions layout and versioning.

## Shared dev container support

See [.devcontainer/README.md](./.devcontainer/README.md) for the shared development container setup and usage.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Style guide

See [STYLEGUIDE.md](./STYLEGUIDE.md) for code style, naming, documentation, and testing conventions.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for release history and notable changes.

## Issues and feature requests

Report bugs and suggest improvements on [GitHub Issues](https://github.com/Luligu/node-persist-manager/issues).

## License

Licensed under the [Apache License 2.0](./LICENSE).

## Support the project

If you find this project useful, please consider giving it a star on [GitHub](https://github.com/Luligu/node-persist-manager) and sponsoring it. Your support helps maintain and improve the project.

[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/yellow_img.png)](https://www.buymeacoffee.com/luligugithub)
