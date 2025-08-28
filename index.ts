import packageJSON from './package.json' with {type: 'json'};

export const name = packageJSON.name;
export const version = packageJSON.version;
export const description = packageJSON.description;

export {default as WordPressBlogResource} from "./WordPressBlogResource.ts";
export {default as WordPressCDNResource} from "./WordPressCDNResource.ts";