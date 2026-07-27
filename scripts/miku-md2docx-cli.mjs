#!/usr/bin/env node
import { isCliUsageError, main } from "./lib/cli-support.mjs";

try {
  main(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = isCliUsageError(error) ? 2 : 1;
}
