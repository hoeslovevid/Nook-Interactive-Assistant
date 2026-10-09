const QUERY = `query {
  viewer {
    login
    starredRepositories { totalCount }
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { contributionCount date } }
      }
    }
    pullRequests(first: 5, states: OPEN, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        title
        url
        number
        repository { nameWithOwner }
        commits(last: 1) {
          nodes { commit { statusCheckRollup { state } } }
        }
      }
    }
    repositories(first: 10, ownerAffiliations: OWNER, orderBy: {field: PUSHED_AT, direction: DESC}) {
      nodes {
        nameWithOwner
        url
        defaultBranchRef {
          name
          target {
            ... on Commit { statusCheckRollup { state } }
          }
        }
      }
    }
  }
  reviews: search(query: "is:pr is:open review-requested:@me", type: ISSUE, first: 5) {
    nodes { ... on PullRequest { title url number } }
  }
}`;

function rollupState(node) {
  const commit = node && node.commits && node.commits.nodes && node.commits.nodes[0] && node.commits.nodes[0].commit;
  const rollup = (commit && commit.statusCheckRollup) || (node && node.defaultBranchRef && node.defaultBranchRef.target && node.defaultBranchRef.target.statusCheckRollup);
  const state = rollup && rollup.state ? String(rollup.state).toLowerCase() : "";
  if (state === "success" || state === "failure" || state === "error" || state === "pending") {
    return state === "error" ? "failure" : state;
  }
  return "";
}

function parseGithub(payload) {
  const data = payload && payload.data ? payload.data : {};
  const viewer = data.viewer || {};
  const weeks = (((viewer.contributionsCollection || {}).contributionCalendar || {}).weeks || [])
    .slice(-23)
    .map((week) => (week.contributionDays || []).map((day) => Number(day.contributionCount) || 0));
  const pulls = (viewer.pullRequests && viewer.pullRequests.nodes ? viewer.pullRequests.nodes : [])
    .filter(Boolean)
    .map((node) => ({
      id: node.url,
      title: node.title || node.repository && node.repository.nameWithOwner,
      url: node.url,
      state: rollupState(node),
      kind: "pr",
    }));
  const reviews = (data.reviews && data.reviews.nodes ? data.reviews.nodes : [])
    .filter(Boolean)
    .map((node) => ({
      id: node.url,
      title: node.title,
      url: node.url,
      state: "",
      kind: "review",
    }));
  const branches = (viewer.repositories && viewer.repositories.nodes ? viewer.repositories.nodes : [])
    .filter(Boolean)
    .map((node) => ({
      id: node.url,
      title: node.nameWithOwner,
      url: node.url,
      state: rollupState(node),
      kind: "branch",
    }));
  return {
    login: viewer.login || "",
    stars: viewer.starredRepositories ? viewer.starredRepositories.totalCount || 0 : 0,
    weeks,
    pulls,
    reviews,
    branches,
  };
}

function ciBadge(before, after) {
  const previous = before && typeof before === "object" ? before : {};
  if (!Object.keys(previous).length) {
    return "";
  }
  const rows = [...((after && after.pulls) || []), ...((after && after.branches) || [])];
  for (const row of rows) {
    const old = previous[row.id];
    if (!old || old === row.state || !row.state) {
      continue;
    }
    if (row.state === "failure") {
      return "red";
    }
    if (row.state === "success") {
      return "green";
    }
  }
  const oldReviews = new Set((before && before.reviewIds) || []);
  if ((after.reviews || []).some((row) => !oldReviews.has(row.id))) {
    return "review";
  }
  return "";
}

function stateMap(github) {
  const states = {};
  for (const row of [...(github.pulls || []), ...(github.branches || [])]) {
    if (row.id) {
      states[row.id] = row.state || "";
    }
  }
  states.reviewIds = (github.reviews || []).map((row) => row.id);
  return states;
}

module.exports = { QUERY, parseGithub, ciBadge, stateMap };
