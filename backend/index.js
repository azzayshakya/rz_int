const http = require("http");
const app = require("./app");
require("dotenv").config();

const PORT = process.env.PORT || 5000;

// Create server
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
