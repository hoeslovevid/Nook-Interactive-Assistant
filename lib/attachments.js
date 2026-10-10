const fs = require('node:fs'), path = require('node:path');
function readAttachment(file) {
  if (typeof file !== 'string' || !path.isAbsolute(file)) throw new Error('Choose a file from this PC.');
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error('Choose a file, not a folder.');
  if (stat.size > 2000000) throw new Error('Choose a file smaller than 2 MB.');
  const bytes = fs.readFileSync(file);
  if (bytes.length > 2000000) throw new Error('Choose a file smaller than 2 MB.');
  const name = path.basename(file).slice(0, 120);
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (png || jpeg) return { name, image: `data:image/${png ? 'png' : 'jpeg'};base64,${bytes.toString('base64')}` };
  if (bytes.includes(0)) throw new Error('Choose a text, source, PNG, or JPEG file.');
  const text = bytes.toString('utf8').slice(0, 60000);
  if (!text.trim()) throw new Error('That file is empty.');
  return { name, text };
}
module.exports = { readAttachment };
