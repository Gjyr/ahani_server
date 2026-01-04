import { DM_TOKEN } from "#config";

function requireDmToken(req) {
  const providedToken = req.headers["x-dm-token"];
  if (!providedToken || providedToken !== DM_TOKEN) {
    const error = new Error("DM authorization required");
    error.statusCode = 401;
    throw error;
  }
}

export { requireDmToken };
