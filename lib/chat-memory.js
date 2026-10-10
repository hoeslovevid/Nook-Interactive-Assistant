// Each provider keeps its own bounded conversation; active reply objects retain identity.
function recentMessages(messages, limit = 24) {
  const counts = new Map();
  return messages.toReversed().filter(message => {
    const count = (counts.get(message.provider) || 0) + 1;
    counts.set(message.provider, count);
    return count <= limit;
  }).reverse();
}
module.exports = { recentMessages };
