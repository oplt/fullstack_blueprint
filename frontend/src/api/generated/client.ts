
/** GENERATED FILE. Do not edit manually. */
import { apiFetch } from "../client";
import type { ApiPaths } from "./types";

export type GeneratedPath = keyof ApiPaths;

export function generatedRequest<TResponse = unknown>(path: GeneratedPath, options?: RequestInit): Promise<TResponse> {
  const normalizedPath = String(path).replace(new RegExp("^/api/v1"), "");
  return apiFetch<TResponse>(normalizedPath, options);
}
