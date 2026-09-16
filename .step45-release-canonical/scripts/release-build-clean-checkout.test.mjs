import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  appendFile,
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import test from "node:test";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.resolve(scriptsDir, "..");

async function gitStatus(directory) {
  const { stdout } = await execFileAsync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: directory },
  );
  return stdout;
}

async function runProductionBuild(worktree) {
  try {
    const { stdout, stderr } = await execFileAsync(
      "node",
      [path.join(worktree, "artifacts/api-server/build.mjs")],
      {
        cwd: worktree,
        env: {
          ...process.env,
          NODE_ENV: "production",
          RELEASE_SENSITIVE_ACTIVATION_REQUESTED: "false",
          RELEASE_SENSITIVE_ACTIVATION_COMMIT: "",
        },
        maxBuffer: 4 * 1024 * 1024,
      },
    );
    return { status: 0, output: `${stdout}${stderr}` };
  } catch (error) {
    return {
      status: typeof error.code === "number" ? error.code : 1,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    };
  }
}

async function linkBuildDependencies(worktree) {
  await symlink(
    path.join(workspaceDir, "node_modules"),
    path.join(worktree, "node_modules"),
    "dir",
  );

  // Keep workspace package links pointing at the worktree while reusing the
  // installed dependency trees from the developer checkout.
  for (const packageDirectory of [
    "artifacts/api-server",
    "lib/api-zod",
    "lib/db",
    "lib/integrations-openai-ai-server",
  ]) {
    await symlink(
      path.join(workspaceDir, packageDirectory, "node_modules"),
      path.join(worktree, packageDirectory, "node_modules"),
      "dir",
    );
  }
}

test("production API builds allow disposable mockup output but reject source changes", async () => {
  const initialCheckoutStatus = await gitStatus(workspaceDir);
  const temporaryRoot = await mkdtemp(
    path.join(os.tmpdir(), "calora-release-build-"),
  );
  const worktree = path.join(temporaryRoot, "worktree");
  let worktreeAdded = false;

  try {
    await execFileAsync(
      "git",
      ["worktree", "add", "--detach", worktree, "HEAD"],
      {
        cwd: workspaceDir,
      },
    );
    worktreeAdded = true;
    await linkBuildDependencies(worktree);

    const generatedDirectory = path.join(
      worktree,
      "artifacts/mockup-sandbox/src/.generated",
    );
    const generatedOutput = path.join(
      generatedDirectory,
      "mockup-components.ts",
    );
    await mkdir(generatedDirectory, { recursive: true });
    await writeFile(
      generatedOutput,
      "export const generatedMockupComponents = {};\n",
      "utf8",
    );

    assert.equal(
      await gitStatus(worktree),
      "",
      "disposable mockup output should be ignored by the release checkout check",
    );

    const cleanBuild = await runProductionBuild(worktree);
    assert.equal(cleanBuild.status, 0, cleanBuild.output);
    assert.match(cleanBuild.output, /\[release-source\]/);
    const builtBundle = path.join(
      worktree,
      "artifacts/api-server/dist/index.mjs",
    );
    await assert.doesNotReject(() => access(builtBundle));

    await appendFile(
      path.join(worktree, "artifacts/mockup-sandbox/src/App.tsx"),
      "\n// unrelated disposable source change\n",
      "utf8",
    );
    const dirtyStatus = await gitStatus(worktree);
    assert.match(dirtyStatus, / M artifacts\/mockup-sandbox\/src\/App\.tsx\n/);
    assert.doesNotMatch(dirtyStatus, /\.generated\/mockup-components\.ts/);

    const dirtyBuild = await runProductionBuild(worktree);
    assert.notEqual(dirtyBuild.status, 0);
    assert.match(
      dirtyBuild.output,
      /Release attestation requires a clean production Git checkout/,
    );
    assert.doesNotMatch(dirtyBuild.output, /\[release-source\]/);
    assert.doesNotMatch(dirtyBuild.output, /⚡ Done/);
  } finally {
    if (worktreeAdded) {
      await execFileAsync("git", ["worktree", "remove", "--force", worktree], {
        cwd: workspaceDir,
      });
    }
    await rm(temporaryRoot, { recursive: true, force: true });
    assert.equal(
      await gitStatus(workspaceDir),
      initialCheckoutStatus,
      "the release regression test must not change the developer checkout",
    );
  }
});
