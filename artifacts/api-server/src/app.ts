import express, {
  type ErrorRequestHandler,
  type Express,
  type RequestHandler,
} from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import universalLinksRouter from "./routes/universal-links";
import publicPagesRouter from "./routes/public-pages";
import { logger } from "./lib/logger";
import { isCorsOriginAllowed } from "./lib/cors-policy";

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
const rejectDisallowedBrowserOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  if (!isCorsOriginAllowed(origin)) {
    req.log.warn({ origin }, "Rejected browser request from disallowed origin");
    res.status(403).json({ message: "Origin is not allowed." });
    return;
  }
  next();
};

app.use(rejectDisallowedBrowserOrigin);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, isCorsOriginAllowed(origin));
    },
  }),
);
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true }));

// Universal / App Links verification and invite fallback — must be at root
// (not under /api) so the OS can reach /.well-known/* without a redirect.
app.use(universalLinksRouter);
// The API artifact owns /api in production. Mounting the public pages below a
// legal namespace avoids shadowing the API's existing /api liveness response.
app.use("/api/legal", publicPagesRouter);

app.use("/api", router);

const handleUnhandledRequestError: ErrorRequestHandler = (
  err,
  req,
  res,
  next,
) => {
  req.log.error({ err }, "Unhandled request error");
  if (res.headersSent) {
    next(err);
    return;
  }
  res.status(500).json({ message: "An unexpected server error occurred." });
};

app.use(handleUnhandledRequestError);

export default app;
