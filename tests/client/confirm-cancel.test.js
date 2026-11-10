import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

import Handler from '../../src/files/client/custom/modules/confirm-cancel/src/handlers/record/confirm-cancel.js';

function fixture({changed = false, buffered = false, confirm = async () => {}} = {}) {
  const actions = {};
  const state = {changed, confirmCalls: 0, cancellations: 0, fetches: 0, values: {name: 'unsaved'}};
  const view = {
    model: {setMultiple(values) {
      assert.equal(values, state.values);
      if (buffered) state.changed = true;
    }},
    fetch() { state.fetches++; return state.values; },
    hasChanged: () => state.changed,
    translate: key => key,
    async confirm(options) {
      state.confirmCalls++;
      assert.equal(options.message, 'confirmDiscardChanges');
      assert.equal(options.confirmText, 'Discard Changes');
      assert.equal(options.cancelText, 'Keep Editing');
      return confirm();
    },
    actionCancelEdit() { state.cancellations++; state.values = null; },
    actionCancel() { state.cancellations++; state.values = null; },
    addActionHandler: (action, callback) => { actions[action] = callback; },
  };
  new Handler(view).process();
  return {actions, state, view};
}

test('global setup enables confirmation for detail and edit without replacing inherited handlers', () => {
  const metadata = JSON.parse(readFileSync('src/files/custom/Espo/Modules/ConfirmCancel/Resources/metadata/clientDefs/Global.json'));
  for (const type of ['record/detail', 'record/edit']) {
    assert.deepEqual(metadata.viewSetupHandlers[type], ['__APPEND__', 'confirm-cancel:handlers/record/confirm-cancel']);
  }
});

test('unchanged forms cancel immediately', async () => {
  for (const action of ['cancelEdit', 'cancel']) {
    const {actions, state} = fixture();
    await actions[action]();
    assert.equal(state.confirmCalls, 0);
    assert.equal(state.cancellations, 1);
  }
});

test('discard confirmation invokes the existing cancel behavior once', async () => {
  for (const action of ['cancelEdit', 'cancel']) {
    const {actions, state} = fixture({changed: true});
    await actions[action]();
    assert.equal(state.confirmCalls, 1);
    assert.equal(state.cancellations, 1);
  }
});

test('Keep Editing or closing the dialog preserves unsaved values and permits another attempt', async () => {
  const {actions, state} = fixture({changed: true, confirm: async () => { throw new Error('dismissed'); }});
  await actions.cancelEdit();
  await actions.cancelEdit();
  assert.equal(state.confirmCalls, 2);
  assert.equal(state.cancellations, 0);
  assert.deepEqual(state.values, {name: 'unsaved'});
});

test('focused input is fetched before testing for unsaved changes', async () => {
  const {actions, state} = fixture({buffered: true});
  await actions.cancelEdit();
  assert.equal(state.fetches, 1);
  assert.equal(state.confirmCalls, 1);
});

test('repeated clicks show only one confirmation', async () => {
  let finish;
  const waiting = new Promise(resolve => { finish = resolve; });
  const {actions, state} = fixture({changed: true, confirm: () => waiting});
  const first = actions.cancelEdit();
  await actions.cancelEdit();
  assert.equal(state.confirmCalls, 1);
  assert.equal(state.cancellations, 0);
  finish();
  await first;
  assert.equal(state.cancellations, 1);
});

test('keyboard cancel methods retain their existing confirmation path', () => {
  const {state, view} = fixture({changed: true});
  view.actionCancelEdit();
  assert.equal(state.confirmCalls, 0);
  assert.equal(state.cancellations, 1);
});

test('disabled buttons cannot cancel or open a confirmation', async () => {
  const {actions, state, view} = fixture({changed: true});
  view.buttonsDisabled = true;
  await actions.cancelEdit();
  assert.equal(state.confirmCalls, 0);
  assert.equal(state.cancellations, 0);
});
