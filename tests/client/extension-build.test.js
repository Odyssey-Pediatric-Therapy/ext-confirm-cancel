import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import test from 'node:test';

test('built bundle registers the handler under the ID advertised by the loader', () => {
  execFileSync(process.execPath, ['build.js', '--extension'], {stdio: 'pipe'});

  const bundleFiles = {};
  const mappings = {};
  const client = JSON.parse(readFileSync(
    'src/files/custom/Espo/Modules/ConfirmCancel/Resources/metadata/app/client.json',
    'utf8',
  ));
  assert.equal(client.scriptList[0], '__APPEND__');
  const startupScripts = client.scriptList.slice(1);
  assert.ok(startupScripts.includes('client/custom/modules/confirm-cancel/lib/init.js'));
  const context = {
    Espo: {loader: {
      mapBundleFile: (id, file) => { bundleFiles[id] = file; },
      addBundleMapping: map => Object.assign(mappings, map),
    }},
  };
  for (const script of startupScripts) {
    const prefix = 'client/custom/modules/confirm-cancel/lib/';
    assert.ok(script.startsWith(prefix));
    runInNewContext(readFileSync(`build/assets/lib/${script.slice(prefix.length)}`, 'utf8'), context);
  }

  const definitions = {};
  runInNewContext(readFileSync('build/assets/lib/module-confirm-cancel.js', 'utf8'), {
    define: (id, dependencies, factory) => {
      assert.equal(typeof id, 'string');
      const exports = {};
      factory(...dependencies.map(dependency => {
        assert.equal(dependency, 'exports');
        return exports;
      }));
      definitions[id] = exports.default;
    },
  });

  const metadata = JSON.parse(readFileSync(
    'src/files/custom/Espo/Modules/ConfirmCancel/Resources/metadata/clientDefs/Global.json',
    'utf8',
  ));
  for (const handlers of Object.values(metadata.viewSetupHandlers)) {
    for (const handler of handlers.filter(id => id !== '__APPEND__')) {
      const id = `modules/${handler.replace(':', '/')}`;
      assert.equal(bundleFiles[mappings[id]],
        'client/custom/modules/confirm-cancel/lib/module-confirm-cancel.js');
      assert.equal(typeof definitions[id], 'function', `${id} must be defined by its bundle`);
      assert.equal(typeof definitions[id].prototype.process, 'function');
    }
  }
});
