const RUNTIME_PUBLIC_PATH = "server/chunks/ssr/[turbopack]_runtime.js";
const RELATIVE_ROOT_PATH = "..";
const ASSET_PREFIX = "/_next/";
const WORKER_FORWARDED_GLOBALS = ["NEXT_DEPLOYMENT_ID","NEXT_CLIENT_ASSET_SUFFIX"];
// Apply forwarded globals from workerData if running in a worker thread
if (typeof require !== 'undefined') {
    try {
        const { workerData } = require('worker_threads');
        if (workerData?.__turbopack_globals__) {
            Object.assign(globalThis, workerData.__turbopack_globals__);
            // Remove internal data so it's not visible to user code
            delete workerData.__turbopack_globals__;
        }
    } catch (_) {
        // Not in a worker thread context, ignore
    }
}
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
/**
 * Describes why a module was instantiated.
 * Shared between browser and Node.js runtimes.
 */ var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    /**
   * The module was instantiated because it was included in a chunk's hot module
   * update.
   * SourceData is an array of ModuleIds or undefined.
   */ SourceType[SourceType["Update"] = 2] = "Update";
    return SourceType;
}(SourceType || {});
/**
 * Flag indicating which module object type to create when a module is merged. Set to `true`
 * by each runtime that uses ModuleWithDirection (browser dev-base.ts, nodejs dev-base.ts,
 * nodejs build-base.ts). Browser production (build-base.ts) leaves it as `false` since it
 * uses plain Module objects.
 */ let createModuleWithDirectionFlag = false;
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        if (createModuleWithDirectionFlag) {
            // set in development modes for hmr support
            module = createModuleWithDirection(id);
        } else {
            module = createModuleObject(id);
        }
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
function createModuleWithDirection(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined,
        parents: [],
        children: []
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                for (const obj of reexportedObjects){
                    const value = Reflect.get(obj, prop);
                    if (value !== undefined) return value;
                }
                return undefined;
            },
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
function isPromise(maybePromise) {
    return maybePromise != null && typeof maybePromise === 'object' && 'then' in maybePromise && typeof maybePromise.then === 'function';
}
function isAsyncModuleExt(obj) {
    return turbopackQueues in obj;
}
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        reject = rej;
        resolve = res;
    });
    return {
        promise,
        resolve: resolve,
        reject: reject
    };
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Install the factory for each module ID that doesn't already have one.
        // When some IDs in this group already have a factory, reuse that existing
        // group factory for the missing IDs to keep all IDs in the group consistent.
        // Otherwise, install the factory from this chunk.
        const moduleFactoryFn = chunkModules[end];
        let existingGroupFactory = undefined;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            const existingFactory = moduleFactories.get(id);
            if (existingFactory) {
                existingGroupFactory = existingFactory;
                break;
            }
        }
        const factoryToInstall = existingGroupFactory ?? moduleFactoryFn;
        let didInstallFactory = false;
        for(let j = i; j < end; j++){
            const id = chunkModules[j];
            if (!moduleFactories.has(id)) {
                if (!didInstallFactory) {
                    if (factoryToInstall === moduleFactoryFn) {
                        applyModuleFactoryName(moduleFactoryFn);
                    }
                    didInstallFactory = true;
                }
                moduleFactories.set(id, factoryToInstall);
                newModuleId?.(id);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
// everything below is adapted from webpack
// https://github.com/webpack/webpack/blob/6be4065ade1e252c1d8dcba4af0f43e32af1bdc1/lib/runtime/AsyncModuleRuntimeModule.js#L13
const turbopackQueues = Symbol('turbopack queues');
const turbopackExports = Symbol('turbopack exports');
const turbopackError = Symbol('turbopack error');
function resolveQueue(queue) {
    if (queue && queue.status !== 1) {
        queue.status = 1;
        queue.forEach((fn)=>fn.queueCount--);
        queue.forEach((fn)=>fn.queueCount-- ? fn.queueCount++ : fn());
    }
}
function wrapDeps(deps) {
    return deps.map((dep)=>{
        if (dep !== null && typeof dep === 'object') {
            if (isAsyncModuleExt(dep)) return dep;
            if (isPromise(dep)) {
                const queue = Object.assign([], {
                    status: 0
                });
                const obj = {
                    [turbopackExports]: {},
                    [turbopackQueues]: (fn)=>fn(queue)
                };
                dep.then((res)=>{
                    obj[turbopackExports] = res;
                    resolveQueue(queue);
                }, (err)=>{
                    obj[turbopackError] = err;
                    resolveQueue(queue);
                });
                return obj;
            }
        }
        return {
            [turbopackExports]: dep,
            [turbopackQueues]: ()=>{}
        };
    });
}
function asyncModule(body, hasAwait) {
    const module = this.m;
    const queue = hasAwait ? Object.assign([], {
        status: -1
    }) : undefined;
    const depQueues = new Set();
    const { resolve, reject, promise: rawPromise } = createPromise();
    const promise = Object.assign(rawPromise, {
        [turbopackExports]: module.exports,
        [turbopackQueues]: (fn)=>{
            queue && fn(queue);
            depQueues.forEach(fn);
            promise['catch'](()=>{});
        }
    });
    const attributes = {
        get () {
            return promise;
        },
        set (v) {
            // Calling `esmExport` leads to this.
            if (v !== promise) {
                promise[turbopackExports] = v;
            }
        }
    };
    Object.defineProperty(module, 'exports', attributes);
    Object.defineProperty(module, 'namespaceObject', attributes);
    function handleAsyncDependencies(deps) {
        const currentDeps = wrapDeps(deps);
        const getResult = ()=>currentDeps.map((d)=>{
                if (d[turbopackError]) throw d[turbopackError];
                return d[turbopackExports];
            });
        const { promise, resolve } = createPromise();
        const fn = Object.assign(()=>resolve(getResult), {
            queueCount: 0
        });
        function fnQueue(q) {
            if (q !== queue && !depQueues.has(q)) {
                depQueues.add(q);
                if (q && q.status === 0) {
                    fn.queueCount++;
                    q.push(fn);
                }
            }
        }
        currentDeps.map((dep)=>dep[turbopackQueues](fnQueue));
        return fn.queueCount ? promise : getResult();
    }
    function asyncResult(err) {
        if (err) {
            reject(promise[turbopackError] = err);
        } else {
            resolve(promise[turbopackExports]);
        }
        resolveQueue(queue);
    }
    body(handleAsyncDependencies, asyncResult);
    if (queue && queue.status === -1) {
        queue.status = 0;
    }
}
contextPrototype.a = asyncModule;
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * Constructs an error message for when a module factory is not available.
 */ function factoryNotAvailableMessage(moduleId, sourceType, sourceData) {
    let instantiationReason;
    switch(sourceType){
        case 0:
            instantiationReason = `as a runtime entry of chunk ${sourceData}`;
            break;
        case 1:
            instantiationReason = `because it was required from module ${sourceData}`;
            break;
        case 2:
            instantiationReason = 'because of an HMR update';
            break;
        default:
            invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
    }
    return `Module ${moduleId} was instantiated ${instantiationReason}, but the module factory is not available.`;
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime/runtime-utils.ts" />
function readWebAssemblyAsResponse(path) {
    const { createReadStream } = require('fs');
    const { Readable } = require('stream');
    const stream = createReadStream(path);
    // @ts-ignore unfortunately there's a slight type mismatch with the stream.
    return new Response(Readable.toWeb(stream), {
        headers: {
            'content-type': 'application/wasm'
        }
    });
}
async function compileWebAssemblyFromPath(path) {
    const response = readWebAssemblyAsResponse(path);
    return await WebAssembly.compileStreaming(response);
}
async function instantiateWebAssemblyFromPath(path, importsObj) {
    const response = readWebAssemblyAsResponse(path);
    const { instance } = await WebAssembly.instantiateStreaming(response, importsObj);
    return instance.exports;
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../../shared/runtime/runtime-utils.ts" />
/// <reference path="../../shared-node/base-externals-utils.ts" />
/// <reference path="../../shared-node/node-externals-utils.ts" />
/// <reference path="../../shared-node/node-wasm-utils.ts" />
/// <reference path="./nodejs-globals.d.ts" />
/**
 * Base Node.js runtime shared between production and development.
 * Contains chunk loading, module caching, and other non-HMR functionality.
 */ process.env.TURBOPACK = '1';
const url = require('url');
const moduleFactories = new Map();
const moduleCache = Object.create(null);
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
/**
 * Exports a URL value. No suffix is added in Node.js runtime.
 */ function exportUrl(urlValue, id) {
    exportValue.call(this, urlValue, id);
}
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
    loadedChunks.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
function loadWebAssembly(chunkPath, _edgeModule, imports) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return instantiateWebAssemblyFromPath(resolved, imports);
}
contextPrototype.w = loadWebAssembly;
function loadWebAssemblyModule(chunkPath, _edgeModule) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return compileWebAssemblyFromPath(resolved);
}
contextPrototype.u = loadWebAssemblyModule;
/**
 * Creates a Node.js worker thread by instantiating the given WorkerConstructor
 * with the appropriate path and options, including forwarded globals.
 *
 * @param WorkerConstructor The Worker constructor from worker_threads
 * @param workerPath Path to the worker entry chunk
 * @param workerOptions options to pass to the Worker constructor (optional)
 */ function createWorker(WorkerConstructor, workerPath, workerOptions) {
    // Build the forwarded globals object
    const forwardedGlobals = {};
    for (const name of WORKER_FORWARDED_GLOBALS){
        forwardedGlobals[name] = globalThis[name];
    }
    // Merge workerData with forwarded globals
    const existingWorkerData = workerOptions?.workerData || {};
    const options = {
        ...workerOptions,
        workerData: {
            ...typeof existingWorkerData === 'object' ? existingWorkerData : {},
            __turbopack_globals__: forwardedGlobals
        }
    };
    return new WorkerConstructor(workerPath, options);
}
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-base.ts" />
/**
 * Production Node.js runtime.
 * Uses ModuleWithDirection and simple module instantiation without HMR support.
 */ // moduleCache and moduleFactories are declared in runtime-base.ts
// this is read in runtime-utils.ts so it creates a module with direction for hmr
createModuleWithDirectionFlag = true;
const nodeContextPrototype = Context.prototype;
nodeContextPrototype.q = exportUrl;
nodeContextPrototype.M = moduleFactories;
// Cast moduleCache to ModuleWithDirection for production mode
nodeContextPrototype.c = moduleCache;
nodeContextPrototype.R = resolvePathFromModule;
nodeContextPrototype.b = createWorker;
nodeContextPrototype.C = clearChunkCache;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        throw new Error(factoryNotAvailableMessage(id, sourceType, sourceData));
    }
    const module1 = createModuleWithDirection(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    ;
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, SourceType.Parent, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, SourceType.Runtime, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/ssr/[root-of-the-server]__0-j3oyy._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0-j3oyy._.js");
      case "server/chunks/ssr/[root-of-the-server]__0ns6l8x._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0ns6l8x._.js");
      case "server/chunks/ssr/[root-of-the-server]__0nu24gp._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0nu24gp._.js");
      case "server/chunks/ssr/[root-of-the-server]__16tr91m._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__16tr91m._.js");
      case "server/chunks/ssr/[root-of-the-server]__19_ztqi._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__19_ztqi._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_08h5p75._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_08h5p75._.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_0pt47yr.js");
      case "server/chunks/ssr/node_modules_0h91jdk._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_0h91jdk._.js");
      case "server/chunks/ssr/node_modules_1s0gh8q._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_1s0gh8q._.js");
      case "server/chunks/ssr/node_modules_next_dist_0uboya6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_0uboya6._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_0wpq8j3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_0wpq8j3._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_0symwr9.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_0symwr9.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0x.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_0l_sp0x.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_195qwxk.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_195qwxk.js");
      case "server/chunks/ssr/[root-of-the-server]__0zadi2i._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0zadi2i._.js");
      case "server/chunks/ssr/[root-of-the-server]__1it_kdh._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1it_kdh._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_0zi5s8-.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0-o-goa.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_0-o-goa.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06zp_1r.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_06zp_1r.js");
      case "server/chunks/ssr/[root-of-the-server]__0o0923q._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0o0923q._.js");
      case "server/chunks/ssr/_0zuv5tb._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_0zuv5tb._.js");
      case "server/chunks/ssr/_185d2lv._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_185d2lv._.js");
      case "server/chunks/ssr/_1td0-91._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_1td0-91._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_architecture_page_actions_1ix4mqu.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_architecture_page_actions_1ix4mqu.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kxwyrf.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1kxwyrf.js");
      case "server/chunks/ssr/src_1xoih3l._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_1xoih3l._.js");
      case "server/chunks/ssr/src_app_admin_architecture_page_tsx_0tjvpp5._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_architecture_page_tsx_0tjvpp5._.js");
      case "server/chunks/ssr/src_app_admin_layout_tsx_0gttrt6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_layout_tsx_0gttrt6._.js");
      case "server/chunks/ssr/[root-of-the-server]__1iist3c._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1iist3c._.js");
      case "server/chunks/ssr/_0jx1oz-._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_0jx1oz-._.js");
      case "server/chunks/ssr/_0pilf3q._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_0pilf3q._.js");
      case "server/chunks/ssr/_0smni1o._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_0smni1o._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_candidates_[id]_page_actions_1lra0zu.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_candidates_[id]_page_actions_1lra0zu.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16ve-99.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_16ve-99.js");
      case "server/chunks/ssr/src_0z72u7h._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_0z72u7h._.js");
      case "server/chunks/ssr/[root-of-the-server]__07a_0vo._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__07a_0vo._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_candidates_page_actions_1ga76_6.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_candidates_page_actions_1ga76_6.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nj63g1.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nj63g1.js");
      case "server/chunks/ssr/src_app_admin_candidates_page_tsx_1cno472._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_candidates_page_tsx_1cno472._.js");
      case "server/chunks/ssr/[root-of-the-server]__1646s6x._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1646s6x._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_employers_[id]_jobs_[jobId]_page_actions_1unvh6-.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_employers_[id]_jobs_[jobId]_page_actions_1unvh6-.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0sbglbm.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0sbglbm.js");
      case "server/chunks/ssr/src_14v8gm-._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_14v8gm-._.js");
      case "server/chunks/ssr/[root-of-the-server]__0mqx-7h._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0mqx-7h._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_employers_[id]_page_actions_1doy7jj.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_employers_[id]_page_actions_1doy7jj.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_20qekw5.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_20qekw5.js");
      case "server/chunks/ssr/src_app_admin_employers_[id]_page_tsx_01wi8_x._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_employers_[id]_page_tsx_01wi8_x._.js");
      case "server/chunks/ssr/[root-of-the-server]__090q4r7._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__090q4r7._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_employers_page_actions_0flci1g.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_employers_page_actions_0flci1g.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1d3t4nh.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1d3t4nh.js");
      case "server/chunks/ssr/src_app_admin_employers_page_tsx_01mg-a7._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_employers_page_tsx_01mg-a7._.js");
      case "server/chunks/ssr/[root-of-the-server]__03l86cp._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__03l86cp._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_guidelines_page_actions_0w7ym9s.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_guidelines_page_actions_0w7ym9s.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_12s4zyr.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_12s4zyr.js");
      case "server/chunks/ssr/src_app_admin_guidelines_page_tsx_17eq6bu._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_guidelines_page_tsx_17eq6bu._.js");
      case "server/chunks/ssr/[root-of-the-server]__1yf4o9b._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1yf4o9b._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_labeling_page_actions_0kqjtug.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_labeling_page_actions_0kqjtug.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rly94l.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0rly94l.js");
      case "server/chunks/ssr/src_057d9u6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_057d9u6._.js");
      case "server/chunks/ssr/src_app_admin_labeling_page_tsx_1l6q93j._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_labeling_page_tsx_1l6q93j._.js");
      case "server/chunks/ssr/[root-of-the-server]__0l7wkg6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0l7wkg6._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_matches_page_actions_01zozwf.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_matches_page_actions_01zozwf.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1e5xwt8.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1e5xwt8.js");
      case "server/chunks/ssr/src_1mql0f9._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_1mql0f9._.js");
      case "server/chunks/ssr/src_app_admin_matches_loading_tsx_1vsn0re._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_matches_loading_tsx_1vsn0re._.js");
      case "server/chunks/ssr/[root-of-the-server]__04n6c2c._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__04n6c2c._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_monitoring_page_actions_20qhj_i.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_monitoring_page_actions_20qhj_i.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ont3em.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1ont3em.js");
      case "server/chunks/ssr/src_app_admin_monitoring_page_tsx_0cc91_z._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_monitoring_page_tsx_0cc91_z._.js");
      case "server/chunks/ssr/[root-of-the-server]__0yh_53v._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0yh_53v._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_page_actions_1mcickz.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_page_actions_1mcickz.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1pg8eqs.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1pg8eqs.js");
      case "server/chunks/ssr/src_app_admin_page_tsx_0ublbd0._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_page_tsx_0ublbd0._.js");
      case "server/chunks/ssr/[root-of-the-server]__06jylss._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__06jylss._.js");
      case "server/chunks/ssr/[root-of-the-server]__1hgtezu._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1hgtezu._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_preview_employee_page_actions_0s128k1.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_preview_employee_page_actions_0s128k1.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0olqgsa.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0olqgsa.js");
      case "server/chunks/ssr/src_components_1udlf5g._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_1udlf5g._.js");
      case "server/chunks/ssr/src_components_workspace_EmployeeWorkspaceView_tsx_1mg-ixy._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_workspace_EmployeeWorkspaceView_tsx_1mg-ixy._.js");
      case "server/chunks/ssr/[root-of-the-server]__1k32xls._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1k32xls._.js");
      case "server/chunks/ssr/[root-of-the-server]__1quy80m._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1quy80m._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_preview_employer_page_actions_1e1vh1a.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_preview_employer_page_actions_1e1vh1a.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nyob6c.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nyob6c.js");
      case "server/chunks/ssr/src_components_1spq0ux._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_1spq0ux._.js");
      case "server/chunks/ssr/src_components_workspace_EmployerWorkspaceView_tsx_0sre8sa._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_workspace_EmployerWorkspaceView_tsx_0sre8sa._.js");
      case "server/chunks/ssr/[root-of-the-server]__05qnns3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__05qnns3._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_sandbox-report_page_actions_0ywmyl4.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_sandbox-report_page_actions_0ywmyl4.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_20y7tds.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_20y7tds.js");
      case "server/chunks/ssr/src_app_admin_sandbox-report_page_tsx_06q-gxe._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_sandbox-report_page_tsx_06q-gxe._.js");
      case "server/chunks/[root-of-the-server]__01n4y9t._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__01n4y9t._.js");
      case "server/chunks/[root-of-the-server]__06nojyl._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__06nojyl._.js");
      case "server/chunks/[root-of-the-server]__10_vt53._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__10_vt53._.js");
      case "server/chunks/[root-of-the-server]__1blhtzm._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1blhtzm._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/_1_q9mgg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1_q9mgg._.js");
      case "server/chunks/_1id5dbi._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1id5dbi._.js");
      case "server/chunks/_next-internal_server_app_api_admin_ai-usage_route_actions_0mriy-r.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_ai-usage_route_actions_0mriy-r.js");
      case "server/chunks/node_modules_next_10shsn8._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_10shsn8._.js");
      case "server/chunks/node_modules_next_1_14bcs._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_1_14bcs._.js");
      case "server/chunks/src_14f97ke._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_14f97ke._.js");
      case "server/chunks/src_domain_1mkipb8._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_domain_1mkipb8._.js");
      case "server/chunks/[root-of-the-server]__1-hsorb._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1-hsorb._.js");
      case "server/chunks/[root-of-the-server]__196os3p._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__196os3p._.js");
      case "server/chunks/[root-of-the-server]__1eslv_g._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1eslv_g._.js");
      case "server/chunks/[root-of-the-server]__1jzow9w._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1jzow9w._.js");
      case "server/chunks/[root-of-the-server]__1upo_bn._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1upo_bn._.js");
      case "server/chunks/_07tpnpn._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_07tpnpn._.js");
      case "server/chunks/_0_7wpf_._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0_7wpf_._.js");
      case "server/chunks/_1bzs8mv._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1bzs8mv._.js");
      case "server/chunks/_1qwd23s._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1qwd23s._.js");
      case "server/chunks/_next-internal_server_app_api_admin_architecture_route_actions_1lym_n_.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_architecture_route_actions_1lym_n_.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_0r-jlng._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_0r-jlng._.js");
      case "server/chunks/src_1zlv6no._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1zlv6no._.js");
      case "server/chunks/src_domain_0-alg1j._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_domain_0-alg1j._.js");
      case "server/chunks/src_infrastructure_db_0oxu91o._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_db_0oxu91o._.js");
      case "server/chunks/[root-of-the-server]__1ojx2cj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1ojx2cj._.js");
      case "server/chunks/[root-of-the-server]__1ufof1u._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1ufof1u._.js");
      case "server/chunks/_next-internal_server_app_api_admin_backfill-canonical_route_actions_0zal3zq.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_backfill-canonical_route_actions_0zal3zq.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_token_1o4m7ms.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_token_1o4m7ms.js");
      case "server/chunks/src_1_8b4-n._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1_8b4-n._.js");
      case "server/chunks/src_domain_1l2v6cj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_domain_1l2v6cj._.js");
      case "server/chunks/1oeh_server_app_api_admin_candidates_[id]_cv_[documentId]_route_actions_0ahyn5k.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/1oeh_server_app_api_admin_candidates_[id]_cv_[documentId]_route_actions_0ahyn5k.js");
      case "server/chunks/[root-of-the-server]__1h_invj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1h_invj._.js");
      case "server/chunks/[root-of-the-server]__1md_oc-._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1md_oc-._.js");
      case "server/chunks/_0fixsxa._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0fixsxa._.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_0e5alj_._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_0e5alj_._.js");
      case "server/chunks/src_0o12nvj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0o12nvj._.js");
      case "server/chunks/src_domain_08kxp30._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_domain_08kxp30._.js");
      case "server/chunks/[root-of-the-server]__0w626s2._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0w626s2._.js");
      case "server/chunks/_0by8x5r._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0by8x5r._.js");
      case "server/chunks/_1sx56ku._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1sx56ku._.js");
      case "server/chunks/_1u3g1-b._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1u3g1-b._.js");
      case "server/chunks/_next-internal_server_app_api_admin_candidates_[id]_route_actions_1yfuf-1.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_candidates_[id]_route_actions_1yfuf-1.js");
      case "server/chunks/src_domain_18xs3-u._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_domain_18xs3-u._.js");
      case "server/chunks/_058rce1._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_058rce1._.js");
      case "server/chunks/_0mifzwj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0mifzwj._.js");
      case "server/chunks/_0qjxo8h._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0qjxo8h._.js");
      case "server/chunks/_next-internal_server_app_api_admin_candidates_route_actions_182dux5.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_candidates_route_actions_182dux5.js");
      case "server/chunks/[root-of-the-server]__0ovdq2x._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0ovdq2x._.js");
      case "server/chunks/_next-internal_server_app_api_admin_data-scope_route_actions_20ra17i.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_data-scope_route_actions_20ra17i.js");
      case "server/chunks/1oeh_server_app_api_admin_employers_[id]_jobs_[jobId]_route_actions_1to3_wk.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/1oeh_server_app_api_admin_employers_[id]_jobs_[jobId]_route_actions_1to3_wk.js");
      case "server/chunks/_0pfpx9l._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0pfpx9l._.js");
      case "server/chunks/_19awax-._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_19awax-._.js");
      case "server/chunks/_1pkq17l._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1pkq17l._.js");
      case "server/chunks/_09f2t36._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_09f2t36._.js");
      case "server/chunks/_0i3ylf8._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0i3ylf8._.js");
      case "server/chunks/_0ut6k9h._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0ut6k9h._.js");
      case "server/chunks/_next-internal_server_app_api_admin_employers_[id]_route_actions_028nfm8.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_employers_[id]_route_actions_028nfm8.js");
      case "server/chunks/[root-of-the-server]__1irlqy6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1irlqy6._.js");
      case "server/chunks/_next-internal_server_app_api_admin_employers_[id]_verify_route_actions_0opgjrq.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_employers_[id]_verify_route_actions_0opgjrq.js");
      case "server/chunks/_04z64ea._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_04z64ea._.js");
      case "server/chunks/_0gdzt7y._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0gdzt7y._.js");
      case "server/chunks/_0rb76dg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0rb76dg._.js");
      case "server/chunks/_next-internal_server_app_api_admin_employers_route_actions_1l0nb2u.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_employers_route_actions_1l0nb2u.js");
      case "server/chunks/[root-of-the-server]__0px3-0_._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0px3-0_._.js");
      case "server/chunks/[root-of-the-server]__1jk4psi._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1jk4psi._.js");
      case "server/chunks/_1m6roli._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1m6roli._.js");
      case "server/chunks/_next-internal_server_app_api_admin_labeling_route_actions_17tuy5e.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_labeling_route_actions_17tuy5e.js");
      case "server/chunks/src_0cm2ydq._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0cm2ydq._.js");
      case "server/chunks/[root-of-the-server]__1r3evms._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1r3evms._.js");
      case "server/chunks/_next-internal_server_app_api_admin_match-explain_route_actions_1dukbo_.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_match-explain_route_actions_1dukbo_.js");
      case "server/chunks/src_application_rebuild-matches_ts_08w-99y._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_application_rebuild-matches_ts_08w-99y._.js");
      case "server/chunks/[root-of-the-server]__1ygp5rb._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1ygp5rb._.js");
      case "server/chunks/_next-internal_server_app_api_admin_match-pickers_route_actions_0lw8p_z.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_match-pickers_route_actions_0lw8p_z.js");
      case "server/chunks/src_infrastructure_db_1nght65._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_db_1nght65._.js");
      case "server/chunks/[root-of-the-server]__1_7g0li._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1_7g0li._.js");
      case "server/chunks/_next-internal_server_app_api_admin_matches_route_actions_0zk3sms.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_matches_route_actions_0zk3sms.js");
      case "server/chunks/[root-of-the-server]__0dd8jt3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0dd8jt3._.js");
      case "server/chunks/_next-internal_server_app_api_admin_monitoring_route_actions_0gt032o.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_monitoring_route_actions_0gt032o.js");
      case "server/chunks/[root-of-the-server]__08klmfu._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__08klmfu._.js");
      case "server/chunks/[root-of-the-server]__0il48io._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0il48io._.js");
      case "server/chunks/_0laasok._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0laasok._.js");
      case "server/chunks/_next-internal_server_app_api_admin_preview_route_actions_0696g3s.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_preview_route_actions_0696g3s.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_1a4bsiy._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_1a4bsiy._.js");
      case "server/chunks/[root-of-the-server]__0g_ezl5._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0g_ezl5._.js");
      case "server/chunks/[root-of-the-server]__0z1u5oj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0z1u5oj._.js");
      case "server/chunks/[root-of-the-server]__1-ggql3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1-ggql3._.js");
      case "server/chunks/[root-of-the-server]__1k7msh2._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1k7msh2._.js");
      case "server/chunks/[root-of-the-server]__1rpvp5g._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1rpvp5g._.js");
      case "server/chunks/_05-hm8w._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_05-hm8w._.js");
      case "server/chunks/_0qcu31g._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0qcu31g._.js");
      case "server/chunks/_next-internal_server_app_api_admin_prompt-catalog_route_actions_0j2z4o-.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_prompt-catalog_route_actions_0j2z4o-.js");
      case "server/chunks/[root-of-the-server]__1i64ii8._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1i64ii8._.js");
      case "server/chunks/_0a_9l-u._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0a_9l-u._.js");
      case "server/chunks/_1a3le4v._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1a3le4v._.js");
      case "server/chunks/_next-internal_server_app_api_admin_prompts_route_actions_0mgj1wm.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_prompts_route_actions_0mgj1wm.js");
      case "server/chunks/[root-of-the-server]__06zc_ij._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__06zc_ij._.js");
      case "server/chunks/[root-of-the-server]__1ww-956._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1ww-956._.js");
      case "server/chunks/_0a2y-ty._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0a2y-ty._.js");
      case "server/chunks/_next-internal_server_app_api_admin_sandbox-run-report_route_actions_0_r_c0-.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_sandbox-run-report_route_actions_0_r_c0-.js");
      case "server/chunks/[root-of-the-server]__0tzjypn._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0tzjypn._.js");
      case "server/chunks/_next-internal_server_app_api_admin_seed-demo_route_actions_04n_x_b.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_seed-demo_route_actions_04n_x_b.js");
      case "server/chunks/[root-of-the-server]__0cqr49d._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0cqr49d._.js");
      case "server/chunks/[root-of-the-server]__16pbbmy._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__16pbbmy._.js");
      case "server/chunks/[root-of-the-server]__1t2sof3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1t2sof3._.js");
      case "server/chunks/_1sxodoh._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1sxodoh._.js");
      case "server/chunks/_next-internal_server_app_api_admin_stats_route_actions_01pa690.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_admin_stats_route_actions_01pa690.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_1u0thmk._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_1u0thmk._.js");
      case "server/chunks/[root-of-the-server]__1pginj3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1pginj3._.js");
      case "server/chunks/_next-internal_server_app_api_auth_[___nextauth]_route_actions_08nexdk.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_auth_[___nextauth]_route_actions_08nexdk.js");
      case "server/chunks/node_modules_next_0opixfu._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_0opixfu._.js");
      case "server/chunks/node_modules_next_dist_esm_build_templates_app-route_1n2ls1f.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_esm_build_templates_app-route_1n2ls1f.js");
      case "server/chunks/[root-of-the-server]__1esubn1._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1esubn1._.js");
      case "server/chunks/_1f_1oj3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1f_1oj3._.js");
      case "server/chunks/_next-internal_server_app_api_candidates_route_actions_0gyollc.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_candidates_route_actions_0gyollc.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_00da1ig._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_00da1ig._.js");
      case "server/chunks/[root-of-the-server]__0cit1hg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0cit1hg._.js");
      case "server/chunks/_0z4n7yr._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0z4n7yr._.js");
      case "server/chunks/_next-internal_server_app_api_chat_reset_route_actions_1ky3347.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_chat_reset_route_actions_1ky3347.js");
      case "server/chunks/src_025v4u7._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_025v4u7._.js");
      case "server/chunks/src_02x37x9._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_02x37x9._.js");
      case "server/chunks/src_0h8p27j._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0h8p27j._.js");
      case "server/chunks/src_1n3gmy5._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1n3gmy5._.js");
      case "server/chunks/src_infrastructure_19-qrwj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_19-qrwj._.js");
      case "server/chunks/[root-of-the-server]__17-51pb._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__17-51pb._.js");
      case "server/chunks/_1mz9br7._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1mz9br7._.js");
      case "server/chunks/_next-internal_server_app_api_chat_route_actions_1d_pld-.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_chat_route_actions_1d_pld-.js");
      case "server/chunks/src_application_match-label-feedback_ts_1k10wjg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_application_match-label-feedback_ts_1k10wjg._.js");
      case "server/chunks/src_infrastructure_request-limits_ts_0ygwn_1._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_request-limits_ts_0ygwn_1._.js");
      case "server/chunks/src_infrastructure_user-rate-limit_ts_13saktl._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_user-rate-limit_ts_13saktl._.js");
      case "server/chunks/[root-of-the-server]__132nnml._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__132nnml._.js");
      case "server/chunks/[root-of-the-server]__1aihwpn._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1aihwpn._.js");
      case "server/chunks/_next-internal_server_app_api_cron_recover-degraded_route_actions_1u1_alt.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_cron_recover-degraded_route_actions_1u1_alt.js");
      case "server/chunks/src_0tdghf6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0tdghf6._.js");
      case "server/chunks/src_1_brhvp._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1_brhvp._.js");
      case "server/chunks/src_1mfidul._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1mfidul._.js");
      case "server/chunks/src_1zf5de2._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1zf5de2._.js");
      case "server/chunks/[root-of-the-server]__0ftosof._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0ftosof._.js");
      case "server/chunks/_1krcfom._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1krcfom._.js");
      case "server/chunks/_next-internal_server_app_api_cv_analyze_route_actions_0e3wyxn.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_cv_analyze_route_actions_0e3wyxn.js");
      case "server/chunks/[root-of-the-server]__0-5o0vh._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0-5o0vh._.js");
      case "server/chunks/_next-internal_server_app_api_cv_document_route_actions_0nf-gxf.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_cv_document_route_actions_0nf-gxf.js");
      case "server/chunks/src_1u9_1_c._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1u9_1_c._.js");
      case "server/chunks/_0dlbpeu._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0dlbpeu._.js");
      case "server/chunks/_next-internal_server_app_api_cv_route_actions_08yf-66.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_cv_route_actions_08yf-66.js");
      case "server/chunks/src_0cpx8dj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0cpx8dj._.js");
      case "server/chunks/src_infrastructure_cf-build-stubs_mammoth_ts_11ku4ae._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_cf-build-stubs_mammoth_ts_11ku4ae._.js");
      case "server/chunks/src_infrastructure_cf-build-stubs_unpdf_ts_1oboi_9._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_infrastructure_cf-build-stubs_unpdf_ts_1oboi_9._.js");
      case "server/chunks/[root-of-the-server]__1a_4oul._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1a_4oul._.js");
      case "server/chunks/_052y-zo._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_052y-zo._.js");
      case "server/chunks/_next-internal_server_app_api_dev_login_route_actions_1v6s21s.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_dev_login_route_actions_1v6s21s.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_1ytnxc2._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_1ytnxc2._.js");
      case "server/chunks/[root-of-the-server]__05vmv_5._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__05vmv_5._.js");
      case "server/chunks/_next-internal_server_app_api_e2e_admin-session_route_actions_1gcycuk.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_e2e_admin-session_route_actions_1gcycuk.js");
      case "server/chunks/_1egyeow._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1egyeow._.js");
      case "server/chunks/_next-internal_server_app_api_e2e_bootstrap_route_actions_10pd1e6.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_e2e_bootstrap_route_actions_10pd1e6.js");
      case "server/chunks/src_1znk_ji._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_1znk_ji._.js");
      case "server/chunks/[root-of-the-server]__03mmnmp._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__03mmnmp._.js");
      case "server/chunks/_next-internal_server_app_api_e2e_report_route_actions_0h7rkjv.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_e2e_report_route_actions_0h7rkjv.js");
      case "server/chunks/[root-of-the-server]__0f3vdn3._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0f3vdn3._.js");
      case "server/chunks/_next-internal_server_app_api_e2e_session_route_actions_1u0575l.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_e2e_session_route_actions_1u0575l.js");
      case "server/chunks/[root-of-the-server]__0e60h17._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0e60h17._.js");
      case "server/chunks/_05itl7s._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_05itl7s._.js");
      case "server/chunks/_0akq3u6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0akq3u6._.js");
      case "server/chunks/_0miw49g._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0miw49g._.js");
      case "server/chunks/_next-internal_server_app_api_employee_profiles_route_actions_0q7_ndd.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_employee_profiles_route_actions_0q7_ndd.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_1olgpf0._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_1olgpf0._.js");
      case "server/chunks/[root-of-the-server]__0r4rget._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0r4rget._.js");
      case "server/chunks/[root-of-the-server]__1argmvg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1argmvg._.js");
      case "server/chunks/_next-internal_server_app_api_employer_action_route_actions_1ig2-zs.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_employer_action_route_actions_1ig2-zs.js");
      case "server/chunks/src_00j231r._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_00j231r._.js");
      case "server/chunks/[root-of-the-server]__16j6my0._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__16j6my0._.js");
      case "server/chunks/_0-cl_-t._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0-cl_-t._.js");
      case "server/chunks/_0tk_t8s._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0tk_t8s._.js");
      case "server/chunks/_next-internal_server_app_api_employer_jobs_route_actions_1eyoc7r.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_employer_jobs_route_actions_1eyoc7r.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_0p2s2km._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_0p2s2km._.js");
      case "server/chunks/[root-of-the-server]__11bkuit._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__11bkuit._.js");
      case "server/chunks/_next-internal_server_app_api_events_client_route_actions_1dv2a9t.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_events_client_route_actions_1dv2a9t.js");
      case "server/chunks/[root-of-the-server]__1y0s-7e._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1y0s-7e._.js");
      case "server/chunks/_next-internal_server_app_api_flexibility_route_actions_1cyeu-6.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_flexibility_route_actions_1cyeu-6.js");
      case "server/chunks/[root-of-the-server]__15fi7j_._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__15fi7j_._.js");
      case "server/chunks/_next-internal_server_app_api_health_ai_route_actions_1lr7d11.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_health_ai_route_actions_1lr7d11.js");
      case "server/chunks/[root-of-the-server]__0kas5av._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0kas5av._.js");
      case "server/chunks/_next-internal_server_app_api_health_auth_route_actions_0rfd1qz.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_health_auth_route_actions_0rfd1qz.js");
      case "server/chunks/[root-of-the-server]__19c404c._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__19c404c._.js");
      case "server/chunks/_next-internal_server_app_api_health_db_route_actions_1agb6nk.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_health_db_route_actions_1agb6nk.js");
      case "server/chunks/_1ggm0lj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_1ggm0lj._.js");
      case "server/chunks/_next-internal_server_app_api_job-import_route_actions_0023xga.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_job-import_route_actions_0023xga.js");
      case "server/chunks/src_0l-em4f._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/src_0l-em4f._.js");
      case "server/chunks/[root-of-the-server]__0ij9yor._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__0ij9yor._.js");
      case "server/chunks/[root-of-the-server]__1fy_-fh._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1fy_-fh._.js");
      case "server/chunks/_next-internal_server_app_api_match-feedback_route_actions_1oqzes3.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_match-feedback_route_actions_1oqzes3.js");
      case "server/chunks/[root-of-the-server]__1og9duw._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1og9duw._.js");
      case "server/chunks/_next-internal_server_app_api_me_delete-data_route_actions_10_brhe.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_me_delete-data_route_actions_10_brhe.js");
      case "server/chunks/[root-of-the-server]__1vowh4n._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1vowh4n._.js");
      case "server/chunks/_0rnxe0n._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_0rnxe0n._.js");
      case "server/chunks/_next-internal_server_app_api_me_route_actions_0j009u9.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_me_route_actions_0j009u9.js");
      case "server/chunks/[root-of-the-server]__056x_7c._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__056x_7c._.js");
      case "server/chunks/_17tnwa-._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_17tnwa-._.js");
      case "server/chunks/_next-internal_server_app_api_opportunities_route_actions_18h4_mw.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_opportunities_route_actions_18h4_mw.js");
      case "server/chunks/node_modules_@vercel_oidc_dist_1deliat._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_@vercel_oidc_dist_1deliat._.js");
      case "server/chunks/[root-of-the-server]__17w9z5y._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__17w9z5y._.js");
      case "server/chunks/_next-internal_server_app_api_session_route_actions_0eknud3.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_session_route_actions_0eknud3.js");
      case "server/chunks/[root-of-the-server]__1w3-i3q._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1w3-i3q._.js");
      case "server/chunks/_next-internal_server_app_apple-icon_png_route_actions_0jcl8au.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_apple-icon_png_route_actions_0jcl8au.js");
      case "server/chunks/node_modules_next_dist_esm_build_templates_app-route_144wghl.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_esm_build_templates_app-route_144wghl.js");
      case "server/chunks/ssr/[root-of-the-server]__0e_9_kj._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0e_9_kj._.js");
      case "server/chunks/ssr/_1xp-y22._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_1xp-y22._.js");
      case "server/chunks/ssr/_next-internal_server_app_demo_page_actions_02rhwpz.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_demo_page_actions_02rhwpz.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0zy_yk1.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0zy_yk1.js");
      case "server/chunks/ssr/[root-of-the-server]__0g00u8s._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0g00u8s._.js");
      case "server/chunks/ssr/[root-of-the-server]__1eztqh8._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1eztqh8._.js");
      case "server/chunks/ssr/_next-internal_server_app_employee_page_actions_1zz6w7d.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_employee_page_actions_1zz6w7d.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0yepwbv.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0yepwbv.js");
      case "server/chunks/ssr/[root-of-the-server]__1eoh15d._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1eoh15d._.js");
      case "server/chunks/ssr/[root-of-the-server]__1kyhqil._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1kyhqil._.js");
      case "server/chunks/ssr/_next-internal_server_app_employer_page_actions_05xbw-2.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_employer_page_actions_05xbw-2.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0mq5m7_.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0mq5m7_.js");
      case "server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_favicon_ico_route_actions_0g2jjls.js");
      case "server/chunks/node_modules_next_dist_esm_build_templates_app-route_12f2k_b.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_esm_build_templates_app-route_12f2k_b.js");
      case "server/chunks/ssr/[root-of-the-server]__0gcbb94._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0gcbb94._.js");
      case "server/chunks/ssr/_07418zg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_07418zg._.js");
      case "server/chunks/ssr/_1199jyg._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_1199jyg._.js");
      case "server/chunks/ssr/_next-internal_server_app_for-employers_page_actions_1dlxo19.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_for-employers_page_actions_1dlxo19.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04pva3p.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_04pva3p.js");
      case "server/chunks/_next-internal_server_app_icon_png_route_actions_1-lsc8h.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_icon_png_route_actions_1-lsc8h.js");
      case "server/chunks/node_modules_next_dist_esm_build_templates_app-route_0nojrj_.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_esm_build_templates_app-route_0nojrj_.js");
      case "server/chunks/ssr/[root-of-the-server]__1uems_t._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__1uems_t._.js");
      case "server/chunks/ssr/_next-internal_server_app_legal_about_page_actions_1264a8j.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_legal_about_page_actions_1264a8j.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_00t9bsf.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_00t9bsf.js");
      case "server/chunks/ssr/src_0mwgdlp._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_0mwgdlp._.js");
      case "server/chunks/ssr/[root-of-the-server]__0kb2zix._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0kb2zix._.js");
      case "server/chunks/ssr/_next-internal_server_app_legal_privacy_page_actions_0qw4xn5.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_legal_privacy_page_actions_0qw4xn5.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nmjvpc.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0nmjvpc.js");
      case "server/chunks/ssr/src_0a2v-v7._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_0a2v-v7._.js");
      case "server/chunks/ssr/[root-of-the-server]__0gcb_14._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0gcb_14._.js");
      case "server/chunks/ssr/_next-internal_server_app_legal_terms_page_actions_0e3xgu7.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_legal_terms_page_actions_0e3xgu7.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1env0aj.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_1env0aj.js");
      case "server/chunks/ssr/src_06xsdj6._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/src_06xsdj6._.js");
      case "server/chunks/ssr/[root-of-the-server]__05p2h1h._.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__05p2h1h._.js");
      case "server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_page_actions_0hhsz1j.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0_myk7t.js": return require("/workspace/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_0_myk7t.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }
