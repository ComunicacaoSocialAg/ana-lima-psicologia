import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";
import { app } from "./firebase";
if (app && import.meta.env.VITE_APP_CHECK_SITE_KEY)
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(
      import.meta.env.VITE_APP_CHECK_SITE_KEY,
    ),
    isTokenAutoRefreshEnabled: true,
  });
const functions = app ? getFunctions(app, "southamerica-east1") : null;
if (
  functions &&
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_EMULATORS === "true"
)
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
export async function callBackend<T = unknown>(
  name: string,
  data: unknown,
): Promise<T> {
  if (!app) throw Error("Serviço indisponível.");
  return (await httpsCallable<unknown, T>(functions!, name)(data)).data;
}
