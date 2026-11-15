const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
import { googleRegisterWithAccessToken, googleLogin } from "../services/authApi.js";

let googleScriptPromise;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleScriptPromise) {
    return googleScriptPromise;
  }

  googleScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      `script[src="${GOOGLE_IDENTITY_SCRIPT_SRC}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Unable to load Google Sign-In script.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_IDENTITY_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      googleScriptPromise = undefined;
      reject(new Error("Unable to load Google Sign-In script."));
    };
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

function getClientId() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId?.endsWith(".apps.googleusercontent.com")) {
    throw new Error(
      "Google sign-in is not configured yet."
    );
  }
  return clientId;
}

function requestGoogleAccessToken(clientId) {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }
        resolve(response.access_token);
      },
      error_callback: () => {
        reject(new Error("Google Sign-In was cancelled or failed."));
      },
    });

    tokenClient.requestAccessToken({ prompt: "select_account" });
  });
}

/** Google Sign-In for verified accounts (Login tab). */
export async function signInWithGoogle() {
  const clientId = getClientId();
  await loadGoogleIdentityScript();
  const accessToken = await requestGoogleAccessToken(clientId);
  try {
    const data = await googleLogin({ accessToken });
    return data.requiresOtp ? {type:"otp", ...data} : { type:"login", user:data.user };
  } catch (error) {
    // Account doesn't exist yet — auto-register
    if (error.code === "ACCOUNT_NOT_FOUND") {
      const regData = await googleRegisterWithAccessToken(accessToken);
      if (regData.token) {
        return { type: "login", user: regData.user };
      }
      return { type: "register", ...regData };
    }
    // Account exists but email not verified — route to OTP step
    if (error.code === "EMAIL_NOT_VERIFIED") {
      return {
        type: "otp",
        requiresOtp: true,
        userId: error.data?.userId,
        email: error.data?.email,
      };
    }
    throw error;
  }
}

/** Google Create Account — always requires OTP before login. */
export async function registerWithGoogle() {
  const clientId = getClientId();
  await loadGoogleIdentityScript();

  return googleRegisterWithAccessToken(await requestGoogleAccessToken(clientId));
}
