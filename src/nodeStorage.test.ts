/* eslint-disable @typescript-eslint/no-unused-vars */
import { NodeStorageManager } from './nodeStorage';
import NodePersist, { LocalStorage, InitOptions } from 'node-persist';
import path from 'path';

jest.mock('node-persist', () => ({
	create: jest.fn().mockReturnThis(),
	initSync: jest.fn().mockImplementation((options) => options), 
}));

jest.mock('path', () => ({
	...jest.requireActual('path'),
	join: jest.fn().mockImplementation((...args) => args.join('/')),
}));

jest.mock('fs/promises', () => ({
	rm: jest.fn().mockResolvedValue(undefined),
}));

describe('NodeStorageManager', () => {
	const defaultDir = process.cwd() + '/node_storage';

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should create and initialize storage with default options', async () => {
		const storageManager = new NodeStorageManager();
		expect(NodePersist.create).toHaveBeenCalledWith({
			dir: defaultDir,
			logging: false,
		});
	});

	it('should merge custom init options with defaults', async () => {
		const customOptions = { dir: 'custom_dir', logging: true };
		const expectedOptions = {
			dir: 'custom_dir',
			logging: true,
		};

		const storageManager = new NodeStorageManager(customOptions);
		expect(NodePersist.create).toHaveBeenCalledWith(expectedOptions);
	});

});
