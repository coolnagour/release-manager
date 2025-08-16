
import "server-only";

import { google } from "googleapis";
import { Auth } from "google-auth-library";

const serviceAccountKey = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.warn("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY is not set. Google Play integration will be disabled.");
}

function getAuthClient(): Auth.GoogleAuth | null {
  if (!serviceAccountKey) {
    return null;
  }
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: serviceAccount.client_email,
        private_key: serviceAccount.private_key,
      },
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
  } catch (error) {
    console.error("Failed to parse GOOGLE_PLAY_SERVICE_ACCOUNT_KEY", error);
    return null;
  }
}

const androidpublisher = google.androidpublisher("v3");

export async function getInternalTrack(packageName: string) {
    const auth = getAuthClient();
    if (!auth) {
        return { error: "Google Play API not configured." };
    }

    try {
        const edits = await androidpublisher.edits.insert({
            packageName,
            auth,
        });

        const editId = edits.data.id;
        if (!editId) {
            return { error: "Failed to create a new edit." };
        }

        const track = await androidpublisher.edits.tracks.get({
            auth,
            packageName,
            editId,
            track: "internal",
        });
console.log(track.data);
        return { data: track.data };
    } catch (error: any) {
        console.error("Failed to get internal track from Google Play:", error);
        if (error.response?.data?.error?.message) {
            return { error: `Google Play API Error: ${error.response.data.error.message}` };
        }
        return { error: "An unknown error occurred while fetching data from Google Play." };
    }
}
