import { pinoHttp } from "pino-http";
import { logger } from "../lib/logger.js";

export const loggingMiddleware = pinoHttp({
  logger,
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 500 || err) {
      return "error";
    }
    if (res.statusCode >= 400) {
      return "warn";
    }
    return "info";
  },
  serializers: {
    req(req) {
      return {
        method: req.method,
        url: req.url,
      };
    },
    res(res) {
      return {
        statusCode: res.statusCode,
      };
    },
  },
});
