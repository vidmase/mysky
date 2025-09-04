/*
 Simple API Market MCP client for AeroDataBox
 Requires: Node.js 18+ (global fetch)

 Env vars:
   AERODATABOX_MARKET_KEY - your API Market key (required)
   MCP_TOOL_NAME          - optional tool name to call
   MCP_TOOL_ARGS          - optional JSON string with tool arguments, e.g. '{"param":"value"}'
*/

const ENDPOINT = 'https://prod.api.market/api/mcp/aedbx/aerodatabox'

function requireEnv(name) {
  const v = process.env[name]
  if (!v) {
    console.error(`Missing required env var: ${name}`)
    process.exit(1)
  }
  return v
}

async function rpc(id, method, params = {}) {
  const key = requireEnv('AERODATABOX_MARKET_KEY')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-market-key': key,
      // Some deployments accept this alias header as well
      'x-magicapi-key': key,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch (e) {
    console.error('Non-JSON response:', text)
    throw e
  }
  if (!res.ok || json.error) {
    console.error(`RPC error for ${method}:`, json.error || text)
    process.exit(2)
  }
  return json
}

async function main() {
  console.log('1) initialize')
  const init = await rpc(1, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: { tools: {} },
    clientInfo: { name: 'node', version: process.version }
  })
  console.log(JSON.stringify(init, null, 2))

  console.log('\n2) tools/list')
  const listed = await rpc(2, 'tools/list', {})
  console.log(JSON.stringify(listed, null, 2))

  const toolName = process.env.MCP_TOOL_NAME
  if (toolName) {
    let args = {}
    if (process.env.MCP_TOOL_ARGS) {
      try { args = JSON.parse(process.env.MCP_TOOL_ARGS) } catch (e) {
        console.error('Invalid MCP_TOOL_ARGS JSON:', e.message)
        process.exit(3)
      }
    }
    console.log(`\n3) tools/call -> ${toolName}`)
    const called = await rpc(3, 'tools/call', { name: toolName, arguments: args })
    console.log(JSON.stringify(called, null, 2))
  } else {
    console.log('\n3) tools/call skipped (set MCP_TOOL_NAME to call a tool)')
  }
}

main().catch(err => {
  console.error(err)
  process.exit(4)
})
