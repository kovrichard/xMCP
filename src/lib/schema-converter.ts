import type { JsonSchema } from "@/types/schema";
import { z } from "zod";

export function convertToZodShape(schema: JsonSchema): z.ZodRawShape {
  if (!schema.properties) {
    return {};
  }

  const shape: z.ZodRawShape = {};
  for (const [key, value] of Object.entries(schema.properties)) {
    let zodType: z.ZodTypeAny;

    switch (value.type) {
      case "string":
        zodType = z.string();
        break;
      case "number":
        zodType = z.number();
        break;
      case "boolean":
        zodType = z.boolean();
        break;
      case "array":
        zodType = z.array(z.any());
        break;
      case "object":
        zodType = value.properties
          ? z.object(convertToZodShape({ type: "object", properties: value.properties }))
          : z.record(z.any());
        break;
      default:
        zodType = z.any();
    }

    // Add description if available
    if (value.description) {
      zodType = zodType.describe(value.description);
    }

    // Make optional if not in required array
    if (!schema.required?.includes(key)) {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }
  return shape;
}
