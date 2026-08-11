import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import universalLinksRouter from "./routes/universal-links";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust one proxy hop (the Replit edge / ingress) so that req.ip resolves to
// the real client address from the X-Forwarded-For chain rather than the proxy
// socket address.  Setting this to 1 prevents clients from injecting arbitrary
// X-Forwarded-For headers — Express peels exactly one hop from the right of
// the header, which is the value written by the trusted infrastructure.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

// Universal / App Links verification and invite fallback — must be at root
// (not under /api) so the OS can reach /.well-known/* without a redirect.
app.use(universalLinksRouter);

app.use("/api", router);

export default app;
