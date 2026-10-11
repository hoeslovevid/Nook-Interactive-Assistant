# Nook Terminal Helper

Install the bundled VSIX in VS Code or Cursor, then run **Nook: Create linked terminal** from the Command Palette. Start your coding agent in that terminal. Nook's **Open terminal** restores the linked terminal tab.

The helper only reveals a terminal created by this command. It never sends text, runs commands, or reads terminal output. Its local named pipe requires a unique 256-bit token and closes with the terminal. Normal terminals keep Nook's window/folder fallback.
