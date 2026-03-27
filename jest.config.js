module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { target: 'es2024' } }],
    '^.+\\.js$': ['ts-jest', { tsconfig: { target: 'es2024', allowJs: true }, diagnostics: false }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@octokit|universal-user-agent|before-after-hook|until-async)/)'
  ]
}