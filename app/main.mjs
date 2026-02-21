import { URL } from "node:url";
import {
  serveSiteFiles,
  handleServeImages,
  handlePortraits,
  loggerRout,
  aiRout,
} from "#controllers";
import { LOCAL_ADDRESS, API_ROUTE } from "#config";
import nagaraRout from "../routers/nagara.mjs";

export default async function app(req, res) {
  const url = new URL(req.url, `http://${LOCAL_ADDRESS}/`);

  if (url.pathname.startsWith(`${API_ROUTE}/hold/i`))
    await handleServeImages(url.searchParams.get("img"), res);
  else if (url.pathname.startsWith("/uploads/portraits"))
    await handlePortraits(url.pathname, res);
  else if (url.pathname.startsWith(`${API_ROUTE}/log`))
    await loggerRout(req, res, url);
  else if (url.pathname.startsWith(`${API_ROUTE}/robot`))
    await aiRout(req, res, url);
  // else if (url.pathname.startsWith(`${API_ROUTE}/nagara`))
  //   await nagaraRout(req, res, url);
  else if (await nagaraRout(req, res, url)) return;
  else await serveSiteFiles(req, res);
}
