import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert";

const MAX_BUSY_TRIES = 3;

export const rimraf = async (p: string): Promise<void> => {
  assert(p, "rimraf: missing path");
  assert.strictEqual(typeof p, "string", "rimraf: path should be a string");

  try {
    await rimraf_(p);
  } catch (_error) {
    const error = _error as NodeJS.ErrnoException;
    if (error.code === "EBUSY" || error.code === "ENOTEMPTY" || error.code === "ENOENT") {
      return;
    } else if (error.code === "EPERM") {
      for (let busyTries = 0; busyTries < MAX_BUSY_TRIES; busyTries++) {
        try {
          await new Promise<void>((resolve, reject) => {
            setTimeout(() => {
              try {
                rimraf_(p);
                resolve();
              } catch (error) {
                reject(error);
              }
            }, busyTries * 100);
          });
        } catch (_error) {
          const error = _error as NodeJS.ErrnoException;
          if (error.code === "ENOENT") {
            break;
          }
        }
      }
    }
  }
};

const rimraf_ = async (filePath: string): Promise<void> => {
  try {
    const stats = await fs.lstat(filePath);

    if (stats.isDirectory()) {
      return rmdir(filePath, null);
    }
  } catch (_error) {
    const error = _error as NodeJS.ErrnoException;

    if (error.code === "ENOENT") {
      return;
    } else {
      try {
        await fs.unlink(filePath);
      } catch (_error) {
        const error = _error as NodeJS.ErrnoException;
        if (error.code === "ENOENT") {
          return;
        } else if (error.code === "EPERM") {
          return rmdir(filePath, error);
        } else if (error.code === "EISDIR") {
          return rmdir(filePath, error);
        } else {
          return;
        }
      }
    }
  }
};

const rmdir = async (filePath: string, originalError: NodeJS.ErrnoException | null) => {
  try {
    await fs.rmdir(filePath);
  } catch (_error) {
    const error = _error as NodeJS.ErrnoException;
    if (
      error &&
      (error.code === "ENOTEMPTY" || error.code === "EEXIST" || error.code === "EPERM")
    ) {
      await rmkids(filePath);
    } else if (error && error.code === "ENOTDIR") {
      throw originalError;
    } else {
      throw error;
    }
  }
};

const rmkids = async (filePath: string) => {
  const files = await fs.readdir(filePath);

  if (files.length > 0) {
    await Promise.all(
      files.map((file) => {
        return rimraf(path.join(filePath, file));
      })
    );
  }

  await fs.rmdir(filePath);
};
