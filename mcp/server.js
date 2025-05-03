const WebSocket = require("ws");
const { Pool } = require("pg");

// Replace '[YOUR-PASSWORD]' with your real password!
const pool = new Pool({
  connectionString: "postgresql://postgres.kayyrfpijdeqfrmylecj:!Somnitel1255@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
});

const server = new WebSocket.Server({ port: 8080 });
console.log("MCP Server running on ws://localhost:8080");

server.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("message", async (message) => {
    const data = JSON.parse(message);
    console.log("Received:", data);

    if (data.type === "run-tool" && data.name === "getTime") {
      try {
        const res = await pool.query("SELECT NOW()");
        const currentTime = res.rows[0].now;

        const response = {
          type: "tool-result",
          requestId: data.requestId,
          result: {
            output: `Database Time: ${currentTime}`
          }
        };

        socket.send(JSON.stringify(response));
      } catch (error) {
        socket.send(JSON.stringify({
          type: "tool-result",
          requestId: data.requestId,
          result: {
            output: `Error: ${error.message}`
          }
        }));
      }
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
  });
});
