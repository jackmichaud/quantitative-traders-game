const nodeMajorVersion = Number.parseInt(process.versions.node.split(".")[0], 10);
if (nodeMajorVersion < 22) {
  console.error(
    `Node 22 or newer is required (currently running ${process.version}). Run \`nvm use 22\` and try again.`
  );
  process.exit(1);
}

const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const args = process.argv.slice(2);
const [identifier, action = "grant"] = args;
const validActions = new Set(["grant", "revoke"]);
const projectFlagIndex = args.indexOf("--project");
const projectId = projectFlagIndex >= 0 ? args[projectFlagIndex + 1] : undefined;

if (!identifier || !validActions.has(action) || (projectFlagIndex >= 0 && !projectId)) {
  console.error(
    "Usage: npm run admin:set -- <email-or-uid> [grant|revoke] [--project <project-id>]"
  );
  process.exitCode = 1;
} else {
  initializeApp({
    credential: applicationDefault(),
    ...(projectId ? { projectId } : {}),
  });

  updateAdminClaim(identifier, action === "grant").catch((error) => {
    const message = error?.message || String(error);
    console.error("Unable to update admin claim:", message);
    if (/application default|user-creds|quota project|adc-troubleshooting/i.test(message)) {
      console.error("Configure local Google credentials, then retry:");
      console.error("  gcloud auth application-default login");
      console.error(
        `  gcloud auth application-default set-quota-project ${projectId || "<project-id>"}`
      );
    }
    process.exitCode = 1;
  });
}

async function updateAdminClaim(userIdentifier, shouldBeAdmin) {
  const auth = getAuth();
  const user = userIdentifier.includes("@")
    ? await auth.getUserByEmail(userIdentifier)
    : await auth.getUser(userIdentifier);

  const claims = { ...(user.customClaims || {}) };
  if (shouldBeAdmin) {
    claims.admin = true;
  } else {
    delete claims.admin;
  }

  await auth.setCustomUserClaims(user.uid, claims);

  const actionLabel = shouldBeAdmin ? "Granted" : "Revoked";
  console.log(`${actionLabel} admin access for ${user.email || user.uid}.`);
  console.log("The user must sign out and sign back in for the change to appear immediately.");
}
