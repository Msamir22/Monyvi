import fs from "node:fs";
import path from "node:path";

function readCiWorkflow(): string {
  return fs.readFileSync(
    path.resolve(__dirname, "../../../..", ".github/workflows/ci.yml"),
    "utf8"
  );
}

function getAndroidE2eEmulatorRunnerBlock(workflow: string): string {
  const marker = "uses: reactivecircus/android-emulator-runner@v2";
  const markerIndex = workflow.indexOf(marker);

  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const remainingWorkflow = workflow.slice(markerIndex);
  const nextStepIndex = remainingWorkflow.indexOf("\n      - name:", 1);

  return nextStepIndex === -1
    ? remainingWorkflow
    : remainingWorkflow.slice(0, nextStepIndex);
}

describe("GitHub Actions Android E2E workflow", () => {
  it("uses an explicit emulator data partition that fits hosted runner disk space", () => {
    const workflow = readCiWorkflow();
    const emulatorRunnerBlock = getAndroidE2eEmulatorRunnerBlock(workflow);

    expect(emulatorRunnerBlock).toContain("disk-size: 4096M");
  });
});
