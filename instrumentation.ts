import type { Instrumentation } from "next";
import { logServerError } from "./lib/logging";

export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  logServerError(error, {
    event: "server.unhandled_error",
    route: context.routePath,
    method: request.method,
  });
};
