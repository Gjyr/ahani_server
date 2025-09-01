import { URL } from "node:url";
import { serveSiteFiles, serveImages, logEvent } from "#controllers";
import { LOCAL_ADDRESS } from "#config";

export default async function app(req, res) {
  const url = new URL(req.url, `http://${LOCAL_ADDRESS}/`);

  if (url.pathname.startsWith("/hold/v1/i"))
    await serveImages(url.searchParams.get("img"), res);
  if (url.pathname.startsWith("/log/v1")) await logEvent(req, res);
  else await serveSiteFiles(req, res);
}
