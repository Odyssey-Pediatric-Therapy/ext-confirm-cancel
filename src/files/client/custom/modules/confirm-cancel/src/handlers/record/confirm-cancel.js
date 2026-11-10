// The build tools generate the module ID used by the bundle loader.
export default class ConfirmCancel {
  constructor(view) {
    this.view = view;
    this.pending = false;
  }

  process() {
    const view = this.view;
    // Intercept button clicks only; Escape already has its own confirmation.
    ['cancelEdit', 'cancel'].forEach(action => {
      const method = 'action' + action[0].toUpperCase() + action.slice(1);
      if (typeof view[method] !== 'function') return;

      view.addActionHandler(action, event => {
        event?.preventDefault();
        event?.stopPropagation();
        return this.cancel(method);
      });
    });
  }

  async cancel(method) {
    const view = this.view;
    if (this.pending || view.buttonsDisabled) return;

    // Include edits that have not yet produced a blur/change event.
    view.model.setMultiple(view.fetch());
    const changed = view.hasChanged ? view.hasChanged() : view.isChanged;
    if (!changed) {
      view[method]();
      return;
    }

    this.pending = true;
    try {
      await view.confirm({
        message: view.translate('confirmDiscardChanges', 'messages'),
        confirmText: view.translate('Discard Changes'),
        cancelText: view.translate('Keep Editing'),
        confirmStyle: 'danger',
      });
    } catch {
      return; // Dismissal preserves the form and its unsaved values.
    } finally {
      this.pending = false;
    }

    view[method]();
  }
}
