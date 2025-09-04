# API Market MCP client for AeroDataBox

This folder contains two ways to talk to API Market's MCP endpoint for AeroDataBox:

- Curl examples (JSON-RPC over HTTP)
- A small Node.js client script

## Prerequisites
- Set your API Market key in env:

Windows PowerShell:
```
$env:AERODATABOX_MARKET_KEY = "<YOUR_KEY>"
```
macOS/Linux:
```
export AERODATABOX_MARKET_KEY="<YOUR_KEY>"
```

## Endpoints
- Base MCP URL: `https://prod.api.market/api/mcp/aedbx/aerodatabox`

## Curl examples

Initialize:
```sh
curl -X POST "https://prod.api.market/api/mcp/aedbx/aerodatabox" \
  -H "Content-Type: application/json" \
  -H "x-api-market-key: $AERODATABOX_MARKET_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {"tools": {}},
      "clientInfo": {"name": "curl", "version": "1.0.0"}
    }
  }'
```

List tools:
```sh
curl -X POST "https://prod.api.market/api/mcp/aedbx/aerodatabox" \
  -H "Content-Type: application/json" \
  -H "x-api-market-key: $AERODATABOX_MARKET_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

Call a tool (example name, replace with a real tool name from tools/list):
```sh
curl -X POST "https://prod.api.market/api/mcp/aedbx/aerodatabox" \
  -H "Content-Type: application/json" \
  -H "x-api-market-key: $AERODATABOX_MARKET_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "example_tool",
      "arguments": {"param": "value"}
    }
  }'
```

## Node script
Run:
```
node api-market-mcp-client.js
```
It will:
- initialize
- list tools
- attempt a sample tools/call if you provide a tool name via env var `MCP_TOOL_NAME` and optional JSON args via `MCP_TOOL_ARGS`.
