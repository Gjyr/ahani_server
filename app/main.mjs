import { URL } from "node:url";
import path from "node:path";
import {
  serveSiteFiles,
  serveHoldPage,
  handleServeImages,
  handlePortraits,
  loggerRout,
  aiRout,
} from "#controllers";
import { LOCAL_ADDRESS, API_ROUTE } from "#config";
import nagaraRout from "../routers/nagara.mjs";

// Site lockdown: every request except direct image requests (and the assets
// the hold page itself needs) gets the hold page. Flip to false to reopen.
const ON_HOLD = true;

const IMAGE_EXTENSIONS = new Set([
  "webp",
  "png",
  "svg",
  "ico",
  "gif",
  "jpeg",
  "jpg",
]);
const HOLD_PAGE_ASSETS = ["/src/styles/fonts.css", "/assets/fonts/"];

function isHoldExempt(pathname) {
  const ext = path.extname(pathname).slice(1).toLowerCase();

  return (
    IMAGE_EXTENSIONS.has(ext) ||
    HOLD_PAGE_ASSETS.some((asset) => pathname.startsWith(asset))
  );
}

export default async function app(req, res) {
  const url = new URL(req.url, `http://${LOCAL_ADDRESS}/`);

  if (url.pathname.startsWith(`${API_ROUTE}/hold/i`))
    await handleServeImages(url.searchParams.get("img"), res);
  else if (url.pathname.startsWith("/uploads/portraits"))
    await handlePortraits(url.pathname, res);
  else if (ON_HOLD && !isHoldExempt(url.pathname)) await serveHoldPage(res);
  else if (url.pathname.startsWith(`${API_ROUTE}/log`))
    await loggerRout(req, res, url);
  else if (url.pathname.startsWith(`${API_ROUTE}/robot`))
    await aiRout(req, res, url);
  // else if (url.pathname.startsWith(`${API_ROUTE}/nagara`))
  //   await nagaraRout(req, res, url);
  else if (await nagaraRout(req, res, url)) return;
  else await serveSiteFiles(req, res);
}
