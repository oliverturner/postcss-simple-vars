/**
 * Returns the value from a nested object via a dot-formatted string
 * e.g. dotAccess({foo: {bar: {baz: 'quux'}}}, 'foo.bar.baz') => 'quux'
 */
function dotAccess (data, str) {
  return str.split('.').reduce(function (ret, key) {
    return ret[key];
  }, data);
}

function definition (variables, node) {
  var name = node.prop.slice(1);

  variables[name] = node.value;
  node.removeSelf();
}

function variable (variables, node, str, name, opts) {
  if (opts.silent) {
    return str;
  }

  if (opts.only) {
    return opts.only[name] || str;
  }

  if (opts.processor) {
    return opts.processor(variables, node, str, name);
  }

  if (typeof name !== 'undefined') {
    var val = dotAccess(variables, name);

    if (typeof val !== 'undefined') {
      return val;
    }
  }

  throw node.error('Undefined variable $' + name);
}

function simpleSyntax (variables, node, str, opts) {
  return str.replace(/(^|[^\w])\$([\w\d-_\.]+)/g, function (_, before, name) {
    return before + variable(variables, node, '$' + name, name, opts);
  });
}

function inStringSyntax (variables, node, str, opts) {
  return str.replace(/\$\(\s*([\w\d-_\.]+)\s*\)/g, function (all, name) {
    return variable(variables, node, all, name, opts);
  });
}

function bothSyntaxes (variables, node, str, opts) {
  str = simpleSyntax(variables, node, str, opts);
  str = inStringSyntax(variables, node, str, opts);
  return str;
}

function getVariables (variables) {
  if (typeof variables === 'object') {
    return Object.keys(variables).reduce(function (ret, key) {
      ret[key] = variables[key];
      return ret;
    }, {});
  }

  return {};
}

function processDecl (node, variables, opts) {
  if (node.prop[0] === '$' && !opts.only) {
    definition(variables, node);
  }
  else if (node.value.indexOf('$') > -1) {
    node.value = bothSyntaxes(variables, node, node.value, opts);
  }
}

function processRule (node, variables, opts) {
  if (node.selector.indexOf('$') > -1) {
    node.selector = bothSyntaxes(variables, node, node.selector, opts);
  }
}

function processAtRule (node, variables, opts) {
  if (node.params && node.params.indexOf('$') > -1) {
    node.params = bothSyntaxes(variables, node, node.params, opts);
  }
}

module.exports = function (opts) {
  var variables;

  opts = opts || {};

  variables = getVariables(opts.variables);

  return function (css) {
    css.eachInside(function (node) {

      switch (node.type) {
        case 'decl':
          processDecl(node, variables, opts);
          break;

        case 'rule':
          processRule(node, variables, opts);
          break;

        case 'atrule':
          processAtRule(node, variables, opts);
          break;
      }
    });
  };
};

module.exports.postcss = function (css) {
  module.exports()(css);
};
