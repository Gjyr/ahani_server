import { URL } from "node:url";
import { serveSiteFiles, serveImages, loggerRout, aiRout } from "#controllers";
import { LOCAL_ADDRESS, API_ROUTE } from "#config";

export default async function app(req, res) {
  const url = new URL(req.url, `http://${LOCAL_ADDRESS}/`);

  if (url.pathname.startsWith(`${API_ROUTE}/hold/i`))
    await serveImages(url.searchParams.get("img"), res);
  else if (url.pathname.startsWith(`${API_ROUTE}/log`))
    await loggerRout(req, res, url);
  else if (url.pathname.startsWith(`${API_ROUTE}/robot`))
    await aiRout(req, res, url);
  else await serveSiteFiles(req, res);
}
