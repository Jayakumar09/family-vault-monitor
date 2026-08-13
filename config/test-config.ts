export const testConfig = {
  baseUrl: 'https://safe-family-files.lovable.app',
  loginUrl: 'https://safe-family-files.lovable.app/login',

  testEmail: process.env.FAMILY_VAULT_TEST_EMAIL || '',
  testPassword: process.env.FAMILY_VAULT_TEST_PASSWORD || '',

  timeouts: {
    navigation: 30000,
    login: 15000,
  },
};