// Learn more https://docs.expo.io/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('glb', 'gltf', 'mtl', 'obj');

// three ships two builds (`import` -> three.module.js, `require` -> three.cjs). Metro resolves
// each consumer with its own condition, so both builds end up in the bundle and three warns
// "Multiple instances of Three.js being imported". Resolve every bare `three` import to the
// same file so only one copy is bundled.
const THREE_ENTRY = path.join(__dirname, 'node_modules/three/build/three.module.js');
const upstreamResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'three') {
    return { type: 'sourceFile', filePath: THREE_ENTRY };
  }

  return (upstreamResolveRequest || context.resolveRequest)(context, moduleName, platform);
};

// Fix for Android platform redirect issue
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    
    // If no platform is specified, try to detect it from user-agent
    if (!url.searchParams.has('platform') && !req.headers['expo-platform']) {
      const userAgent = req.headers['user-agent'] || '';
      if (userAgent.includes('Android') || userAgent.includes('Linux')) {
        url.searchParams.set('platform', 'android');
        req.url = url.pathname + url.search;
      }
    }
    
    middleware(req, res, next);
  };
};

module.exports = config;
    