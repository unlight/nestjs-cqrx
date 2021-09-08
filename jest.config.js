module.exports = {
    testEnvironment: 'node',
    setupFiles: [`${__dirname}/jest.setup.ts`],
    transform: {
        '^.+\\.(t|j)sx?$': 'ts-jest',
    },
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coverageReporters: [
        // "lcov",
        'text',
    ],
    collectCoverageFrom: ['**/*.ts', '!**/*.spec.ts'],
    testMatch: ['**/*.spec.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    modulePathIgnorePatterns: ['dist'],
    moduleNameMapper: {
        '^nestjs-cqrx$': `${__dirname}/src/index.ts`,
        '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
        '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/test/__mocks__/fileMock.js',
    },
    globals: {
        'ts-jest': {
            isolatedModules: true,
        },
    },
};
