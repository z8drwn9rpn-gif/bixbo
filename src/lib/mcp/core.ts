import { z, type ZodRawShape } from "zod";

export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

export type ToolContext = {
  isAuthenticated: () => boolean;
  getUserId: () => string | undefined;
  getToken: () => string | undefined;
};

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  idempotentHint?: boolean;
  destructiveHint?: boolean;
  openWorldHint?: boolean;
};

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export type DefinedTool = {
  name: string;
  title: string;
  description: string;
  annotations?: ToolAnnotations;
  inputJsonSchema: Record<string, unknown>;
  invoke: (input: unknown, ctx: ToolContext) => Promise<ToolResult>;
};

export function defineTool<TShape extends ZodRawShape>(config: {
  name: string;
  title: string;
  description: string;
  inputSchema: TShape;
  annotations?: ToolAnnotations;
  handler: (input: z.infer<z.ZodObject<TShape>>, ctx: ToolContext) => Promise<ToolResult> | ToolResult;
}): DefinedTool {
  const schema = z.object(config.inputSchema);
  return {
    name: config.name,
    title: config.title,
    description: config.description,
    annotations: config.annotations,
    inputJsonSchema: z.toJSONSchema(schema) as Record<string, unknown>,
    invoke: async (input, ctx) => config.handler(schema.parse(input ?? {}), ctx),
  };
}

export type McpServer = {
  name: string;
  title: string;
  version: string;
  instructions: string;
  tools: DefinedTool[];
  toolMap: Map<string, DefinedTool>;
};

export function defineMcp(config: Omit<McpServer, "toolMap">): McpServer {
  return { ...config, toolMap: new Map(config.tools.map((tool) => [tool.name, tool])) };
}

export function toolDescriptors(server: McpServer) {
  return server.tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputJsonSchema,
    annotations: tool.annotations,
  }));
}
