/**
 * Works out which HTTP methods a path would accept
 */
function collect(stack, path, allowed) {
  for (const layer of stack) {
    if (layer.route) {
      if (!layer.match(path)) continue;

      for (const [method, enabled] of Object.entries(layer.route.methods)) {
        if (enabled && method !== '_all') allowed.add(method.toUpperCase());
      }
      continue;
    }

    if (layer.handle?.stack && layer.match(path)) {
      const consumed = layer.path ?? '';
      collect(layer.handle.stack, path.slice(consumed.length) || '/', allowed);
    }
  }
}

function rootStack(app) {
  if (app._router?.stack) return app._router.stack;

  try {
    return app.router?.stack ?? null;
  } catch (_err) {
    return null;
  }
}

export function allowedMethodsFor(app, path) {
  const allowed = new Set();
  const root = rootStack(app);

  if (root) collect(root, path, allowed);

  if (allowed.has('GET')) allowed.add('HEAD');
  if (allowed.size) allowed.add('OPTIONS');

  return [...allowed].sort();
}

export default allowedMethodsFor;
