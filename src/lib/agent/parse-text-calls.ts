export function parseTextToolCalls(text: string): Array<{ name: string; args: Record<string, unknown> }> {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = []

  // Format 1: <tool_call>...</tool_call> blocks with <arg_key>/<arg_value> pairs
  const toolCallRegex = /<tool_call>\s*([\w_]+)\s*<\/tool_call>([\s\S]*?)(?=<tool_call>|$)/g
  let m: RegExpExecArray | null
  while ((m = toolCallRegex.exec(text)) !== null) {
    const name = m[1].trim()
    const body = m[2]
    const args: Record<string, unknown> = {}
    const argRegex = /<arg_key>\s*([^<]+)\s*<\/arg_key>\s*<arg_value>\s*([\s\S]*?)\s*<\/arg_value>/g
    let am: RegExpExecArray | null
    while ((am = argRegex.exec(body)) !== null) {
      const key = am[1].trim()
      let val: unknown = am[2].trim()
      try { val = JSON.parse(val as string) } catch { /* keep string */ }
      args[key] = val
    }
    if (name) calls.push({ name, args })
  }

  if (calls.length > 0) return calls

  // Format 2/3: fenced JSON
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)```/g
  while ((m = fenceRegex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      if (Array.isArray(parsed)) {
        for (const p of parsed) {
          if (p.name && p.arguments) calls.push({ name: p.name, args: p.arguments })
        }
      } else if (parsed.name && parsed.arguments) {
        calls.push({ name: parsed.name, args: parsed.arguments })
      } else if (parsed.function && parsed.function.name) {
        calls.push({ name: parsed.function.name, args: parsed.function.arguments || {} })
      }
    } catch { /* not JSON */ }
  }

  return calls
}
