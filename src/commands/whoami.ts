import * as path from "path";
import * as os from "os";
import { readKeys } from "../crypto/keyfile";
import { readConfig, configExists } from "../config/project";

export interface WhoamiResult {
  username: string;
  envaultDir: string;
  projectName: string | null;
  environments: string[];
  keyCount: number;
}

export async function whoami(cwd: string = process.cwd()): Promise<WhoamiResult> {
  const username = os.userInfo().username;
  const envaultDir = path.join(os.homedir(), ".envault");

  let projectName: string | null = null;
  let environments: string[] = [];

  if (await configExists(cwd)) {
    const config = await readConfig(cwd);
    projectName = config.project;
    environments = config.environments ?? [];
  }

  let keyCount = 0;
  try {
    const keys = await readKeys();
    keyCount = Object.keys(keys).length;
  } catch {
    keyCount = 0;
  }

  return {
    username,
    envaultDir,
    projectName,
    environments,
    keyCount,
  };
}
