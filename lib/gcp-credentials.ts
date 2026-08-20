export function getFirestoreCredentials(): { projectId?: string; credentials?: { client_email: string; private_key: string } } {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  const credentials = getCredentialsFromEnv();

  if (!credentials) {
    return { projectId };
  }

  return {
    projectId: projectId || credentials.project_id,
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, "\n")
    }
  };
}

function getCredentialsFromEnv() {
  const json = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  const base64Json = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64?.trim();

  if (json) {
    return parseServiceAccountJson(json, "GOOGLE_APPLICATION_CREDENTIALS_JSON");
  }

  if (base64Json) {
    return parseServiceAccountJson(
      Buffer.from(base64Json, "base64").toString("utf8"),
      "GOOGLE_APPLICATION_CREDENTIALS_BASE64"
    );
  }

  return null;
}

function parseServiceAccountJson(value: string, envName: string) {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${envName} must be valid service-account JSON.`, { cause: error });
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { client_email?: unknown }).client_email !== "string" ||
    typeof (parsed as { private_key?: unknown }).private_key !== "string"
  ) {
    throw new Error(`${envName} is missing client_email or private_key.`);
  }

  return parsed as {
    project_id?: string;
    client_email: string;
    private_key: string;
  };
}
