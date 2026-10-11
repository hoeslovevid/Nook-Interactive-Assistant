for (const [id, action] of [['terminal-helper', 'helper'], ['linked-wt', 'linked-wt']]) {
  document.querySelector('#' + id).addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    const button=event.currentTarget;
    try {
      const result = await window.nook.terminalSetup(action);
      document.querySelector('#terminal-setup-status').textContent = result.error || (result.cancelled ? '' : action === 'helper' ? 'Install terminal-helper.vsix through your editor’s Extensions menu.' : 'Start your coding agent in the linked terminal tab.');
    } catch { document.querySelector('#terminal-setup-status').textContent='Could not open that terminal.'; }
    finally { button.disabled = false; }
  });
}
