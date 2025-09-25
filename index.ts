import {TokenRingPackage} from "@tokenring-ai/agent";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description
};
export {default as WordPressBlogProvider} from "./WordPressBlogProvider.ts";
export {default as WordPressCDNProvider} from "./WordPressCDNProvider.ts";