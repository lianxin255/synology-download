export {
  i18n,
  useI18n,
  getManifest,
  injectContentScripts,
  getAcceptLanguages,
  localClear,
  localGet,
  localSet,
  syncClear,
  syncGet,
  syncSet,
  getActiveTab,
  elapsedTime,
  isMacOs,
  ProxyLogger,
  nullSafeCompare,
  numberCompare,
  stringCompare,
  parseJSON,
  versionCheck,
  HttpMethod,
  rxFetch,
} from '@dvcol/web-extension-utils';

export type {
  ChromeResponse,
  ChromeMessage,
  Manifest,
  ChromeMessageHandler,
  BeforeOperator,
  BufferDebounceUnless,
  SkipUntilRepeat,
  BaseHttpRequest,
  HttpBody,
  HttpParameters,
  HttpHeaders,
} from '@dvcol/web-extension-utils';