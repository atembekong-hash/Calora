import { createGatewayApp, configFromEnv } from "./app.js";

const app = createGatewayApp(configFromEnv());
const port = Number(process.env.PORT ?? 8080);

app.listen(port, "0.0.0.0");