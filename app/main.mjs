import { URL } from "node:url";
import { serveSiteFiles, serveImages, loggerRout } from "#controllers";
import { LOCAL_ADDRESS } from "#config";

export default async function app(req, res) {
  const url = new URL(req.url, `http://${LOCAL_ADDRESS}/`);

  if (url.pathname.startsWith("/api/v1/hold/i"))
    await serveImages(url.searchParams.get("img"), res);
  else if (url.pathname.startsWith("/api/v1/log"))
    await loggerRout(req, res, url);
  else await serveSiteFiles(req, res);
}
