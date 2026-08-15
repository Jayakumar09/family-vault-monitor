import {
  test,
  expect,
} from '@playwright/test';

import * as fs from 'fs/promises';
import * as path from 'path';

type HealthStatus =
  | 'PASS'
  | 'FAIL';

type MonitorHealthEntry = {
  timestamp: string;
  vaultDocumentCount: number;
  trackedDocuments: number;
  stateConsistency: HealthStatus;
  auditConsistency: HealthStatus;
  problemStates: HealthStatus;
  vaultConsistency: HealthStatus;
  overallHealth: HealthStatus;
};

test(
  'Inspect Family Vault monitor health history',
  async () => {
    const rootDirectory =
      process.cwd();

    const healthFile =
      path.join(
        rootDirectory,
        'UploadStatus',
        'monitor-health.jsonl',
      );

    console.log(
      '========================================',
    );

    console.log(
      'FAMILY VAULT MONITOR HEALTH HISTORY',
    );

    console.log(
      '========================================',
    );

    console.log(
      `Health file: ${healthFile}`,
    );

    console.log(
      '----------------------------------------',
    );

    // -----------------------------------------
    // Verify health history file exists
    // -----------------------------------------

    await expect(
      fs
        .access(
          healthFile,
        )
        .then(
          () => true,
        )
        .catch(
          () => false,
        ),
    ).resolves.toBe(true);

    // -----------------------------------------
    // Read health history
    // -----------------------------------------

    const rawHealth =
      await fs.readFile(
        healthFile,
        'utf8',
      );

    const healthEntries:
      MonitorHealthEntry[] =
      rawHealth
        .split(/\r?\n/)
        .map(
          (line) =>
            line.trim(),
        )
        .filter(
          (line) =>
            line.length > 0,
        )
        .map(
          (line) =>
            JSON.parse(
              line,
            ) as MonitorHealthEntry,
        );

    expect(
      healthEntries.length,
    ).toBeGreaterThan(0);

    console.log(
      `Health records: ${healthEntries.length}`,
    );

    // -----------------------------------------
    // Latest health record
    // -----------------------------------------

    const latestHealth =
      healthEntries[
        healthEntries.length - 1
      ];

    console.log(
      '----------------------------------------',
    );

    console.log(
      'LATEST HEALTH',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `Time: ${latestHealth.timestamp}`,
    );

    console.log(
      `Vault documents: ${latestHealth.vaultDocumentCount}`,
    );

    console.log(
      `Tracked documents: ${latestHealth.trackedDocuments}`,
    );

    console.log(
      `State consistency: ${latestHealth.stateConsistency}`,
    );

    console.log(
      `Audit consistency: ${latestHealth.auditConsistency}`,
    );

    console.log(
      `Problem states: ${latestHealth.problemStates}`,
    );

    console.log(
      `Vault consistency: ${latestHealth.vaultConsistency}`,
    );

    console.log(
      `Overall health: ${latestHealth.overallHealth}`,
    );

    // -----------------------------------------
    // Validate latest record
    // -----------------------------------------

    expect(
      latestHealth.timestamp,
    ).toBeTruthy();

    expect(
      latestHealth.vaultDocumentCount,
    ).toBeGreaterThanOrEqual(0);

    expect(
      latestHealth.trackedDocuments,
    ).toBeGreaterThanOrEqual(0);

    expect([
      'PASS',
      'FAIL',
    ]).toContain(
      latestHealth.stateConsistency,
    );

    expect([
      'PASS',
      'FAIL',
    ]).toContain(
      latestHealth.auditConsistency,
    );

    expect([
      'PASS',
      'FAIL',
    ]).toContain(
      latestHealth.problemStates,
    );

    expect([
      'PASS',
      'FAIL',
    ]).toContain(
      latestHealth.vaultConsistency,
    );

    expect([
      'PASS',
      'FAIL',
    ]).toContain(
      latestHealth.overallHealth,
    );

    // -----------------------------------------
    // Validate health history consistency
    // -----------------------------------------

    console.log(
      '----------------------------------------',
    );

    console.log(
      'HEALTH HISTORY CONSISTENCY',
    );

    console.log(
      '----------------------------------------',
    );

    let historyConsistencyFailures =
      0;

    for (
      let index = 0;
      index < healthEntries.length;
      index++
    ) {
      const entry =
        healthEntries[index];

      const componentHealthPassed =
        entry.stateConsistency ===
          'PASS' &&
        entry.auditConsistency ===
          'PASS' &&
        entry.problemStates ===
          'PASS' &&
        entry.vaultConsistency ===
          'PASS';

      const expectedOverallHealth:
        HealthStatus =
        componentHealthPassed
          ? 'PASS'
          : 'FAIL';

      const recordIsConsistent =
        entry.overallHealth ===
        expectedOverallHealth;

      if (!recordIsConsistent) {
        historyConsistencyFailures++;

        console.error(
          `Health record #${
            index + 1
          } is inconsistent`,
        );

        console.error(
          `Timestamp: ${
            entry.timestamp
          }`,
        );

        console.error(
          `Expected overall health: ${
            expectedOverallHealth
          }`,
        );

        console.error(
          `Actual overall health: ${
            entry.overallHealth
          }`,
        );
      }
    }

    expect(
      historyConsistencyFailures,
      'One or more monitor health history records have an inconsistent overallHealth value',
    ).toBe(0);

    console.log(
      `Records checked: ${
        healthEntries.length
      }`,
    );

    console.log(
      'Overall health consistency: PASS',
    );

    // -----------------------------------------
    // History summary
    // -----------------------------------------

    const passCount =
      healthEntries.filter(
        (entry) =>
          entry.overallHealth ===
          'PASS',
      ).length;

    const failCount =
      healthEntries.filter(
        (entry) =>
          entry.overallHealth ===
          'FAIL',
      ).length;

    console.log(
      '----------------------------------------',
    );

    console.log(
      'HISTORY SUMMARY',
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      `PASS: ${passCount}`,
    );

    console.log(
      `FAIL: ${failCount}`,
    );

    console.log(
      '----------------------------------------',
    );

    console.log(
      'HEALTH HISTORY INSPECTION COMPLETE',
    );

    console.log(
      '========================================',
    );
  },
);