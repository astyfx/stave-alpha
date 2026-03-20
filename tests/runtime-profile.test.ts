import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  configurePersistenceUserDataPath,
  resolveDevelopmentUserDataPath,
  resolvePersistenceRuntimeProfile,
} from "../electron/main/runtime-profile";

function createTempRoot() {
  return path.join(tmpdir(), `stave-runtime-profile-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

describe("runtime profile persistence paths", () => {
  const cleanupRoots = new Set<string>();

  afterEach(() => {
    for (const root of cleanupRoots) {
      rmSync(root, { recursive: true, force: true });
    }
    cleanupRoots.clear();
  });

  test("defaults to development when Electron is not packaged", () => {
    expect(resolvePersistenceRuntimeProfile({ isPackaged: false })).toBe("development");
    expect(resolvePersistenceRuntimeProfile({ isPackaged: true })).toBe("production");
    expect(resolvePersistenceRuntimeProfile({ isPackaged: false, override: "production" })).toBe("production");
  });

  test("configures dev builds to use the dev userData path and built local runs to use production", () => {
    const root = createTempRoot();
    cleanupRoots.add(root);

    const productionUserDataPath = path.join(root, "Stave");
    let selectedUserDataPath = productionUserDataPath;

    const app = {
      isPackaged: false,
      getPath(name: "userData") {
        if (name !== "userData") {
          throw new Error(`Unexpected path request: ${name}`);
        }
        return productionUserDataPath;
      },
      setPath(name: "userData", value: string) {
        if (name !== "userData") {
          throw new Error(`Unexpected setPath request: ${name}`);
        }
        selectedUserDataPath = value;
      },
    };

    const devResult = configurePersistenceUserDataPath(app, {});
    expect(devResult.profile).toBe("development");
    expect(devResult.userDataPath).toBe(resolveDevelopmentUserDataPath({ productionUserDataPath }));
    expect(selectedUserDataPath).toBe(devResult.userDataPath);

    selectedUserDataPath = productionUserDataPath;
    const builtLocalResult = configurePersistenceUserDataPath(app, {
      STAVE_RUNTIME_PROFILE: "production",
    });
    expect(builtLocalResult.profile).toBe("production");
    expect(builtLocalResult.userDataPath).toBe(productionUserDataPath);
    expect(selectedUserDataPath).toBe(productionUserDataPath);
  });
});
