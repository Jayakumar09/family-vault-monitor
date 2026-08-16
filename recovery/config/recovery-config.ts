import path from 'path';

const recoveryFileName =
  process.env.RECOVERY_FILE?.trim();

if (!recoveryFileName) {
  throw new Error(
    'RECOVERY_FILE is required. Example: $env:RECOVERY_FILE="FamilyVault_Monitor_Test_01.txt"',
  );
}

if (
  recoveryFileName.includes('/') ||
  recoveryFileName.includes('\\') ||
  recoveryFileName === '.' ||
  recoveryFileName === '..'
) {
  throw new Error(
    `Invalid RECOVERY_FILE value: "${recoveryFileName}". Provide a filename only.`,
  );
}

export const recoveryConfig = {
  fileName: recoveryFileName,

  filePath: path.resolve(
    process.cwd(),
    'ToUpload',
    recoveryFileName,
  ),

  stateFilePath: path.resolve(
    process.cwd(),
    'UploadStatus',
    'toupload-state.json',
  ),
};