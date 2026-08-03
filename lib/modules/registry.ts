import type { Module } from "@/lib/modules/types";
import { kegelModule } from "@/lib/modules/kegel";
import { breathingModule } from "@/lib/modules/breathing";

// Every guided module the app knows about. Adding one means adding a
// definition file and listing it here; nothing else in the app changes.
export const MODULES: Module[] = [kegelModule, breathingModule];

export function getModule(key: string): Module | undefined {
  return MODULES.find((m) => m.key === key);
}

export const MODULE_KEYS = MODULES.map((m) => m.key);
