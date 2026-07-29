import { TOOLS } from './tools-defs'

const TOOLS_BY_NAME = new Map(TOOLS.map(t => [t.function.name, t]))

export function getToolsForAgent(toolNames: string[]) {
  return toolNames.map(name => TOOLS_BY_NAME.get(name)).filter(Boolean) as typeof TOOLS
}
