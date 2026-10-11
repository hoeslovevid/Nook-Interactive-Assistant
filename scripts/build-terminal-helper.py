"""Build the dependency-free local VS Code/Cursor terminal extension."""
from pathlib import Path
import zipfile
root = Path(__file__).resolve().parent.parent
manifest = """<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011"><Metadata><Identity Language="en-US" Id="terminal-helper" Version="0.1.0" Publisher="nook"/><DisplayName>Nook Terminal Helper</DisplayName><Description xml:space="preserve">Create terminals Nook can restore precisely.</Description></Metadata><Installation><InstallationTarget Id="Microsoft.VisualStudio.Code"/></Installation><Dependencies/><Assets><Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true"/></Assets></PackageManifest>"""
types = """<?xml version="1.0" encoding="utf-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="json" ContentType="application/json"/><Default Extension="js" ContentType="application/javascript"/><Default Extension="md" ContentType="text/markdown"/><Default Extension="vsixmanifest" ContentType="text/xml"/></Types>"""
with zipfile.ZipFile(root / "assets/terminal-helper.vsix", "w", zipfile.ZIP_DEFLATED) as archive:
    archive.writestr("extension.vsixmanifest", manifest)
    archive.writestr("[Content_Types].xml", types)
    for name in ("package.json", "extension.js", "README.md"):
        archive.write(root / "terminal-helper" / name, "extension/" + name)
print("Bundled terminal-helper VSIX generated.")
