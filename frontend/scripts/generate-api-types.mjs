import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "..");
const sourcePath = process.argv[2] ?? path.join(frontendDir, "src/lib/generated/openapi.json");
const outputPath = process.argv[3] ?? path.join(frontendDir, "src/lib/generated/types.ts");
const spec = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

function quote(value) {
  return JSON.stringify(value);
}

function typeForSchema(schema, required = false) {
  if (!schema || typeof schema !== "object") return "unknown";
  if (schema.$ref) return schema.$ref.replace(/^#\/components\/schemas\//, "");
  if (schema.oneOf) return schema.oneOf.map((item) => typeForSchema(item)).join(" | ");
  if (schema.anyOf) return schema.anyOf.map((item) => typeForSchema(item)).join(" | ");
  if (schema.allOf) return schema.allOf.map((item) => typeForSchema(item)).join(" & ");
  if (schema.enum) return schema.enum.map((item) => JSON.stringify(item)).join(" | ");
  if (schema.type === "array") return `Array<${typeForSchema(schema.items)}>`;
  if (schema.type === "object" || schema.properties || schema.additionalProperties) {
    if (schema.properties) {
      const fields = Object.entries(schema.properties).map(([name, value]) => {
        const isRequired = required || (schema.required ?? []).includes(name);
        return `    ${quote(name)}${isRequired ? "" : "?"}: ${typeForSchema(value)};`;
      });
      const additional = schema.additionalProperties && schema.additionalProperties !== true
        ? `\n    [key: string]: ${typeForSchema(schema.additionalProperties)};`
        : "";
      return `{\n${fields.join("\n")}${additional}\n  }`;
    }
    return schema.additionalProperties && schema.additionalProperties !== true
      ? `Record<string, ${typeForSchema(schema.additionalProperties)}>`
      : "Record<string, unknown>";
  }
  if (schema.type === "integer" || schema.type === "number") return "number";
  if (schema.type === "boolean") return "boolean";
  if (schema.type === "string") return schema.format === "binary" ? "Blob" : "string";
  if (schema.type === "null") return "null";
  return "unknown";
}

const schemas = Object.entries(spec.components?.schemas ?? {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, schema]) => `export type ${name} = ${typeForSchema(schema)};`)
  .join("\n\n");

const paths = Object.entries(spec.paths ?? {})
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([route, operations]) => {
    const methods = Object.entries(operations)
      .filter(([method]) => ["get", "post", "put", "patch", "delete", "options", "head"].includes(method))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([method, operation]) => `    ${method}: ${JSON.stringify({ operationId: operation.operationId ?? null, tags: operation.tags ?? [] })};`)
      .join("\n");
    return `  ${quote(route)}: {\n${methods}\n  };`;
  })
  .join("\n");

const output = `
/**
 * GENERATED FILE. Do not edit manually.
 * Source: backend/scripts/export_openapi.py (all optional routers enabled).
 */

export type ApiPaths = {
${paths}
};

${schemas}
`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, output, "utf8");
