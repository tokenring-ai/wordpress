import {TokenRingPackage} from "@tokenring-ai/agent";
import packageJSON from './package.json' with {type: 'json'};

export const packageInfo: TokenRingPackage = {
  name: packageJSON.name,
  version: packageJSON.version,
  description: packageJSON.description
};
export {default as WordPressBlogResource} from "./WordPressBlogResource.ts";
export {default as WordPressCDNResource} from "./WordPressCDNResource.ts";